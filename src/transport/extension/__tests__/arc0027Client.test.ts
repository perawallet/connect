import {describe, it, expect, afterEach, vi} from "vitest";

import {Arc0027Client, Arc0027RequestError} from "../arc0027Client";
import {buildReference} from "../arc0027Types";

// Auto-responder: listens for a posted request and replies with a matching
// response envelope whose requestId correlates to the request id.
function autoRespond(makeResult: (req: any) => object) {
  const handler = (event: MessageEvent) => {
    const req = event.data;

    if (typeof req?.reference !== "string" || !req.reference.endsWith(":request")) {
      return;
    }
    const method = req.reference.split(":")[1];

    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          id: "resp-id",
          requestId: req.id,
          reference: buildReference(method, "response"),
          ...makeResult(req)
        }
      })
    );
  };

  window.addEventListener("message", handler);

  return () => window.removeEventListener("message", handler);
}

describe("Arc0027Client", () => {
  afterEach(() => vi.useRealTimers());

  it("discover resolves the provider info on a matching response", async () => {
    const stop = autoRespond(() => ({
      result: {providerId: "pera-wallet", name: "Pera Wallet", networks: []}
    }));

    const client = new Arc0027Client(window);
    const info = await client.discover(500);

    expect(info?.providerId).toBe("pera-wallet");
    stop();
  });

  it("discover resolves null on timeout when nothing responds", async () => {
    const client = new Arc0027Client(window);

    await expect(client.discover(20)).resolves.toBeNull();
  });

  it("ignores responses whose requestId does not correlate", async () => {
    const handler = (event: MessageEvent) => {
      if (event.data?.reference?.endsWith(":request")) {
        window.dispatchEvent(
          new MessageEvent("message", {
            data: {
              id: "x",
              requestId: "SOMETHING-ELSE",
              reference: buildReference("enable", "response"),
              result: {accounts: []}
            }
          })
        );
      }
    };

    window.addEventListener("message", handler);

    const client = new Arc0027Client(window);

    await expect(client.request("enable", {}, 20)).rejects.toBeInstanceOf(
      Arc0027RequestError
    );
    window.removeEventListener("message", handler);
  });

  it("rejects with an Arc0027RequestError carrying the error code", async () => {
    const stop = autoRespond(() => ({
      error: {code: 4001, message: "User canceled"}
    }));

    const client = new Arc0027Client(window);

    await expect(client.request("enable", {})).rejects.toMatchObject({
      code: 4001,
      message: "User canceled"
    });
    stop();
  });
});
