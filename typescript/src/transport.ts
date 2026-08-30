import { resolveNft } from "./nft.js";
import type { ResourceOptions } from "./resource.js";
import { fetchImmutable, ipfsResource } from "./store.js";

type GatewayPath = {
  content: URL;
  gateway: URL;
};

const defaultIpfsGateway = new URL("https://ipfs.io/");
const defaultSwarmGateway = new URL("https://gateway.ethswarm.org/");
const accept = "application/json, image/*";
const maxResourceHops = 5;

const requireHttpGateway = (gateway: URL, protocol: string): URL => {
  if (![("http:"), "https:"].includes(gateway.protocol)) {
    throw new Error(`${protocol} gateway must use http or https: ${gateway}`);
  }

  return gateway;
};

const gatewayPath = (url: URL): GatewayPath | undefined => {
  if (![("http:"), "https:"].includes(url.protocol)) {
    return undefined;
  }

  const pathMatch = /^\/(ipfs|ipns)\/([^/]+)(\/.*)?$/.exec(url.pathname);

  if (pathMatch?.[1] && pathMatch[2]) {
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
  const protocol = labels[marker];

  if (!name || !host || !protocol) {
    return undefined;
  }

  return {
    content: new URL(`${protocol}://${name}${url.pathname || "/"}${url.search}`),
    gateway: new URL(`${url.protocol}//${host}`),
  };
};

const requireOk = (response: Response, path: URL): Response => {
  if (!response.ok) {
    throw new Error(`Resource request failed (${response.status} ${response.statusText}): ${path}`);
  }

  return response;
};

const fetchHttp = async (path: URL, options: ResourceOptions): Promise<ArrayBuffer> => {
  const fetcher = options.fetch ?? fetch;
  const response = await fetcher(path, { method: "GET", headers: { Accept: accept } });

  return requireOk(response, path).arrayBuffer();
};

const fetchGateway = async (path: URL, gateway: URL, options: ResourceOptions): Promise<ArrayBuffer> => {
  const target = new URL(`/${path.protocol.slice(0, -1)}/${path.hostname}${path.pathname}${path.search}`, gateway);

  const fetcher = options.fetch ?? fetch;
  const response = await fetcher(target, { method: "GET", headers: { Accept: accept } });

  return requireOk(response, target).arrayBuffer();
};

const fetchIpfs = (path: URL, gateway: URL, options: ResourceOptions): Promise<ArrayBuffer> => {
  const target = new URL(`/ipfs/${path.hostname}${path.pathname}${path.search}`, gateway);

  return fetchImmutable(options.immutableStore, ipfsResource(path), () => fetchHttp(target, options));
};

const fetchSwarm = (path: URL, gateway: URL, options: ResourceOptions): Promise<ArrayBuffer> =>
  fetchImmutable(
    options.immutableStore,
    { key: `bzz:${path.hostname}:${path.pathname}:${path.search}` },
    () => fetchHttp(new URL(`/bzz/${path.hostname}${path.pathname}${path.search}`, gateway), options),
  );

const fetchData = (path: URL): ArrayBuffer => {
  const match = /^data:([^,]+)?,(.*)$/s.exec(path.href);
  const metadata = match?.[1];
  const payload = match?.[2];

  if (!metadata || payload === undefined) {
    throw new Error(`Unsupported data URL: ${path.href}`);
  }

  if (metadata.split(";").includes("base64")) {
    return Uint8Array.from(atob(payload), character => character.codePointAt(0) ?? 0).buffer;
  }

  return new TextEncoder().encode(decodeURIComponent(payload)).buffer;
};

const fetchResourceContent = async (path: URL, options: ResourceOptions): Promise<ArrayBuffer> => {
  const gateway = gatewayPath(path);

  if (gateway?.content.protocol === "ipfs:" || gateway?.content.protocol === "ipns:") {
    const protocol = gateway.content.protocol.slice(0, -1) as "ipfs" | "ipns";

    if (protocol === "ipfs") {
      return fetchIpfs(gateway.content, requireHttpGateway(gateway.gateway, "IPFS"), options);
    }

    return fetchGateway(gateway.content, requireHttpGateway(gateway.gateway, "IPNS"), options);
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
      return fetchIpfs(path, requireHttpGateway(options.ipfsGateway ?? defaultIpfsGateway, "IPFS"), options);
    }
    case "ipns:": {
      return fetchGateway(path, requireHttpGateway(options.ipfsGateway ?? defaultIpfsGateway, "IPNS"), options);
    }
    case "bzz:": {
      return fetchSwarm(path, requireHttpGateway(options.swarmGateway ?? defaultSwarmGateway, "Swarm"), options);
    }
    default: {
      throw new Error(`Unsupported resource protocol: ${path.protocol}`);
    }
  }
};

/** Fetches bytes from supported resources, including bounded NFT references. */
export function fetchResource(path: URL, options: ResourceOptions & { default: ArrayBuffer; }): Promise<ArrayBuffer>;
export function fetchResource(path: URL, options?: ResourceOptions): Promise<ArrayBuffer | undefined>;
export async function fetchResource(
  path: URL,
  options: ResourceOptions = {},
): Promise<ArrayBuffer | undefined> {
  return fetchResourceAt(path, options, 0);
}

const fetchResourceAt = async (
  path: URL,
  options: ResourceOptions,
  hops: number,
): Promise<ArrayBuffer | undefined> => {
  const resolvers = options.resourceResolvers ?? [];

  for (const resolver of resolvers) {
    const result = await resolver(path, options);

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
