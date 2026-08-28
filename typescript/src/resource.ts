import type { Provider } from "ox";

export type ResourceOptions = {
    provider?: Provider.Provider,
    ipfsGateway?: URL,
    fetch?: typeof fetch,
    default?: ArrayBuffer,
};
