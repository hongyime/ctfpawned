window.__ctfpawned_jwt = {
  decodePart(value) {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(padded));
  },
};
