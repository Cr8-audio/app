/**
 * Who may put a Crate page in an iframe. Embeds exist to be framed by any
 * site; everything else (settings, playlists, sign-in) only by Crate itself,
 * so another site can't frame it and trick a signed-in user into clicking.
 */
export function frameHeadersFor(pathname: string): Record<string, string> {
  if (pathname === '/embed' || pathname.startsWith('/embed/')) {
    return { 'Content-Security-Policy': 'frame-ancestors *' };
  }
  return {
    'Content-Security-Policy': "frame-ancestors 'self'",
    'X-Frame-Options': 'SAMEORIGIN',
  };
}
