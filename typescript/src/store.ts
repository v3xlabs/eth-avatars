import { WebCryptoAlgorithm } from "./crypto.js";

export const cacheInLocalstorage = async (get: () => Promise<ArrayBuffer>, key: string) => {
    const localStorageKey = `ens-avatars-cache:${key}`;
    const cached = localStorage.getItem(localStorageKey);
    if (cached) {
        return Uint8Array.from(atob(cached), c => c.charCodeAt(0)).buffer;
    }

    const buffer = await get();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    localStorage.setItem(localStorageKey, base64);
    return buffer;
};

/**
 * Fetches a file from an URL and caches it in the browser's cross-origin storage or localStorage.
 * @param get A function that returns a Promise that resolves to an ArrayBuffer of the file to cache.
 * @param hash The hash of the file to cache.
 * @param algo The algorithm used to hash the file. Defaults to "SHA-256".
 * @returns A Promise that resolves to an ArrayBuffer of the cached file.
 */
export const cacheInCOS = async (
    get: () => Promise<ArrayBuffer>,
    hash?: { digest: string, algorithm: WebCryptoAlgorithm },
) => {
    if (typeof navigator !== "undefined" && typeof navigator.crossOriginStorage !== "undefined" && hash) {
        const handle = await navigator.crossOriginStorage.requestFileHandle(
            {
                value: hash.digest,
                algorithm: hash.algorithm,
            },
            {
                create: true,
                origins: "*",
            }
        );
        const file = await handle.getFile();
        if (file.size > 0) {
            return await file.arrayBuffer();
        }

        const buffer = await get();
        const blob = new Blob([buffer]);
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return buffer;
    } else {
        return await get();
    }
};
