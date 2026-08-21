import { resolveNft } from "./nft.js";
import { fetchResource } from "./transport.js";

export type ResourceOptions = {
    rpc?: Record<number, URL>,
    ipfsGateway?: URL,
    fetch?: typeof fetch,
};

export type ResourceResolver = (path: URL, options?: ResourceOptions) => Promise<ArrayBuffer>;

/**
 * Resolves an avatar resource to its bytes.
 *
 * Plain resources are fetched directly. NFT references are resolved through
 * their token metadata before the resulting image resource is fetched.
 */
export const resource = async (path: URL, options: ResourceOptions = {}): Promise<ArrayBuffer> =>
    path.protocol === "eip155:"
        ? resolveNft(path, options, resource)
        : fetchResource(path, options);
