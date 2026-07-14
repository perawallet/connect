import {describe, it, expect, vi, afterEach} from "vitest";

import fetcher from "../fetcher";

describe("fetcher", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("resolves with the parsed JSON body", async () => {
    const payload = {foo: "bar"};
    const json = vi.fn(() => Promise.resolve(payload));
    const fetchMock = vi.fn(() => Promise.resolve({json} as unknown as Response));

    vi.stubGlobal("fetch", fetchMock);

    const result = await fetcher<typeof payload>("https://api.example.com/data");

    expect(result).toEqual(payload);
    expect(json).toHaveBeenCalledTimes(1);
  });

  it("passes the url and config through to fetch, defaulting config to {}", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({json: () => Promise.resolve({})} as unknown as Response)
    );

    vi.stubGlobal("fetch", fetchMock);

    await fetcher("https://api.example.com/a");
    expect(fetchMock).toHaveBeenLastCalledWith("https://api.example.com/a", {});

    const config = {method: "POST", body: "{}"};

    await fetcher("https://api.example.com/b", config);
    expect(fetchMock).toHaveBeenLastCalledWith("https://api.example.com/b", config);
  });
});
