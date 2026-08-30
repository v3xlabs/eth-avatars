import { AbiFunction, Provider, RpcTransport } from "ox";
import { describe, expect, it, vi } from "vitest";

import { avatar, decodedResource } from "../src/index.js";
import { immutableStore, memoryImmutableStore } from "../src/store.js";

describe("data URL resource examples", () => {
  it("loads a percent-encoded image data URL", async () => {
    const svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1\" height=\"1\" />";
    const path = new URL(`data:image/svg+xml,${encodeURIComponent(svg)}`);

    const resource = await avatar.resource(path);

    expect(new TextDecoder().decode(resource)).toBe(svg);
  });

  it("supports custom resource resolvers", async () => {
    const resource = await avatar.resource(new URL("custom://avatar"), {
      resourceResolvers: [async (path) => {
        if (path.protocol !== "custom:") {
          return undefined;
        }

        return new TextEncoder().encode("custom").buffer;
      }],
    });

    expect(new TextDecoder().decode(resource)).toBe("custom");
  });

  it("supports decoders that continue resolving resources", async () => {
    const resource = await avatar.resource(new URL("encoded://avatar"), {
      fetch: async () => new Response("decoded"),
      resourceResolvers: [async (path) => {
        if (path.protocol !== "encoded:") {
          return undefined;
        }

        return decodedResource(new URL("https://example.test/avatar"), body =>
          new TextEncoder().encode(
            new TextDecoder().decode(body)
              .toUpperCase(),
          ).buffer);
      }],
    });

    expect(new TextDecoder().decode(resource)).toBe("DECODED");
  });
});

describe.concurrent("IPFS resource loads", () => {
  it("loads an IPFS resource", async () => {
    const path = new URL("ipfs://QmXRMBA1S2em4AoUbZrNY1jcxuhzCWaE494RqSDKfmF3in");

    const resource = await avatar.resource(path);

    expect(new TextDecoder().decode(resource)).toBe("This is a test IPFS file\n");
  });

  it("loads an IPNS resource", async () => {
    const path = new URL("ipns://k51qzi5uqu5dlqrwk8qxlcub59kixfot46yd601kig9rryihjj1vosf2fa4702");

    const resource = await avatar.resource(path);

    expect(new TextDecoder().decode(resource)).toBe("This is a test IPFS file\n");
  });
});

describe("immutable resource storage", () => {
  it("caches IPFS content by its identity instead of gateway cache headers", async () => {
    const fetcher = vi.fn(async () => new Response("immutable"));
    const options = {
      fetch: fetcher,
      immutableStore: memoryImmutableStore(),
      ipfsGateway: new URL("https://ipfs.example/"),
    };
    const path = new URL("ipfs://QmXRMBA1S2em4AoUbZrNY1jcxuhzCWaE494RqSDKfmF3in");

    await avatar.resource(path, options);
    const resource = await avatar.resource(path, options);

    expect(new TextDecoder().decode(resource)).toBe("immutable");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("never caches IPNS through the immutable store", async () => {
    const fetcher = vi.fn(async () => new Response("mutable", {
      headers: { "Cache-Control": "max-age=60" },
    }));
    const options = {
      fetch: fetcher,
      immutableStore: memoryImmutableStore(),
      ipfsGateway: new URL("https://ipfs.example/"),
    };
    const path = new URL("ipns://example-name/avatar.png");

    await avatar.resource(path, options);
    await avatar.resource(path, options);

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("caches bzz content by its bzz identity instead of gateway cache headers", async () => {
    const fetcher = vi.fn(async () => new Response("swarm"));
    const options = {
      fetch: fetcher,
      immutableStore: memoryImmutableStore(),
      swarmGateway: new URL("https://swarm.example/"),
    };
    const path = new URL("bzz://aabbcc/file.png");

    await avatar.resource(path, options);
    const resource = await avatar.resource(path, options);

    expect(new TextDecoder().decode(resource)).toBe("swarm");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("reads composed stores in order", async () => {
    const first = memoryImmutableStore();
    const second = memoryImmutableStore();
    const resource = { key: "bzz:reference:/" };

    await second.write(resource, new TextEncoder().encode("second").buffer);

    const store = immutableStore(first, second);

    expect(new TextDecoder().decode(await store.read(resource))).toBe("second");
  });
});

describe("Swarm resource loads", () => {
  it("rewrites a bzz URI through the configured gateway", async () => {
    const fetcher = vi.fn(async () => new Response("swarm"));
    const path = new URL("bzz://aabbcc/file.png");

    const resource = await avatar.resource(path, {
      fetch: fetcher,
      swarmGateway: new URL("https://swarm.example/"),
    });

    expect(new TextDecoder().decode(resource)).toBe("swarm");
    expect(fetcher).toHaveBeenCalledWith(
      new URL("https://swarm.example/bzz/aabbcc/file.png"),
      expect.any(Object),
    );
  });
});

describe("NFT resource loads", () => {
  it("returns the configured default for an unresolved NFT reference", async () => {
    const tokenUri = AbiFunction.from("function tokenURI(uint256) returns (string)");
    const metadataUri = "data:application/json,%7B%22image%22%3A%22eip155%3A1%2Ferc721%3A0x0000000000000000000000000000000000000001%2F1%22%7D";
    const provider = Provider.from({
      request: async ({ method }) => {
        if (method !== "eth_call") {
          throw new Error(`Unexpected provider method: ${method}`);
        }

        return AbiFunction.encodeResult(tokenUri, metadataUri);
      },
    });
    const fallback = new Uint8Array([1, 2, 3]).buffer;
    const path = new URL("eip155:1/erc721:0x0000000000000000000000000000000000000001/1");

    const resource = await avatar.resource(path, { provider, default: fallback });

    expect(resource).toBe(fallback);
    await expect(avatar.resource(path, { provider })).resolves.toBeUndefined();
  });

  it("loads an NFT resource", async () => {
    const path = new URL("eip155:1/erc721:0x25ed58c027921e14d86380ea2646e3a1b5c55a8b/7828");

    const resource = await avatar.resource(path, {
      ipfsGateway: new URL("https://eu.orbitor.dev/"),
      provider: Provider.from(RpcTransport.fromHttp("https://eth.drpc.org")),
    });

    expect(resource?.byteLength).toBeGreaterThan(0);
  }, 10_000);
});
