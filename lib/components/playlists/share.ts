/** Links and embed code for a shared playlist. */

export const EMBED_HEIGHT = 380;

export function shareUrl(origin: string, shareId: string) {
  return `${origin}/p/${shareId}`;
}

export function embedUrl(origin: string, shareId: string) {
  return `${origin}/embed/${shareId}`;
}

function escapeAttribute(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * The iframe to paste into another site. `allow="autoplay"` lets the
 * listener's click start audio inside the frame; browsers still won't play
 * sound before someone presses play.
 */
export function embedCode(origin: string, shareId: string, title: string) {
  return (
    `<iframe src="${embedUrl(origin, shareId)}" ` +
    `title="${escapeAttribute(title)} on Crate" width="100%" ` +
    `height="${EMBED_HEIGHT}" style="border:0;border-radius:16px" ` +
    `allow="autoplay; encrypted-media; picture-in-picture" loading="lazy"></iframe>`
  );
}
