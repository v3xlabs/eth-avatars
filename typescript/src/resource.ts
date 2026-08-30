import type { Provider } from "ox";

import type { ImmutableStore } from "./store.js";

export type ResourceResolver = (
  path: URL,
  options: ResourceOptions,
) => Promise<ArrayBuffer | URL | undefined>;

export type ResourceOptions = {
  provider?: Provider.Provider;
  ipfsGateway?: URL;
  swarmGateway?: URL;
  fetch?: typeof fetch;
  immutableStore?: ImmutableStore;
  resourceResolvers?: readonly ResourceResolver[];
  default?: ArrayBuffer;
};
