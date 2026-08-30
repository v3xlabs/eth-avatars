const decodePercentEncoded = (value: string): Uint8Array => {
  const bytes: number[] = [];
  let text = "";
  const encoder = new TextEncoder();

  const appendText = (): void => {
    bytes.push(...encoder.encode(text));
    text = "";
  };

  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== "%") {
      text += value[index];
      continue;
    }

    const encoded = value.slice(index + 1, index + 3);

    if (!/^[\da-f]{2}$/i.test(encoded)) {
      throw new Error(`Invalid percent-encoding: ${value}`);
    }

    appendText();
    bytes.push(Number.parseInt(encoded, 16));
    index += 2;
  }

  appendText();

  return Uint8Array.from(bytes);
};

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const result = new ArrayBuffer(bytes.byteLength);

  new Uint8Array(result).set(bytes);

  return result;
};

export const fetchData = (path: URL): ArrayBuffer => {
  const match = /^data:([^,]+)?,(.*)$/s.exec(path.href);
  const metadata = match?.[1];
  const payload = match?.[2];

  if (payload === undefined) {
    throw new Error(`Unsupported data URL: ${path.href}`);
  }

  const bytes = decodePercentEncoded(payload);

  if (metadata?.split(";").includes("base64")) {
    const encoded = Array.from(bytes, byte => String.fromCodePoint(byte)).join("");

    return toArrayBuffer(Uint8Array.from(atob(encoded), character => character.codePointAt(0) ?? 0));
  }

  return toArrayBuffer(bytes);
};
