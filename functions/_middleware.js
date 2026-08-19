/* Host-aware routing for the two app domains on the same Pages project.
   If the ASSETS binding is missing, fall through — index.html redirects
   cleantruckcheckvin.app / to /vin/. */

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const path = url.pathname;

  if (host === "cleantruckcheckvin.app" && (path === "/" || path === "/index.html")) {
    try {
      if (env && env.ASSETS) {
        return await env.ASSETS.fetch(new URL("/vin/index.html", url.origin));
      }
    } catch {
      /* index.html JS redirect is the fallback */
    }
  }

  return next();
}
