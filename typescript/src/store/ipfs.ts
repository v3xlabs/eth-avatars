import { CID } from "multiformats/cid";

import type { ImmutableResource } from "./protocol.js";

const algorithms = new Map<number, "SHA-1" | "SHA-256" | "SHA-512">([
  [0x11, "SHA-1"],
  [0x12, "SHA-256"],
  [0x13, "SHA-512"],
]);

const digest = (cid: CID): string =>
  Array.from(cid.multihash.digest, byte => byte.toString(16).padStart(2, "0")).join("");

/** Creates the stable storage identity for an IPFS resource. */
export const ipfsResource = (path: URL): ImmutableResource => {
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
