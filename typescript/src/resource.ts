import type { Provider } from "ox";

import type { Storage } from "./modules.js";

export type ResourceDecoder = (body: ArrayBuffer) => ArrayBuffer | URL | Promise<ArrayBuffer | URL>;

export type DecodedResource = {
  source: URL;
  decoder: ResourceDecoder;
};

export type ResourceResolver = (
  path: URL,
  options: ResourceOptions,
) => Promise<ArrayBuffer | URL | DecodedResource | undefined>;

export const decodedResource = (source: URL, decoder: ResourceDecoder): DecodedResource => ({
  source,
  decoder,
});

export type ResourceOptions = {
  provider?: Provider.Provider;
  ipfsGateway?: URL;
  swarmGateway?: URL;
  fetch?: typeof fetch;
  storage?: Storage;
  resourceResolvers?: readonly ResourceResolver[];
  default?: ArrayBuffer;
};
