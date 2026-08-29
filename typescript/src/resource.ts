import type { Provider } from "ox";

import type { ImmutableStore } from "./store.js";

export type ResourceOptions = {
  provider?: Provider.Provider;
  ipfsGateway?: URL;
  swarmGateway?: URL;
  fetch?: typeof fetch;
  immutableStore?: ImmutableStore;
  default?: ArrayBuffer;
};
