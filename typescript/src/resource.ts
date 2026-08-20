import { cacheInCOS, cacheInLocalstorage } from "./store.js";
import { CID } from "multiformats/cid";

type ResourceOptions = {
    rpc?: {
        100: URL,
    },
    ipfsGateway?: URL,
};

type GatewayPath = {
    content: URL,
    gateway: URL,
};

/**
 * Returns the content and gateway URLs for a given URL if it is an IPFS or IPNS URL, otherwise returns undefined.
 */
const gatewayPath = (url: URL): GatewayPath | undefined => {
    if (url.protocol !== "http:" && url.protocol !== "https:") {
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

type VerifiedFetcher = Awaited<ReturnType<typeof import("@helia/verified-fetch")["createVerifiedFetch"]>>;

const verifiedFetcher = async (gateway?: URL): Promise<VerifiedFetcher> => {
    const { createVerifiedFetch, verifiedFetch } = await import("@helia/verified-fetch");
    return gateway
        ? createVerifiedFetch({ gateways: [gateway.origin] })
        : verifiedFetch;
};

const cacheHash = (cid: CID): { digest: string, algorithm: "SHA-256" | "SHA-512" } | undefined => {
    const { code, digest } = cid.multihash;
    if (code !== 0x12 && code !== 0x13) {
        return undefined;
    }
    return {
        digest: Array.from(digest, byte => byte.toString(16).padStart(2, "0")).join(""),
        algorithm: code === 0x12 ? "SHA-256" : "SHA-512",
    };
};

const readIpfs = async (path: URL, gateway?: URL): Promise<ArrayBuffer> => {
    const cid = CID.parse(path.hostname);
    const get = async () => {
        if (cid.multihash.code === 0x12 || cid.multihash.code === 0x13) {
            const fetch = await verifiedFetcher(gateway);
            return (await fetch(path.toString())).arrayBuffer();
        }
        const root = gateway ?? new URL("https://ipfs.io/");
        const response = await fetch(new URL(`/ipfs/${path.hostname}${path.pathname}${path.search}`, root), {
            method: "GET",
            headers: { "Accept": "image/*" },
        });
        return response.arrayBuffer();
    };
    const cosHash = cacheHash(cid);
    return cosHash
        ? cacheInCOS(get, cosHash)
        : cacheInLocalstorage(get, `${cid.multihash.code}:${cid.multihash.digest.toString()}`);
};

/**
 * Fetches a resource (avatar, banner, etc.) given a URL.
 */
export const resource = async (path: URL, options: ResourceOptions = {}): Promise<ArrayBuffer> => {
    const ipfsGateway = gatewayPath(path);

    if (ipfsGateway?.content.protocol === "ipfs:") {
        return readIpfs(ipfsGateway.content, ipfsGateway.gateway);
    }

    if (ipfsGateway?.content.protocol === "ipns:") {
        const fetch = await verifiedFetcher(ipfsGateway.gateway);
        const response = await fetch(ipfsGateway.content.toString());
        return response.arrayBuffer();
    }

    switch (path.protocol) {
        case "http:":
        case "https:": {
            const response = await fetch(path.toString(), {
                method: "GET",
                headers: { "Accept": "image/*" },
            });
            return response.arrayBuffer();
        }
        case "data:": {
            const match = /^data:([^,]+)?,(.*)$/.exec(path.toString());
            const metadata = match?.[1];
            const payload = match?.[2];
            const mediaType = metadata?.split(";", 1)[0];
            if (!metadata || !mediaType?.startsWith("image/") || payload === undefined) {
                throw new Error(`Unsupported data URL: ${path}`);
            }
            if (metadata.split(";").includes("base64")) {
                return Uint8Array.from(atob(payload), character => character.charCodeAt(0)).buffer;
            }
            return new TextEncoder().encode(decodeURIComponent(payload)).buffer;
        }
        case "ipfs:":
            return readIpfs(path, options.ipfsGateway);
        case "ipns:": {
            const fetch = await verifiedFetcher(options.ipfsGateway);
            const response = await fetch(path.toString());
            return response.arrayBuffer();
        }
        default:
            throw new Error(`Unsupported protocol: ${path.protocol}`);
    }
};
