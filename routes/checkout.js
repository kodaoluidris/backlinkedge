const express = require('express');
const router = express.Router();

const { stripe, isConfigured } = require('../config/stripe');
const { getPlan, CURRENCY } = require('../config/plans');
const dbApi = require('../db');

// POST /checkout/:planId  → create a Stripe Checkout (subscription) session
router.post('/:planId', async (req, res) => {
  const plan = getPlan(req.params.planId);
  if (!plan) return res.status(404).render('message', {
    title: 'Plan not found',
    heading: 'Plan not found',
    body: 'That plan does not exist. Please pick a plan from the pricing section.',
    cta: { href: '/#pricing', label: 'Back to pricing' }
  });

  if (!isConfigured) {
    return res.status(503).render('message', {
      title: 'Payments not configured',
      heading: 'Payments aren’t live yet',
      body: 'Stripe test keys haven’t been added to the .env file yet. Add your STRIPE_SECRET_KEY to enable checkout.',
      cta: { href: '/#pricing', label: 'Back to pricing' }
    });
  }

  const base = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  const email = (req.body.email || '').trim() || undefined;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: CURRENCY,
          unit_amount: plan.amount,
          recurring: { interval: 'month' },
          product_data: {
            name: `${plan.name} Plan`,
            description: plan.desc
          }
        }
      }],
      // Carry our plan id through to the webhook for clean reporting
      metadata: { plan_id: plan.id, plan_name: plan.name },
      subscription_data: { metadata: { plan_id: plan.id, plan_name: plan.name } },
      success_url: `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/checkout/cancel`
    });

    return res.redirect(303, session.url);
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    return res.status(500).render('message', {
      title: 'Checkout error',
      heading: 'Something went wrong',
      body: 'We couldn’t start the checkout session. Please try again in a moment.',
      cta: { href: '/#pricing', label: 'Back to pricing' }
    });
  }
});

// Best-effort: record the customer, subscription, and first payment straight from
// the completed Checkout session. This makes payments show up in the admin panel
// immediately, even before webhooks are wired up. It's idempotent — the webhook
// (when configured) writes the same rows keyed by invoice id, so no duplicates.
async function recordFromSession(session) {
  try {
    const meta = session.metadata || {};
    const details = session.customer_details || {};
    const cust = session.customer;
    const custId = typeof cust === 'string' ? cust : (cust && cust.id);

    if (custId) {
      await dbApi.upsertCustomer({
        stripeCustomerId: custId,
        email: details.email,
        name: details.name
      });
    }

    const sub = session.subscription;
    if (sub && typeof sub === 'object') {
      await dbApi.upsertSubscription({
        stripeSubscriptionId: sub.id,
        stripeCustomerId: custId,
        email: details.email,
        planId: meta.plan_id,
        planName: meta.plan_name,
        amount: session.amount_total,
        currency: session.currency,
        status: sub.status || 'active',
        currentPeriodEnd: sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null
      });
    }

    const inv = session.invoice;
    const invId = typeof inv === 'string' ? inv : (inv && inv.id);
    await dbApi.recordTransaction({
      stripeInvoiceId: invId || session.id, // session id as a stable fallback key
      stripeCustomerId: custId,
      email: details.email,
      name: details.name,
      planId: meta.plan_id,
      planName: meta.plan_name || 'Subscription',
      amount: session.amount_total,
      currency: session.currency,
      status: 'paid'
    });
  } catch (err) {
    console.error('recordFromSession error:', err.message);
  }
}

// Success landing page
router.get('/success', async (req, res) => {
  let plan = null;
  if (isConfigured && req.query.session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(req.query.session_id, {
        expand: ['subscription', 'invoice', 'customer']
      });
      plan = session.metadata && session.metadata.plan_name;
      if (session.payment_status === 'paid' || session.status === 'complete') {
        await recordFromSession(session);
      }
    } catch (err) {
      console.error('Could not retrieve checkout session:', err.message);
    }
  }
  res.render('message', {
    title: 'Payment successful',
    heading: '🎉 You’re all set!',
    body: plan
      ? `Your ${plan} subscription is active. A receipt has been emailed to you, and our team will reach out shortly.`
      : 'Your subscription is active. A receipt has been emailed to you, and our team will reach out shortly.',
    cta: { href: '/', label: 'Back to home' }
  });
});

// Cancel landing page
router.get('/cancel', (req, res) => {
  res.render('message', {
    title: 'Checkout canceled',
    heading: 'Checkout canceled',
    body: 'No worries — you weren’t charged. You can pick a plan whenever you’re ready.',
    cta: { href: '/#pricing', label: 'Back to pricing' }
  });
});

module.exports = router;
