import type { ImmutableStore } from "./protocol.js";

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

/** Creates an immutable store backed by localStorage when available. */
export const localStorageImmutableStore = (prefix = "ens-avatars-cache"): ImmutableStore => ({
  async read(resource) {
    if (typeof localStorage === "undefined") {
      return undefined;
    }

    const key = `${prefix}:${resource.key}`;

    try {
      const cached = localStorage.getItem(key);

      if (cached) {
        return decode(cached);
      }
    }
    catch {
      return undefined;
    }
  },
  async write(resource, body) {
    if (typeof localStorage === "undefined") {
      return;
    }

    try {
      localStorage.setItem(`${prefix}:${resource.key}`, encode(body));
    }
    catch {
      //
    }
  },
});
