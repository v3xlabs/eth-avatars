import { resolveNft } from "./nft.js";
import { fetchResource } from "./transport.js";

export type ResourceOptions = {
    rpc?: Record<number, URL>,
    ipfsGateway?: URL,
    fetch?: typeof fetch,
};

export type ResourceResolver = (path: URL, options?: ResourceOptions) => Promise<ArrayBuffer>;

const maxNftDepth = 8;

const resolveResource = async (path: URL, options: ResourceOptions, nftDepth: number): Promise<ArrayBuffer> => {
    if (path.protocol === "eip155:") {
        if (nftDepth >= maxNftDepth) {
            throw new Error(`NFT resolution exceeded the maximum depth of ${maxNftDepth}`);
        }
        return resolveNft(path, options, (nextPath, nextOptions) =>
            resolveResource(nextPath, nextOptions ?? options, nftDepth + 1));
    }
    return fetchResource(path, options);
};

/**
 * Resolves an avatar resource to its bytes.
 *
 * Plain resources are fetched directly. NFT references are resolved through
 * their token metadata before the resulting image resource is fetched.
 */
export const resource = async (path: URL, options: ResourceOptions = {}): Promise<ArrayBuffer> =>
    resolveResource(path, options, 0);
