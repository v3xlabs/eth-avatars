import type { Storage, StorageResource } from "./protocol.js";

/** Combines storage backends, reading in order and writing through to every backend. */
export const storage = (...stores: readonly Storage[]): Storage => ({
  async read(resource) {
    for (const store of stores) {
      const body = await store.read(resource);

      if (body) {
        return body;
      }
    }

    return undefined;
  },
  async write(resource, body) {
    await Promise.all(stores.map(async store => await store.write(resource, body)));
  },
});

export const fetchStored = async (
  store: Storage | undefined,
  resource: StorageResource,
  download: () => Promise<ArrayBuffer>,
): Promise<ArrayBuffer> => {
  const cached = await store?.read(resource);

  if (cached) {
    return cached;
  }

  const body = await download();

  await store?.write(resource, body);

  return body;
};
