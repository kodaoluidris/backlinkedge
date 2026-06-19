const express = require('express');
const router = express.Router();

const { stripe, isConfigured, webhookSecret } = require('../config/stripe');
const dbApi = require('../db');

// Stripe webhook. NOTE: this route must receive the RAW body, so in server.js
// it is mounted with express.raw() BEFORE the json/urlencoded body parsers.
router.post('/', express.raw({ type: 'application/json' }), (req, res) => {
  if (!isConfigured) return res.status(503).send('Stripe not configured');

  let event;
  try {
    const sig = req.headers['stripe-signature'];
    if (webhookSecret && webhookSecret.startsWith('whsec_')) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      // No webhook secret set (dev) — parse without verification.
      event = JSON.parse(req.body.toString('utf8'));
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  handleEvent(event)
    .catch((err) => {
      console.error('Webhook handler error:', err.message);
      // Still 200 so Stripe doesn't hammer retries for a logic bug; logged above.
    })
    .finally(() => res.json({ received: true }));
});

async function handleEvent(event) {
  const obj = event.data && event.data.object ? event.data.object : {};

  switch (event.type) {
    // Fired once when checkout completes — register the customer + subscription.
    case 'checkout.session.completed': {
      const meta = obj.metadata || {};
      if (obj.customer) {
        await dbApi.upsertCustomer({
          stripeCustomerId: obj.customer,
          email: obj.customer_details ? obj.customer_details.email : obj.customer_email,
          name: obj.customer_details ? obj.customer_details.name : null
        });
      }
      if (obj.subscription) {
        await dbApi.upsertSubscription({
          stripeSubscriptionId: obj.subscription,
          stripeCustomerId: obj.customer,
          email: obj.customer_details ? obj.customer_details.email : obj.customer_email,
          planId: meta.plan_id,
          planName: meta.plan_name,
          amount: obj.amount_total,
          currency: obj.currency,
          status: 'active'
        });
      }
      break;
    }

    // Fired on every successful payment (first + each renewal) — the money event.
    case 'invoice.paid':
    case 'invoice.payment_succeeded': {
      const line = (obj.lines && obj.lines.data && obj.lines.data[0]) || {};
      const meta = (line.metadata && Object.keys(line.metadata).length ? line.metadata : obj.subscription_details && obj.subscription_details.metadata) || {};
      await dbApi.recordTransaction({
        stripeEventId: event.id,
        stripeInvoiceId: obj.id,
        stripeCustomerId: obj.customer,
        email: obj.customer_email,
        name: obj.customer_name,
        planId: meta.plan_id,
        planName: meta.plan_name || (line.description) || 'Subscription',
        amount: obj.amount_paid != null ? obj.amount_paid : obj.amount_due,
        currency: obj.currency,
        status: 'paid'
      });
      break;
    }

    case 'invoice.payment_failed': {
      await dbApi.recordTransaction({
        stripeEventId: event.id,
        stripeInvoiceId: obj.id,
        stripeCustomerId: obj.customer,
        email: obj.customer_email,
        planName: 'Subscription',
        amount: obj.amount_due,
        currency: obj.currency,
        status: 'failed'
      });
      break;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const meta = obj.metadata || {};
      const price = (obj.items && obj.items.data && obj.items.data[0] && obj.items.data[0].price) || {};
      await dbApi.upsertSubscription({
        stripeSubscriptionId: obj.id,
        stripeCustomerId: obj.customer,
        planId: meta.plan_id,
        planName: meta.plan_name,
        amount: price.unit_amount,
        currency: obj.currency || (price.currency),
        status: obj.status, // active, canceled, past_due, ...
        currentPeriodEnd: obj.current_period_end
          ? new Date(obj.current_period_end * 1000).toISOString()
          : null
      });
      break;
    }

    default:
      // Unhandled event types are fine to ignore.
      break;
  }
}

module.exports = router;
