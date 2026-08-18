export interface OssPostSignature {
  OSSAccessKeyId: string;
  policy: string;
  Signature: string;
}

export interface OssPutResult {
  url: string;
}

export interface OssClient {
  put(objectKey: string, buffer: Buffer): Promise<OssPutResult>;
  signatureUrl(objectKey: string, options: { expires: number }): string;
  calculatePostSignature(policy: object): OssPostSignature;
}

export interface OssClientOptions {
  region: string;
  accessKeyId: string;
  accessKeySecret: string;
  authorizationV4?: boolean;
  bucket: string;
}

export type OssClientConstructor = new (options: OssClientOptions) => OssClient;
