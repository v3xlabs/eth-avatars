import { CID } from "multiformats/cid";

import type { ResourceOptions } from "../resource.js";
import { fetchHttp, requireHttpGateway } from "./http.js";
import type { StorageResource } from "./protocol.js";
import { fetchStored } from "./storage.js";

const algorithms = new Map<number, "SHA-1" | "SHA-256" | "SHA-512">([
  [0x11, "SHA-1"],
  [0x12, "SHA-256"],
  [0x13, "SHA-512"],
]);

const digest = (cid: CID): string =>
  Array.from(cid.multihash.digest, byte => byte.toString(16).padStart(2, "0")).join("");

/** Creates the stable storage identity for an IPFS resource. */
export const ipfsResource = (path: URL): StorageResource => {
  const cid = CID.parse(path.hostname);
  const key = `ipfs:${cid.multihash.code}:${digest(cid)}:${path.pathname}:${path.search}`;
  const algorithm = algorithms.get(cid.multihash.code);

  if (!algorithm || path.pathname !== "/" || path.search) {
    return { key };
  }

  return {
    key,
    contentHash: { digest: digest(cid), algorithm },
  };
};

const defaultGateway = new URL("https://ipfs.io/");

type GatewayResource = {
  content: URL;
  gateway: URL;
};

const fromGatewayUrl = (url: URL): GatewayResource | undefined => {
  if (!["http:", "https:"].includes(url.protocol)) {
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

export const fetchIpfs = (path: URL, options: ResourceOptions, gateway = options.ipfsGateway ?? defaultGateway): Promise<ArrayBuffer> => {
  const target = new URL(`/ipfs/${path.hostname}${path.pathname}${path.search}`, requireHttpGateway(gateway, "IPFS"));

  return fetchStored(options.storage, ipfsResource(path), () => fetchHttp(target, options));
};

export const fetchIpns = (path: URL, options: ResourceOptions, gateway = options.ipfsGateway ?? defaultGateway): Promise<ArrayBuffer> => {
  const target = new URL(`/${path.protocol.slice(0, -1)}/${path.hostname}${path.pathname}${path.search}`, requireHttpGateway(gateway, "IPNS"));

  return fetchHttp(target, options);
};

export const fetchGatewayResource = (path: URL, options: ResourceOptions): Promise<ArrayBuffer> | undefined => {
  const resource = fromGatewayUrl(path);

  if (!resource) {
    return undefined;
  }

  if (resource.content.protocol === "ipfs:") {
    return fetchIpfs(resource.content, options, resource.gateway);
  }

  if (resource.content.protocol === "ipns:") {
    return fetchIpns(resource.content, options, resource.gateway);
  }

  return undefined;
};
