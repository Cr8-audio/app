import { createMiddleware, createStart } from '@tanstack/react-start';
import { frameHeadersFor } from '@/lib/security/frameHeaders';

const frameHeaders = createMiddleware().server(async ({ request, next }) => {
  const result = await next();
  // Global request middleware isn't given `pathname` (its type says it is).
  const headers = frameHeadersFor(new URL(request.url).pathname);
  try {
    for (const [name, value] of Object.entries(headers)) {
      result.response.headers.set(name, value);
    }
    return result;
  } catch {
    // Some responses (a proxied fetch) have immutable headers; copy them.
    const response = new Response(result.response.body, result.response);
    for (const [name, value] of Object.entries(headers)) {
      response.headers.set(name, value);
    }
    return { ...result, response };
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [frameHeaders],
}));
