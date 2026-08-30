/** Creates a GET fetcher backed by the browser Cache Storage API. */
export const cacheStorageFetch = (name = "eth-avatars"): typeof fetch =>
  async (input, init) => {
    if (typeof caches === "undefined" || (init?.method && init.method !== "GET")) {
      return fetch(input, init);
    }

    const cache = await caches.open(name);
    const request = new Request(input, init);
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    const response = await fetch(request);

    if (response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  };
