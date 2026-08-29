import type { ImmutableResource, ImmutableStore } from "./protocol.js";

/** Combines immutable stores, reading in order and writing through to every store. */
export const immutableStore = (...stores: readonly ImmutableStore[]): ImmutableStore => ({
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

export const fetchImmutable = async (
  store: ImmutableStore | undefined,
  resource: ImmutableResource,
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
