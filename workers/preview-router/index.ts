/**
 * Preview Router Worker
 *
 * Routes requests from custom preview domains (123-pr.crate.audio)
 * to the actual worker deployment (crate-app-pr-123.govi218mu.workers.dev)
 *
 * Uses a wildcard DNS record (*) to catch all subdomains, then only
 * handles {number}-pr format, returning 404 for everything else.
 */

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const hostname = url.hostname;

    // Extract PR number from subdomain (123-pr.crate.audio -> 123)
    const match = hostname.match(/^(\d+)-pr\./);

    if (!match) {
      // Not a preview URL - return 404
      return new Response('Not found', { status: 404 });
    }

    const prNumber = match[1];

    // Validate PR number is within a reasonable range (1-99999)
    const prNumberInt = parseInt(prNumber, 10);
    if (isNaN(prNumberInt) || prNumberInt < 1 || prNumberInt > 99999) {
      return new Response('Invalid PR number. Must be between 1 and 99999.', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    const targetHost = `crate-app-pr-${prNumberInt}.govi218mu.workers.dev`;

    // Build the target URL
    const targetUrl = new URL(request.url);
    targetUrl.hostname = targetHost;
    targetUrl.protocol = 'https:';
    targetUrl.port = '';

    // Create new request with modified URL
    const modifiedRequest = new Request(targetUrl.toString(), {
      method: request.method,
      headers: request.headers,
      body:
        request.method !== 'GET' && request.method !== 'HEAD'
          ? request.body
          : null,
      redirect: 'manual', // Don't follow redirects, let client handle them
    });

    try {
      const response = await fetch(modifiedRequest);

      // Clone response and modify headers if needed
      const newHeaders = new Headers(response.headers);

      // Rewrite any Location headers that point to workers.dev
      const location = newHeaders.get('Location');
      if (location) {
        const locationUrl = new URL(location, targetUrl);
        if (locationUrl.hostname === targetHost) {
          locationUrl.hostname = hostname;
          newHeaders.set('Location', locationUrl.toString());
        }
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (error) {
      console.error('Proxy error:', error);
      return new Response(
        `Preview ${prNumber}-pr not found or not deployed yet.`,
        {
          status: 502,
          headers: { 'Content-Type': 'text/plain' },
        },
      );
    }
  },
};
