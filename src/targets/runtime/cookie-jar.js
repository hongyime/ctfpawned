(function installCookieJar() {
  const jar = new Map();

  Object.defineProperty(document, "cookie", {
    configurable: true,
    get() {
      return Array.from(jar.entries())
        .map(([key, value]) => `${key}=${value}`)
        .join("; ");
    },
    set(value) {
      const [pair] = String(value).split(";");
      const index = pair.indexOf("=");
      if (index === -1) return;

      jar.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
    },
  });
})();
