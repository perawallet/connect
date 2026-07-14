import {describe, it, expect, vi, afterEach} from "vitest";

import {
  detectPlatform,
  isMobileMethodAvailable,
  callMobileMethodWithResponse
} from "../webviewBridge";

type MutableWindow = typeof window & {
  peraMobileInterface?: {handleRequest?: (message: string) => void};
  webkit?: {messageHandlers?: {handleRequest?: {postMessage: (message: string) => void}}};
};

const testWindow = window as MutableWindow;

function setAndroidInterface() {
  const handleRequest = vi.fn();

  testWindow.peraMobileInterface = {handleRequest};

  return handleRequest;
}

function setIosInterface() {
  const postMessage = vi.fn();

  testWindow.webkit = {messageHandlers: {handleRequest: {postMessage}}};

  return postMessage;
}

function respond(data: unknown) {
  window.dispatchEvent(new MessageEvent("message", {data}));
}

describe("webviewBridge", () => {
  afterEach(() => {
    delete testWindow.peraMobileInterface;
    delete testWindow.webkit;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("detectPlatform", () => {
    it("returns 'unknown' when no mobile interface is present", () => {
      expect(detectPlatform()).toBe("unknown");
    });

    it("returns 'android' when the Android interface is present", () => {
      setAndroidInterface();

      expect(detectPlatform()).toBe("android");
    });

    it("returns 'ios' when the iOS message handlers are present", () => {
      setIosInterface();

      expect(detectPlatform()).toBe("ios");
    });
  });

  describe("isMobileMethodAvailable", () => {
    it("is true when the Android handleRequest exists", () => {
      setAndroidInterface();

      expect(isMobileMethodAvailable()).toBe(true);
    });

    it("is true when the iOS postMessage handler exists", () => {
      setIosInterface();

      expect(isMobileMethodAvailable()).toBe(true);
    });

    it("is false when no interface is present", () => {
      expect(isMobileMethodAvailable()).toBe(false);
    });
  });

  describe("callMobileMethodWithResponse", () => {
    it("sends a JSON-RPC 2.0 request through the Android interface", () => {
      const handleRequest = setAndroidInterface();

      callMobileMethodWithResponse("getPublicSettings", 5000, {foo: "bar"});

      expect(handleRequest).toHaveBeenCalledTimes(1);

      const sent = JSON.parse(handleRequest.mock.calls[0][0]);

      expect(sent).toMatchObject({
        jsonrpc: "2.0",
        method: "getPublicSettings",
        params: {foo: "bar"}
      });
      expect(typeof sent.id).toBe("number");
    });

    it("resolves with an object result matched by request id", async () => {
      const handleRequest = setAndroidInterface();
      const promise = callMobileMethodWithResponse<{theme: string}>("getPublicSettings");
      const {id} = JSON.parse(handleRequest.mock.calls[0][0]);

      respond({jsonrpc: "2.0", id, result: {theme: "dark"}});

      await expect(promise).resolves.toEqual({theme: "dark"});
    });

    it("decodes a base64-encoded JSON result", async () => {
      const handleRequest = setAndroidInterface();
      const promise = callMobileMethodWithResponse<{network: string}>("getPublicSettings");
      const {id} = JSON.parse(handleRequest.mock.calls[0][0]);

      const encoded = window.btoa(JSON.stringify({network: "mainnet"}));

      // Responses can arrive as a JSON string too, exercising the parse branch.
      respond(JSON.stringify({jsonrpc: "2.0", id, result: encoded}));

      await expect(promise).resolves.toEqual({network: "mainnet"});
    });

    it("rejects with a JSON-RPC error response", async () => {
      const handleRequest = setAndroidInterface();
      const promise = callMobileMethodWithResponse("getPublicSettings");
      const {id} = JSON.parse(handleRequest.mock.calls[0][0]);

      respond({
        jsonrpc: "2.0",
        id,
        error: {code: -32601, message: "Method not found"}
      });

      await expect(promise).rejects.toMatchObject({
        name: "JsonRpcError",
        code: -32601
      });
    });

    it("rejects after the timeout when no response arrives", async () => {
      vi.useFakeTimers();
      setAndroidInterface();

      const promise = callMobileMethodWithResponse("getPublicSettings", 1000);
      const assertion = expect(promise).rejects.toThrow(/Timeout waiting for response/);

      await vi.advanceTimersByTimeAsync(1000);
      await assertion;
    });

    it("ignores responses whose id does not match a pending request", async () => {
      vi.useFakeTimers();
      const handleRequest = setAndroidInterface();

      const promise = callMobileMethodWithResponse("getPublicSettings", 1000);
      const {id} = JSON.parse(handleRequest.mock.calls[0][0]);

      // Wrong id -> should be dropped, and the request should still time out.
      respond({jsonrpc: "2.0", id: id + 999, result: {theme: "light"}});

      const assertion = expect(promise).rejects.toThrow(/Timeout/);

      await vi.advanceTimersByTimeAsync(1000);
      await assertion;
    });
  });
});
