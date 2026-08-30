import { fetchData } from "./modules/data.js";
import { fetchHttp } from "./modules/http.js";
import { fetchGatewayResource, fetchIpfs, fetchIpns } from "./modules/ipfs.js";
import { fetchSwarm } from "./modules/swarm.js";
import { resolveNft } from "./nft.js";
import type { DecodedResource, ResourceOptions } from "./resource.js";

const maxResourceHops = 5;

const fetchResourceContent = async (path: URL, options: ResourceOptions): Promise<ArrayBuffer> => {
  const gatewayResource = fetchGatewayResource(path, options);

  if (gatewayResource) {
    return gatewayResource;
  }

  switch (path.protocol) {
    case "http:":
    case "https:": {
      return fetchHttp(path, options);
    }
    case "data:": {
      return fetchData(path);
    }
    case "ipfs:": {
      return fetchIpfs(path, options);
    }
    case "ipns:": {
      return fetchIpns(path, options);
    }
    case "bzz:": {
      return fetchSwarm(path, options);
    }
    default: {
      throw new Error(`Unsupported resource protocol: ${path.protocol}`);
    }
  }
};

/** Fetches bytes from supported resources, including bounded NFT references. */
export const fetchResource = async (
  path: URL,
  options: ResourceOptions = {},
): Promise<ArrayBuffer | undefined> => fetchResourceAt(path, options, 0);

const fetchResourceAt = async (
  path: URL,
  options: ResourceOptions,
  hops: number,
): Promise<ArrayBuffer | undefined> => {
  const resolvers = options.resourceResolvers ?? [];

  for (const resolver of resolvers) {
    const result = await resolver(path, options);

    if (isDecodedResource(result)) {
      const body = await fetchResourceAt(result.source, options, hops + 1);

      if (body === undefined) {
        return undefined;
      }

      const decoded = await result.decoder(body);

      return resolveResource(decoded, options, hops + 1);
    }

    if (result instanceof URL) {
      if (hops >= maxResourceHops) {
        throw new Error(`Resource did not resolve within ${maxResourceHops} hops: ${path}`);
      }

      return fetchResourceAt(result, options, hops + 1);
    }

    if (result) {
      return result;
    }
  }

  if (path.protocol === "eip155:") {
    if (hops >= maxResourceHops) {
      return options.default;
    }

    return resolveNft(path, options, fetchResourceAt, hops);
  }

  return fetchResourceContent(path, options);
};

const isDecodedResource = (value: ArrayBuffer | URL | DecodedResource | undefined): value is DecodedResource =>
  typeof value === "object" && value !== null && "source" in value && "decoder" in value;

const resolveResource = async (
  result: ArrayBuffer | URL,
  options: ResourceOptions,
  hops: number,
): Promise<ArrayBuffer | undefined> => {
  if (result instanceof URL) {
    if (hops >= maxResourceHops) {
      throw new Error(`Resource did not resolve within ${maxResourceHops} hops: ${result}`);
    }

    return fetchResourceAt(result, options, hops + 1);
  }

  return result;
};
