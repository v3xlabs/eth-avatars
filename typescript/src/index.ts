import { fetchResource } from "./transport.js";
export {
  cacheStorageFetch,
  crossOriginStorage,
  fetchStored,
  ipfsResource,
  localStorage,
  memoryStorage,
} from "./modules.js";
export type { DecodedResource, ResourceDecoder, ResourceOptions, ResourceResolver } from "./resource.js";
export { decodedResource } from "./resource.js";

export const avatar = {
  resource: fetchResource,
};
