import { normalizeIpfsUrl, readIpfs, readIpns, type ResourceOptions } from "./ipfs.js";

export const resource = async (path: URL, options: ResourceOptions = {}): Promise<ArrayBuffer> => {
    const ipfs = normalizeIpfsUrl(path, options.ipfsGateway);
    if (ipfs) {
        return ipfs.url.protocol === "ipfs:"
            ? readIpfs(ipfs.url, ipfs.gateway)
            : readIpns(ipfs.url, ipfs.gateway);
    }

    if (path.protocol === "data:") {
        const match = /^data:([^,]+)?,(.*)$/.exec(path.toString());
        if (!match?.[1]?.startsWith("image/") || match[2] === undefined) {
            throw new Error(`Unsupported data URL: ${path}`);
        }
        return Uint8Array.from(atob(match[2]), character => character.charCodeAt(0)).slice().buffer;
    }

    const response = await fetch(path.toString(), {
        method: "GET",
        headers: { "Accept": "image/*" },
    });
    return response.arrayBuffer();
};
