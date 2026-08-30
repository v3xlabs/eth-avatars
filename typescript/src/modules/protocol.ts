export type StorageResource = {
  key: string;
  contentHash?: {
    digest: string;
    algorithm: "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";
  };
};

export type Storage = {
  read: (resource: StorageResource) => Promise<ArrayBuffer | undefined>;
  write: (resource: StorageResource, body: ArrayBuffer) => Promise<void>;
};
