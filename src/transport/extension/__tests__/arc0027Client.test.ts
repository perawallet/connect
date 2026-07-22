import {describe, it, expect, afterEach, vi} from "vitest";

import {Arc0027Client, Arc0027RequestError} from "../arc0027Client";
import {buildReference, ARC0027_ERROR_CODES} from "../arc0027Types";

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

  it("correlates concurrent requests to their own responses by requestId", async () => {
    const stop = autoRespond((req) => ({
      result: {echo: (req.params as {value: string}).value}
    }));

    const client = new Arc0027Client(window);

    const [a, b] = await Promise.all([
      client.request("sign_transactions", {value: "A"}),
      client.request("sign_message", {value: "B"})
    ]);

    expect(a.echo).toBe("A");
    expect(b.echo).toBe("B");
    stop();
  });

  it("removes its message listener once the request settles", async () => {
    const stop = autoRespond(() => ({result: {}}));
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const client = new Arc0027Client(window);

    await client.request("enable", {});

    const addedHandler = addSpy.mock.calls.find((call) => call[0] === "message")?.[1];
    const removedHandler = removeSpy.mock.calls.find(
      (call) => call[0] === "message"
    )?.[1];

    expect(addedHandler).toBeInstanceOf(Function);
    expect(removedHandler).toBe(addedHandler);
    stop();
  });

  it("ignores malformed or unrelated messages instead of settling early", async () => {
    let capturedRequestId: string | undefined;
    const captureId = (event: MessageEvent) => {
      const req = event.data;

      if (typeof req?.reference === "string" && req.reference.endsWith(":request")) {
        capturedRequestId = req.id;
      }
    };

    window.addEventListener("message", captureId);

    const client = new Arc0027Client(window);
    // eslint-disable-next-line no-magic-numbers
    const pending = client.request("enable", {}, 50);

    // window.postMessage delivers the outgoing request's "message" event
    // asynchronously; wait a tick so captureId sees it before we craft a
    // same-id response.
    await new Promise((resolve) => setTimeout(resolve, 0));

    window.dispatchEvent(new MessageEvent("message", {data: null}));
    window.dispatchEvent(new MessageEvent("message", {data: "just a string"}));
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {requestId: "unrelated-id", reference: buildReference("enable", "response")}
      })
    );
    // Same requestId as the real request, but a reference that isn't a
    // ":response" — must not be mistaken for the real answer.
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {requestId: capturedRequestId, reference: "arc0027:enable:request"}
      })
    );

    window.removeEventListener("message", captureId);

    // None of the noise above should resolve/reject the pending request; it
    // should still time out on its own.
    await expect(pending).rejects.toMatchObject({
      code: ARC0027_ERROR_CODES.MethodTimedOutError
    });
  });
});
