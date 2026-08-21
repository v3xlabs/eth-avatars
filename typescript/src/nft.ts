import { AbiFunction, Address, RpcRequest, RpcResponse } from "ox";
import type { ResourceOptions, ResourceResolver } from "./resource.js";
import { fetchResource } from "./transport.js";

type NftKind = "erc721" | "erc1155";

type NftReference = {
    chainId: number,
    kind: NftKind,
    contract: Address.Address,
    tokenId: bigint,
};

type NftMetadata = {
    image: string | undefined,
    image_url: string | undefined,
    image_data: string | undefined,
};

type NftImage = {
    value: string,
    raw: boolean,
};

const tokenUri = AbiFunction.from("function tokenURI(uint256) returns (string)");
const uri = AbiFunction.from("function uri(uint256) returns (string)");

const parseNft = (path: URL): NftReference | undefined => {
    const match = /^(\d+)\/(erc721|erc1155):(0x[0-9a-fA-F]{40})\/(\d+)$/.exec(path.pathname);
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

    const kind = kindText === "erc721" || kindText === "erc1155" ? kindText : undefined;
    return kind ? { chainId, kind, contract, tokenId } : undefined;
};

const call = async (rpc: URL, contract: Address.Address, data: `0x${string}`, fetcher: typeof fetch): Promise<`0x${string}`> => {
    if (!["http:", "https:"].includes(rpc.protocol)) {
        throw new Error(`RPC URL must use http or https: ${rpc}`);
    }
    const request = RpcRequest.from({
        id: 1,
        method: "eth_call",
        params: [{ to: contract, data }, "latest"],
    });
    const response = await fetcher(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    return RpcResponse.parse(await requireOk(response, rpc).json(), { request });
};

const requireOk = (response: Response, path: URL): Response => {
    if (!response.ok) {
        throw new Error(`RPC request failed (${response.status} ${response.statusText}): ${path}`);
    }
    return response;
};

const metadataUri = async (reference: NftReference, rpc: URL, fetcher: typeof fetch): Promise<string> => {
    const functionAbi = reference.kind === "erc721" ? tokenUri : uri;
    const data = AbiFunction.encodeData(functionAbi, [reference.tokenId]);
    const encoded = await call(rpc, reference.contract, data, fetcher);
    return AbiFunction.decodeResult(functionAbi, encoded);
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
    return { value: image, raw: image === parsed.image_data && /^\s*</.test(image) };
};

const readMetadata = async (path: URL, options: ResourceOptions): Promise<unknown> => {
    const bytes = await fetchResource(path, options);
    const metadata: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return metadata;
};

/** Resolves a CAIP ERC-721 or ERC-1155 reference to its final image bytes. */
export const resolveNft = async (
    path: URL,
    options: ResourceOptions,
    resolve: ResourceResolver,
): Promise<ArrayBuffer> => {
    const reference = parseNft(path);
    if (!reference) {
        throw new Error(`Invalid CAIP NFT URI: ${path}`);
    }
    const fetcher = options.fetch ?? fetch;
    const rpc = options.rpc?.[reference.chainId];
    if (!rpc) {
        throw new Error(`No RPC configured for chain ID ${reference.chainId}`);
    }
    const uriValue = await metadataUri(reference, rpc, fetcher);
    const metadataPath = reference.kind === "erc1155"
        ? uriValue.replace("{id}", reference.tokenId.toString(16).padStart(64, "0"))
        : uriValue;
    let metadataUrl: URL;
    try {
        metadataUrl = new URL(metadataPath);
    } catch {
        throw new Error(`NFT metadata URI must be absolute: ${metadataPath}`);
    }
    const image = metadataImage(await readMetadata(metadataUrl, options));
    if (image.raw) {
        return new TextEncoder().encode(image.value).buffer;
    }
    const imageUrl = new URL(image.value, metadataUrl);
    return resolve(imageUrl, options);
};
