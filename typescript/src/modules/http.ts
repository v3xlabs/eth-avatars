import type { ResourceOptions } from "../resource.js";

const accept = "application/json, image/*";

export const requireHttpGateway = (gateway: URL, protocol: string): URL => {
  if (!["http:", "https:"].includes(gateway.protocol)) {
    throw new Error(`${protocol} gateway must use http or https: ${gateway}`);
  }

  return gateway;
};

export const fetchHttp = async (path: URL, options: ResourceOptions): Promise<ArrayBuffer> => {
  const fetcher = options.fetch ?? fetch;
  const response = await fetcher(path, { method: "GET", headers: { Accept: accept } });

  if (!response.ok) {
    throw new Error(`Resource request failed (${response.status} ${response.statusText}): ${path}`);
  }

  return response.arrayBuffer();
};
