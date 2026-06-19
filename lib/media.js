// Media resolution for blog posts.
// Figures out how a stored `image` value should be rendered:
//   - 'embed'  → YouTube / Vimeo URL → render in an <iframe>
//   - 'video'  → direct video file (.mp4, .webm, …) → render in <video>
//   - 'image'  → everything else → render in <img>

function youtubeId(url) {
  const m = String(url || '').match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/
  );
  return m ? m[1] : null;
}

function vimeoId(url) {
  const m = String(url || '').match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

function isVideoFile(src) {
  return /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i.test(String(src || ''));
}

// True if a URL is a recognised video (hosted page OR direct file).
function isVideoUrl(src) {
  return Boolean(youtubeId(src) || vimeoId(src) || isVideoFile(src));
}

// Returns { kind, src, thumb, provider } or null.
function resolveMedia(src, mediaType) {
  if (!src) return null;

  const yt = youtubeId(src);
  if (yt) {
    return {
      kind: 'embed',
      provider: 'youtube',
      src: `https://www.youtube.com/embed/${yt}`,
      thumb: `https://img.youtube.com/vi/${yt}/hqdefault.jpg`
    };
  }

  const vm = vimeoId(src);
  if (vm) {
    return {
      kind: 'embed',
      provider: 'vimeo',
      src: `https://player.vimeo.com/video/${vm}`,
      thumb: null
    };
  }

  if (mediaType === 'video' || isVideoFile(src)) {
    return { kind: 'video', provider: 'file', src, thumb: null };
  }

  return { kind: 'image', provider: 'file', src, thumb: src };
}

module.exports = { resolveMedia, isVideoUrl, youtubeId, vimeoId };
