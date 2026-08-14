window.__ctfpawned_routes = window.__ctfpawned_routes || new Map();

window.__ctfpawned_registerRoute = function registerRoute(routePath, handler) {
  window.__ctfpawned_routes.set(routePath, handler);
};

window.fetch = async function mockFetch(input, init = {}) {
  const url = new URL(String(input), "https://target.invalid");
  const handler = window.__ctfpawned_routes.get(url.pathname);

  if (!handler) {
    throw new TypeError("Network access is disabled in this ctfpawned target");
  }

  return handler({ url, init });
};
