import type { ResourceOptions } from "../resource.js";
import { fetchHttp, requireHttpGateway } from "./http.js";
import { fetchStored } from "./storage.js";

const defaultGateway = new URL("https://gateway.ethswarm.org/");

export const fetchSwarm = (path: URL, options: ResourceOptions): Promise<ArrayBuffer> => {
  const gateway = requireHttpGateway(options.swarmGateway ?? defaultGateway, "Swarm");
  const target = new URL(`/bzz/${path.hostname}${path.pathname}${path.search}`, gateway);

  return fetchStored(
    options.storage,
    { key: `bzz:${path.hostname}:${path.pathname}:${path.search}` },
    () => fetchHttp(target, options),
  );
};
