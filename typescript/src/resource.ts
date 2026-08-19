import { createVerifiedFetch, verifiedFetch } from "@helia/verified-fetch";
import { cacheInCOS } from "./store.js";
import { CID } from "multiformats/cid";

type ResourceOptions = {
    rpc?: {
        1: URL,
    },
    ipfsGateway?: URL,
};

type NormalizedContentUrl = {
    url: URL,
    gateway?: URL,
};

type VerifiedFetcher = Awaited<ReturnType<typeof createVerifiedFetch>>;

const createFetcher = (gateway?: URL): Promise<VerifiedFetcher> => gateway
    ? createVerifiedFetch({ gateways: [gateway.origin] })
    : Promise.resolve(verifiedFetch);

const contentUrl = (protocol: "ipfs:" | "ipns:", name: string, path: string, search: string): URL =>
    new URL(`${protocol}//${name}${path}${search}`);

const gatewayUrl = (url: URL): NormalizedContentUrl | undefined => {
    if (url.protocol !== "http:" && url.protocol !== "https:") {
        return undefined;
    }

    const pathMatch = /^\/(ipfs|ipns)\/([^/]+)(\/.*)?$/.exec(url.pathname);
    if (pathMatch?.[2]) {
        return {
            url: contentUrl(pathMatch[1] === "ipfs" ? "ipfs:" : "ipns:", pathMatch[2], pathMatch[3] ?? "/", url.search),
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
        url: contentUrl(labels[marker] === "ipfs" ? "ipfs:" : "ipns:", name, url.pathname || "/", url.search),
        gateway: new URL(`${url.protocol}//${host}`),
    };
};

const normalize = (url: URL, gateway?: URL): NormalizedContentUrl => {
    const normalized = gatewayUrl(url);
    if (normalized) {
        return normalized;
    }
    if (url.protocol === "ipfs:" || url.protocol === "ipns:") {
        return gateway ? { url, gateway } : { url };
    }
    if (url.protocol !== "http:" && url.protocol !== "https:" && url.protocol !== "data:") {
        throw new Error(`Unsupported protocol: ${url.protocol}`);
    }
    return { url };
};

const hex = (bytes: Uint8Array): string =>
    Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");

const cacheKey = (cid: CID): { digest: string, algorithm: "SHA-256" | "SHA-512" } | undefined => {
    if (cid.multihash.code === 0x12) {
        return { digest: hex(cid.multihash.digest), algorithm: "SHA-256" };
    }
    if (cid.multihash.code === 0x13) {
        return { digest: hex(cid.multihash.digest), algorithm: "SHA-512" };
    }
    return undefined;
};

const readIpfs = async (url: URL, fetcher: VerifiedFetcher): Promise<ArrayBuffer> => {
    const get = async () => (await fetcher(url.toString())).arrayBuffer();
    const hash = cacheKey(CID.parse(url.hostname));
    return hash ? cacheInCOS(get, hash) : get();
};

export const resource = async (path: URL, options: ResourceOptions = {}): Promise<ArrayBuffer> => {
    const normalized = normalize(path, options.ipfsGateway);

    if (normalized.url.protocol === "ipfs:" || normalized.url.protocol === "ipns:") {
        const fetcher = await createFetcher(normalized.gateway);
        return normalized.url.protocol === "ipfs:"
            ? readIpfs(normalized.url, fetcher)
            : (await fetcher(normalized.url.toString())).arrayBuffer();
    }

    if (normalized.url.protocol === "data:") {
        const match = /^data:([^,]+)?,(.*)$/.exec(normalized.url.toString());
        if (!match?.[1]?.startsWith("image/") || match[2] === undefined) {
            throw new Error(`Unsupported data URL: ${normalized.url}`);
        }
        return Uint8Array.from(atob(match[2]), character => character.charCodeAt(0)).slice().buffer;
    }

    const response = await fetch(normalized.url.toString(), {
        method: "GET",
        headers: { "Accept": "image/*" },
    });
    return response.arrayBuffer();
};
