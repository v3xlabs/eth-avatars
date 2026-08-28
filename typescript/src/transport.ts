import { CID } from "multiformats/cid";
import { cacheInCOS, cacheInLocalStorage } from "./store.js";
import { resolveNft } from "./nft.js";
import type { ResourceOptions } from "./resource.js";

type GatewayPath = {
    content: URL,
    gateway: URL,
};

const defaultIpfsGateway = new URL("https://ipfs.io/");

const requireHttpGateway = (gateway: URL): URL => {
    if (!["http:", "https:"].includes(gateway.protocol)) {
        throw new Error(`IPFS gateway must use http or https: ${gateway}`);
    }
    return gateway;
};

const gatewayPath = (url: URL): GatewayPath | undefined => {
    if (!["http:", "https:"].includes(url.protocol)) {
        return undefined;
    }

    const pathMatch = /^\/(ipfs|ipns)\/([^/]+)(\/.*)?$/.exec(url.pathname);
    if (pathMatch?.[2]) {
        return {
            content: new URL(`${pathMatch[1]}://${pathMatch[2]}${pathMatch[3] ?? "/"}${url.search}`),
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
        content: new URL(`${labels[marker]}://${name}${url.pathname || "/"}${url.search}`),
        gateway: new URL(`${url.protocol}//${host}`),
    };
};

const cacheHash = (cid: CID): { digest: string, algorithm: "SHA-256" | "SHA-512" } | undefined => {
    const { code, digest } = cid.multihash;
    switch (code) {
        case 0x12:
            return {
                digest: Array.from(digest, byte => byte.toString(16).padStart(2, "0")).join(""),
                algorithm: "SHA-256",
            };
        case 0x13:
            return {
                digest: Array.from(digest, byte => byte.toString(16).padStart(2, "0")).join(""),
                algorithm: "SHA-512",
            };
        default:
            return undefined;
    }
};

const requireOk = (response: Response, path: URL): Response => {
    if (!response.ok) {
        throw new Error(`Resource request failed (${response.status} ${response.statusText}): ${path}`);
    }
    return response;
};

const fetchIpfs = async (path: URL, gateway: URL, fetcher: typeof fetch): Promise<ArrayBuffer> => {
    const cid = CID.parse(path.hostname);
    const get = async () => {
        const gatewayPath = new URL(`/ipfs/${path.hostname}${path.pathname}${path.search}`, gateway);
        const response = await fetcher(gatewayPath, {
            method: "GET",
            headers: { "Accept": "application/json, image/*" },
        });
        return requireOk(response, gatewayPath).arrayBuffer();
    };
    const hash = cacheHash(cid);
    const key = `${cid.multihash.code}:${cid.multihash.digest.toString()}:${path.pathname}:${path.search}`;
    const cached = path.pathname === "/" && !path.search && hash
        ? cacheInCOS(get, hash)
        : cacheInLocalStorage(get, key);
    return cached;
};

const fetchData = (path: URL): ArrayBuffer => {
    const match = /^data:([^,]+)?,(.*)$/.exec(path.toString());
    const metadata = match?.[1];
    const payload = match?.[2];
    if (!metadata || payload === undefined) {
        throw new Error(`Unsupported data URL: ${path}`);
    }
    if (metadata.split(";").includes("base64")) {
        return Uint8Array.from(atob(payload), character => character.charCodeAt(0)).buffer;
    }
    return new TextEncoder().encode(decodeURIComponent(payload)).buffer;
};

const fetchHttp = async (path: URL, fetcher: typeof fetch): Promise<ArrayBuffer> => {
    const response = await fetcher(path, {
        method: "GET",
        headers: { "Accept": "application/json, image/*" },
    });
    return requireOk(response, path).arrayBuffer();
};

const fetchIpns = async (path: URL, gateway: URL, fetcher: typeof fetch): Promise<ArrayBuffer> => {
    const gatewayPath = new URL(`/ipns/${path.hostname}${path.pathname}${path.search}`, gateway);
    const response = await fetcher(gatewayPath, {
        method: "GET",
        headers: { "Accept": "application/json, image/*" },
    });
    return requireOk(response, gatewayPath).arrayBuffer();
};

const fetchResourceContent = async (path: URL, options: ResourceOptions): Promise<ArrayBuffer> => {
    const fetcher = options.fetch ?? fetch;
    const gateway = gatewayPath(path);

    if (gateway?.content.protocol === "ipfs:") {
        return fetchIpfs(gateway.content, requireHttpGateway(gateway.gateway), fetcher);
    }
    if (gateway?.content.protocol === "ipns:") {
        return fetchIpns(gateway.content, requireHttpGateway(gateway.gateway), fetcher);
    }

    switch (path.protocol) {
        case "http:":
        case "https:":
            return fetchHttp(path, fetcher);
        case "data:":
            return fetchData(path);
        case "ipfs:":
            return fetchIpfs(path, requireHttpGateway(options.ipfsGateway ?? defaultIpfsGateway), fetcher);
        case "ipns:": {
            return fetchIpns(path, requireHttpGateway(options.ipfsGateway ?? defaultIpfsGateway), fetcher);
        }
        default:
            throw new Error(`Unsupported resource protocol: ${path.protocol}`);
    }
};

/** Fetches bytes from supported resources, including one-hop NFT references. */
export function fetchResource(path: URL, options: ResourceOptions & { default: ArrayBuffer }): Promise<ArrayBuffer>;
export function fetchResource(path: URL, options?: ResourceOptions): Promise<ArrayBuffer | undefined>;
export async function fetchResource(
    path: URL,
    options: ResourceOptions = {},
): Promise<ArrayBuffer | undefined> {
    if (path.protocol === "eip155:") {
        return resolveNft(path, options, fetchResourceContent);
    }
    return fetchResourceContent(path, options);
};
