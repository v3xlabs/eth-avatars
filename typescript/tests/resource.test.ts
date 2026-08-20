import { describe, expect, it } from "vitest";
import { avatar } from "../src/index.js";

describe("data URL resource examples", () => {
    it("loads a percent-encoded image data URL", async () => {
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" />';
        const path = new URL(`data:image/svg+xml,${encodeURIComponent(svg)}`);

        const resource = await avatar.resource(path);

        expect(new TextDecoder().decode(resource)).toBe(svg);
    });
});

describe("IPFS resource loads", () => {
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
