import type { Storage } from "./protocol.js";

/** Creates storage backed by Cross-Origin Storage when eligible. */
export const crossOriginStorage = (): Storage => ({
  async read(resource) {
    const storage = typeof navigator === "undefined" ? undefined : navigator.crossOriginStorage;

    if (!storage || !resource.contentHash) {
      return undefined;
    }

    try {
      const handle = await storage.requestFileHandle(
        {
          value: resource.contentHash.digest,
          algorithm: resource.contentHash.algorithm,
        },
        {
          create: false,
          origins: "*",
        },
      );
      const file = await handle.getFile();

      return file.size > 0 ? file.arrayBuffer() : undefined;
    }
    catch {
      return undefined;
    }
  },
  async write(resource, body) {
    const storage = typeof navigator === "undefined" ? undefined : navigator.crossOriginStorage;

    if (!storage || !resource.contentHash) {
      return;
    }

    try {
      const handle = await storage.requestFileHandle(
        {
          value: resource.contentHash.digest,
          algorithm: resource.contentHash.algorithm,
        },
        {
          create: true,
          origins: "*",
        },
      );
      const writable = await handle.createWritable();

      await writable.write(new Blob([body]));
      await writable.close();
    }
    catch {
      //
    }
  },
});
