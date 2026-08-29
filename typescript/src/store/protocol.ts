export type ImmutableResource = {
  key: string;
  contentHash?: {
    digest: string;
    algorithm: "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";
  };
};

export type ImmutableStore = {
  read: (resource: ImmutableResource) => Promise<ArrayBuffer | undefined>;
  write: (resource: ImmutableResource, body: ArrayBuffer) => Promise<void>;
};
