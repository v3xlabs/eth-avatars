import type { ImmutableStore } from "./protocol.js";

/** Creates an isolated store for immutable resource bytes. */
export const memoryImmutableStore = (): ImmutableStore => {
  const entries = new Map<string, ArrayBuffer>();

  return {
    async read(resource) {
      const cached = entries.get(resource.key);

      return cached?.slice(0);
    },
    async write(resource, body) {
      entries.set(resource.key, body.slice(0));
    },
  };
};
