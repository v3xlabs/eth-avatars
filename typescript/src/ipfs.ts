import { createVerifiedFetch, verifiedFetch } from "@helia/verified-fetch";
import { cacheInCOS } from "./store.js";
import { CID } from "multiformats/cid";

export type ResourceOptions = {
    rpc?: {
        100: URL,
    },
    ipfsGateway?: URL,
};

export type IpfsUrl = {
    url: URL,
    gateway?: URL,
};

type VerifiedFetcher = Awaited<ReturnType<typeof createVerifiedFetch>>;

const createFetcher = (gateway?: URL): Promise<VerifiedFetcher> => gateway
    ? createVerifiedFetch({ gateways: [gateway.origin] })
    : Promise.resolve(verifiedFetch);

const makeUrl = (protocol: "ipfs:" | "ipns:", name: string, path: string, search: string): URL =>
    new URL(`${protocol}//${name}${path}${search}`);

export const normalizeIpfsUrl = (url: URL, gateway?: URL): IpfsUrl | undefined => {
    if (url.protocol === "ipfs:" || url.protocol === "ipns:") {
        return gateway ? { url, gateway } : { url };
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
        return undefined;
    }

    const pathMatch = /^\/(ipfs|ipns)\/([^/]+)(\/.*)?$/.exec(url.pathname);
    if (pathMatch?.[2]) {
        return {
            url: makeUrl(pathMatch[1] === "ipfs" ? "ipfs:" : "ipns:", pathMatch[2], pathMatch[3] ?? "/", url.search),
            gateway: new URL(url.origin),
        };
    }

    const labels = url.hostname.split(".");
    const marker = labels.findIndex(label => label === "ipfs" || label === "ipns");
    if (marker < 1) {
        return undefined;
    }

    const name = labels.slice(0, marker).join(".");
    const host = labels.slice(marker + 1).join(".");
    if (!name || !host) {
        return undefined;
    }

    return {
        url: makeUrl(labels[marker] === "ipfs" ? "ipfs:" : "ipns:", name, url.pathname || "/", url.search),
        gateway: new URL(`${url.protocol}//${host}`),
    };
};

const cacheKey = (cid: CID): { digest: string, algorithm: "SHA-256" | "SHA-512" } | undefined => {
    const { code, digest } = cid.multihash;
    if (code === 0x12) {
        return {
            digest: Array.from(digest, byte => byte.toString(16).padStart(2, "0")).join(""),
            algorithm: "SHA-256",
        };
    }
    if (code === 0x13) {
        return {
            digest: Array.from(digest, byte => byte.toString(16).padStart(2, "0")).join(""),
            algorithm: "SHA-512",
        };
    }
    return undefined;
};

export const readIpfs = async (url: URL, gateway?: URL): Promise<ArrayBuffer> => {
    const fetcher = await createFetcher(gateway);
    const get = async () => (await fetcher(url.toString())).arrayBuffer();
    const hash = cacheKey(CID.parse(url.hostname));
    return hash ? cacheInCOS(get, hash) : get();
};

export const readIpns = async (url: URL, gateway?: URL): Promise<ArrayBuffer> => {
    const fetcher = await createFetcher(gateway);
    return (await fetcher(url.toString())).arrayBuffer();
};
