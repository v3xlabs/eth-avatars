import { fetchResource } from "./transport.js";
export type { DecodedResource, ResourceDecoder, ResourceOptions, ResourceResolver } from "./resource.js";
export { decodedResource } from "./resource.js";
export {
  cacheStorageFetch,
  crossOriginStorageImmutableStore,
  fetchImmutable,
  immutableStore,
  ipfsResource,
  localStorageImmutableStore,
  memoryImmutableStore,
} from "./store.js";

export const avatar = {
  resource: fetchResource,
};
