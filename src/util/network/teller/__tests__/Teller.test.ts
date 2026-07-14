import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";

import Teller from "../Teller";

interface TestMessage {
  type: string;
}

const CHANNEL = "test-channel";

function dispatchMessage(data: unknown) {
  window.dispatchEvent(new MessageEvent("message", {data}));
}

describe("Teller", () => {
  let teller: Teller<TestMessage>;

  beforeEach(() => {
    teller = new Teller<TestMessage>({channel: CHANNEL});
  });

  afterEach(() => {
    teller.close();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("setupListener", () => {
    it("invokes the callback for messages on the matching channel", () => {
      const onReceiveMessage = vi.fn();

      teller.setupListener({onReceiveMessage});
      dispatchMessage({channel: CHANNEL, message: {type: "HELLO"}});

      expect(onReceiveMessage).toHaveBeenCalledTimes(1);
    });

    it("ignores messages on a different channel", () => {
      const onReceiveMessage = vi.fn();

      teller.setupListener({onReceiveMessage});
      dispatchMessage({channel: "other-channel", message: {type: "HELLO"}});

      expect(onReceiveMessage).not.toHaveBeenCalled();
    });

    it("ignores non-object message data", () => {
      const onReceiveMessage = vi.fn();

      teller.setupListener({onReceiveMessage});
      dispatchMessage("not-an-object");

      expect(onReceiveMessage).not.toHaveBeenCalled();
    });

    it("replaces a previous listener so the callback only fires once", () => {
      const first = vi.fn();
      const second = vi.fn();

      teller.setupListener({onReceiveMessage: first});
      teller.setupListener({onReceiveMessage: second});
      dispatchMessage({channel: CHANNEL, message: {type: "HELLO"}});

      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);
    });
  });

  describe("close", () => {
    it("stops the listener from receiving further messages", () => {
      const onReceiveMessage = vi.fn();

      teller.setupListener({onReceiveMessage});
      teller.close();
      dispatchMessage({channel: CHANNEL, message: {type: "HELLO"}});

      expect(onReceiveMessage).not.toHaveBeenCalled();
    });
  });

  describe("sendMessage", () => {
    it("posts a channel-wrapped message to the target window after the timeout", () => {
      vi.useFakeTimers();

      const postMessage = vi.fn();
      const targetWindow = {postMessage} as unknown as Window;

      teller.sendMessage({
        message: {type: "PING"},
        targetWindow,
        origin: "https://example.com",
        timeout: 500
      });

      expect(postMessage).not.toHaveBeenCalled();

      vi.advanceTimersByTime(500);

      expect(postMessage).toHaveBeenCalledWith(
        {channel: CHANNEL, message: {type: "PING"}},
        {targetOrigin: "https://example.com"}
      );
    });

    it("falls back to a wildcard target origin when none is given", () => {
      vi.useFakeTimers();

      const postMessage = vi.fn();
      const targetWindow = {postMessage} as unknown as Window;

      teller.sendMessage({message: {type: "PING"}, targetWindow, timeout: 0});
      vi.advanceTimersByTime(0);

      expect(postMessage).toHaveBeenCalledWith(expect.anything(), {targetOrigin: "*"});
    });
  });
});
