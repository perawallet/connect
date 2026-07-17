import {
  Arc0027Method,
  Arc0027RequestEnvelope,
  Arc0027ResponseEnvelope,
  DiscoverResult,
  ARC0027_ERROR_CODES,
  buildReference
} from "./arc0027Types";

// eslint-disable-next-line no-magic-numbers
const DEFAULT_DISCOVER_TIMEOUT = 300;
// The extension shows its own approval popup; match its 120s ceiling.
// eslint-disable-next-line no-magic-numbers
const DEFAULT_REQUEST_TIMEOUT = 120_000;

export class Arc0027RequestError extends Error {
  code: number;

  constructor(code: number, message: string) {
    super(message);
    this.name = "Arc0027RequestError";
    this.code = code;
  }
}

function generateRequestId(): string {
  // No crypto.randomUUID dependency assumption; unique enough for correlation.
  // eslint-disable-next-line no-magic-numbers
  return `pera-connect-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export class Arc0027Client {
  private target: Window;

  constructor(target: Window = window) {
    this.target = target;
  }

  discover(timeoutMs = DEFAULT_DISCOVER_TIMEOUT): Promise<DiscoverResult | null> {
    return this.request("discover", {}, timeoutMs)
      .then((result) => result as unknown as DiscoverResult)
      .catch(() => null);
  }

  request(
    method: Arc0027Method,
    params: Record<string, unknown>,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT
  ): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const id = generateRequestId();
      const envelope: Arc0027RequestEnvelope = {
        id,
        reference: buildReference(method, "request"),
        params
      };

      // Use a shared state object so cleanup, onMessage, and the timeout can
      // all reference each other without forward-declaration issues.
      const state: {
        timer: ReturnType<typeof setTimeout> | undefined;
        onMessage: ((e: MessageEvent) => void) | undefined;
      } = {timer: undefined, onMessage: undefined};

      const cleanup = () => {
        if (state.onMessage) {
          window.removeEventListener("message", state.onMessage);
        }
        clearTimeout(state.timer);
      };

      state.onMessage = (event: MessageEvent) => {
        const data = event.data as Arc0027ResponseEnvelope | undefined;

        if (!data || typeof data !== "object") return;
        if (data.requestId !== id) return;
        if (typeof data.reference !== "string" || !data.reference.endsWith(":response")) {
          return;
        }

        cleanup();

        if (data.error) {
          reject(new Arc0027RequestError(data.error.code, data.error.message));

          return;
        }

        resolve(data.result ?? {});
      };

      window.addEventListener("message", state.onMessage);

      state.timer = setTimeout(() => {
        cleanup();
        reject(
          new Arc0027RequestError(
            ARC0027_ERROR_CODES.MethodTimedOutError,
            `ARC-0027 ${method} request timed out`
          )
        );
      }, timeoutMs);

      this.target.postMessage(envelope, "*");
    });
  }
}
