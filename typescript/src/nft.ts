import type { Hex, Provider } from "ox";
import { AbiFunction, Address } from "ox";

import { maxResourceHops, type ResourceOptions } from "./resource.js";

type NftKind = "erc721" | "erc1155";

type NftReference = {
  chainId: number;
  kind: NftKind;
  contract: Address.Address;
  tokenId: bigint;
};

type NftMetadata = {
  image: string | undefined;
  image_url: string | undefined;
  image_data: string | undefined;
};

type NftImage = {
  value: string;
  raw: boolean;
};

type ResourceFetcher = (path: URL, options: ResourceOptions, hops: number) => Promise<ArrayBuffer | undefined>;

const resourceHops = (path: URL): number => {
  switch (path.protocol) {
    case "data:": {
      return 0;
    }
    case "ipfs:":
    case "ipns:":
    case "bzz:": {
      return 2;
    }
    default: {
      return 1;
    }
  }
};

const isHex = (value: unknown): value is Hex.Hex =>
  typeof value === "string" && /^0x[0-9a-fA-F]+$/.test(value);

const tokenUri = AbiFunction.from("function tokenURI(uint256) returns (string)");
const uri = AbiFunction.from("function uri(uint256) returns (string)");

const parseNft = (path: URL): NftReference | undefined => {
  const match = /^(\d+)\/(erc721|erc1155):(0x[0-9a-fA-F]{40})\/(\d+)$/i.exec(path.pathname);

  if (!match) {
    return undefined;
  }

  const [, chainIdText, kindText, contract, tokenIdText] = match;

  if (!chainIdText || !kindText || !contract || !tokenIdText || !Address.validate(contract, { strict: false })) {
    return undefined;
  }

  const chainId = Number(chainIdText);
  const tokenId = BigInt(tokenIdText);

  if (!Number.isSafeInteger(chainId) || tokenId < 0n) {
    return undefined;
  }

  if (kindText.toLowerCase() === "erc721") {
    return { chainId, kind: "erc721", contract, tokenId };
  }

  if (kindText.toLowerCase() === "erc1155") {
    return { chainId, kind: "erc1155", contract, tokenId };
  }

  return undefined;
};

const call = async (
  provider: Provider.Provider,
  contract: Address.Address,
  data: `0x${string}`,
): Promise<`0x${string}`> => {
  const result = await provider.request({
    method: "eth_call",
    params: [{ to: contract, data }, "latest"],
  });

  if (!isHex(result)) {
    throw new Error("EIP-1193 provider returned an invalid eth_call result");
  }

  return result;
};

const metadataUri = async (reference: NftReference, provider: Provider.Provider): Promise<string> => {
  const functionAbi = reference.kind === "erc721" ? tokenUri : uri;
  const data = AbiFunction.encodeData(functionAbi, [reference.tokenId]);
  const encoded = await call(provider, reference.contract, data);

  return AbiFunction.decodeResult(functionAbi, encoded);
};

const providerChainId = async (provider: Provider.Provider): Promise<number> => {
  const value = await provider.request({ method: "eth_chainId" });

  if (!isHex(value)) {
    throw new Error("EIP-1193 provider returned an invalid eth_chainId result");
  }

  const chainId = BigInt(value);

  if (chainId > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("EIP-1193 provider returned an unsafe eth_chainId result");
  }

  return Number(chainId);
};

const metadataString = (metadata: object, key: string): string | undefined => {
  const value = Reflect.get(metadata, key);

  return typeof value === "string" ? value : undefined;
};

const metadataImage = (metadata: unknown): NftImage => {
  if (metadata === null || typeof metadata !== "object") {
    throw new Error("NFT metadata is not an object");
  }

  const parsed: NftMetadata = {
    image: metadataString(metadata, "image"),
    image_url: metadataString(metadata, "image_url"),
    image_data: metadataString(metadata, "image_data"),
  };
  const image = parsed.image ?? parsed.image_url ?? parsed.image_data;

  if (typeof image !== "string" || !image) {
    throw new Error("NFT metadata has no image");
  }

  return { value: image, raw: image.startsWith("<") };
};

const readMetadata = async (
  path: URL,
  options: ResourceOptions,
  fetchResource: ResourceFetcher,
  hops: number,
): Promise<unknown> => {
  const bytes = await fetchResource(path, options, hops);
  const metadata: unknown = JSON.parse(new TextDecoder().decode(bytes));

  return metadata;
};

/** Resolves a CAIP ERC-721 or ERC-1155 reference to its final image bytes. */
export const resolveNft = async (
  path: URL,
  options: ResourceOptions,
  fetchResource: ResourceFetcher,
  hops: number,
): Promise<ArrayBuffer | undefined> => {
  const reference = parseNft(path);

  if (!reference) {
    throw new Error(`Invalid CAIP NFT URI: ${path}`);
  }

  const provider = options.provider;

  if (!provider) {
    throw new Error("No EIP-1193 provider configured");
  }

  if (await providerChainId(provider) !== reference.chainId) {
    throw new Error(`EIP-1193 provider is not connected to chain ${reference.chainId}`);
  }

  const uriValue = await metadataUri(reference, provider);
  const metadataPath = reference.kind === "erc1155"
    ? uriValue.split("{id}").join(reference.tokenId.toString(16).padStart(64, "0"))
    : uriValue;
  let metadataUrl: URL;

  try {
    metadataUrl = new URL(metadataPath);
  }
  catch {
    throw new Error(`NFT metadata URI must be absolute: ${metadataPath}`);
  }

  const image = metadataImage(await readMetadata(metadataUrl, options, fetchResource, hops));

  if (image.raw) {
    return new TextEncoder().encode(image.value).buffer;
  }

  const imageHops = hops + resourceHops(metadataUrl);
  const imageUrl = new URL(image.value, metadataUrl);

  if (imageUrl.protocol === "eip155:") {
    if (imageHops >= maxResourceHops) {
      return options.default;
    }

    return fetchResource(imageUrl, options, imageHops);
  }

  return fetchResource(imageUrl, options, imageHops);
};
