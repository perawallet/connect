import {describe, it, expect, afterEach} from "vitest";

import {getMetaInfo, getFavicons, waitForElementCreatedAtShadowDOM} from "../domUtils";

function addLink(rel: string, href: string) {
  const link = document.createElement("link");

  link.setAttribute("rel", rel);
  link.setAttribute("href", href);
  document.head.appendChild(link);
}

function addMeta(name: string, content: string) {
  const meta = document.createElement("meta");

  meta.setAttribute("name", name);
  meta.setAttribute("content", content);
  document.head.appendChild(meta);
}

describe("domUtils", () => {
  afterEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    document.title = "";
  });

  describe("getFavicons", () => {
    it("returns absolute http(s) icon hrefs unchanged", () => {
      addLink("icon", "https://cdn.example.com/icon.png");

      expect(getFavicons()).toContain("https://cdn.example.com/icon.png");
    });

    it("prefixes protocol-relative hrefs with the current protocol", () => {
      addLink("shortcut icon", "//cdn.example.com/icon.png");

      expect(getFavicons()).toContain(
        `${window.location.protocol}//cdn.example.com/icon.png`
      );
    });

    it("resolves root-relative hrefs against the current origin", () => {
      addLink("icon", "/assets/icon.png");

      expect(getFavicons()).toContain(
        `${window.location.protocol}//${window.location.host}/assets/icon.png`
      );
    });

    it("ignores non-icon link tags", () => {
      addLink("stylesheet", "/styles.css");

      expect(getFavicons()).toHaveLength(0);
    });
  });

  describe("getMetaInfo", () => {
    it("falls back to the document title and empty description", () => {
      document.title = "My dApp";

      const info = getMetaInfo();

      expect(info.title).toBe("My dApp");
      expect(info.description).toBe("");
      expect(info.url).toBe(window.location.origin);
    });

    it("prefers the name/description meta tags when present", () => {
      document.title = "Fallback";
      addMeta("name", "Meta Title");
      addMeta("description", "Meta description");

      const info = getMetaInfo();

      expect(info.title).toBe("Meta Title");
      expect(info.description).toBe("Meta description");
    });
  });

  describe("waitForElementCreatedAtShadowDOM", () => {
    it("resolves immediately when the element already exists in the shadow root", async () => {
      const host = document.createElement("div");
      const shadow = host.attachShadow({mode: "open"});
      const target = document.createElement("span");

      target.className = "ready";
      shadow.appendChild(target);
      document.body.appendChild(host);

      const resolved = await waitForElementCreatedAtShadowDOM(host, "ready");

      expect(resolved).toBe(target);
    });
  });
});
