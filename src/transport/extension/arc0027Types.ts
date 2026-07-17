export type Arc0027Method =
  | "discover"
  | "enable"
  | "disable"
  | "sign_transactions"
  | "post_transactions"
  | "sign_and_post_transactions"
  | "sign_message";

export interface Arc0027RequestEnvelope {
  id: string;
  reference: string;
  params?: Record<string, unknown>;
}

export interface Arc0027ResponseEnvelope {
  id: string;
  requestId: string;
  reference: string;
  result?: Record<string, unknown>;
  error?: {code: number; message: string; data?: unknown};
}

export interface DiscoverResult {
  providerId: string;
  name: string;
  // The extension router builds `iconUrl`; arc0027-types references `icon`.
  // Tolerate both until the extension side is confirmed (see spec §11).
  icon?: string;
  iconUrl?: string;
  networks: {genesisId: string; genesisHash: string}[];
}

export const ARC0027_ERROR_CODES = {
  UnknownError: 4000,
  MethodCanceledError: 4001,
  MethodTimedOutError: 4002,
  MethodNotSupportedError: 4003,
  NetworkNotSupportedError: 4004,
  UnauthorizedSignerError: 4100,
  InvalidInputError: 4200
} as const;

export function buildReference(method: Arc0027Method, kind: "request" | "response") {
  return `arc0027:${method}:${kind}`;
}
