import type { Storage } from "./protocol.js";

const encode = (body: ArrayBuffer): string => {
  const bytes = new Uint8Array(body);
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    binary += String.fromCodePoint(...bytes.subarray(offset, offset + 32_768));
  }

  return btoa(binary);
};

const decode = (value: string): ArrayBuffer =>
  Uint8Array.from(atob(value), character => character.codePointAt(0) ?? 0).buffer;

/** Creates storage backed by localStorage when available. */
export const localStorage = (prefix = "ens-avatars-cache"): Storage => ({
  async read(resource) {
    if (globalThis.localStorage === undefined) {
      return undefined;
    }

    const key = `${prefix}:${resource.key}`;

    try {
      const cached = globalThis.localStorage.getItem(key);

      if (cached) {
        return decode(cached);
      }
    }
    catch {
      return undefined;
    }
  },
  async write(resource, body) {
    if (globalThis.localStorage === undefined) {
      return;
    }

    try {
      globalThis.localStorage.setItem(`${prefix}:${resource.key}`, encode(body));
    }
    catch {
      //
    }
  },
});
