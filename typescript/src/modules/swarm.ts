import type { ResourceOptions } from "../resource.js";
import { fetchHttp, requireHttpGateway } from "./http.js";
import { fetchStored } from "./storage.js";

const defaultGateway = new URL("https://gateway.ethswarm.org/");

export const fetchSwarm = (path: URL, options: ResourceOptions): Promise<ArrayBuffer> => {
  const gateway = requireHttpGateway(options.swarmGateway ?? defaultGateway, "Swarm");
  const [reference, ...segments] = (path.hostname ? `${path.hostname}${path.pathname}` : path.pathname)
    .replace(/^\/+/, "")
    .split("/");

  if (!reference) {
    throw new Error(`Swarm URI carries no reference: ${path}`);
  }

  const resourcePath = `/${segments.join("/")}`;
  const target = new URL(`bzz/${reference}${resourcePath}${path.search}`, gateway);

  return fetchStored(
    options.storage,
    { key: `bzz:${reference}:${resourcePath}:${path.search}` },
    () => fetchHttp(target, options),
  );
};
