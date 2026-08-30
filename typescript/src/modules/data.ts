export const fetchData = (path: URL): ArrayBuffer => {
  const match = /^data:([^,]+)?,(.*)$/s.exec(path.href);
  const metadata = match?.[1];
  const payload = match?.[2];

  if (payload === undefined) {
    throw new Error(`Unsupported data URL: ${path.href}`);
  }

  if (metadata?.split(";").includes("base64")) {
    return Uint8Array.from(atob(decodeURIComponent(payload)), character => character.codePointAt(0) ?? 0).buffer;
  }

  return new TextEncoder().encode(decodeURIComponent(payload)).buffer;
};
