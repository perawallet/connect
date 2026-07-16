import {describe, it, expect, beforeAll, afterEach, vi} from "vitest";

// The custom element self-registers on import via App.ts in production; here we
// register it directly if not already defined.
import {PeraWalletModalDesktopMode} from "../PeraWalletConnectModalDesktopMode";

beforeAll(() => {
  if (!customElements.get("pera-wallet-modal-desktop-mode")) {
    customElements.define("pera-wallet-modal-desktop-mode", PeraWalletModalDesktopMode);
  }
});

function renderModal(attributes: Record<string, string>) {
  const el = document.createElement("pera-wallet-modal-desktop-mode");

  el.setAttribute("uri", "wc:test");
  el.setAttribute("is-extension-enabled", "true");

  for (const [name, value] of Object.entries(attributes)) {
    el.setAttribute(name, value);
  }

  document.body.appendChild(el);

  return el;
}

describe("desktop modal extension option", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders the extension accordion item pre-selected when the extension is available", () => {
    const el = renderModal({
      "is-extension-available": "true",
      "extension-name": "Pera Extension"
    });

    const option = el.shadowRoot?.getElementById("extension-wallet-option");

    expect(option).toBeTruthy();
    expect(option?.classList.contains("pera-wallet-accordion-item--active")).toBe(true);
    expect(
      el.shadowRoot?.getElementById("pera-wallet-connect-extension-launch-button")
    ).toBeTruthy();
    expect(
      el.shadowRoot?.getElementById("pera-wallet-connect-extension-install-link")
    ).toBeFalsy();
  });

  it("mirrors the web wallet layout (logo, description, launch button)", () => {
    const el = renderModal({"is-extension-available": "true"});

    const option = el.shadowRoot?.getElementById("extension-wallet-option");

    expect(
      option?.querySelector(
        ".pera-wallet-connect-modal-desktop-mode__web-wallet__logo-wrapper"
      )
    ).toBeTruthy();
    expect(
      option?.querySelector(
        ".pera-wallet-connect-modal-desktop-mode__web-wallet__description"
      )
    ).toBeTruthy();
    expect(
      option?.querySelector(
        ".pera-wallet-connect-modal-desktop-mode__web-wallet__launch-button"
      )
    ).toBeTruthy();
  });

  it("invokes window.onExtensionConnect when the extension button is clicked", () => {
    // @ts-ignore
    window.onExtensionConnect = vi.fn();
    const el = renderModal({"is-extension-available": "true"});

    const button = el.shadowRoot?.getElementById(
      "pera-wallet-connect-extension-launch-button"
    ) as HTMLButtonElement;

    button?.click();

    // @ts-ignore
    expect(window.onExtensionConnect).toHaveBeenCalled();
  });

  it("still renders the extension item collapsed with an install link when unavailable", () => {
    const el = renderModal({});

    const option = el.shadowRoot?.getElementById("extension-wallet-option");
    const installLink = el.shadowRoot?.getElementById(
      "pera-wallet-connect-extension-install-link"
    ) as HTMLAnchorElement;

    expect(option).toBeTruthy();
    expect(option?.classList.contains("pera-wallet-accordion-item--active")).toBe(
      false
    );
    expect(installLink).toBeTruthy();
    expect(installLink.href).toContain("chromewebstore.google.com");
    expect(
      el.shadowRoot?.getElementById("pera-wallet-connect-extension-launch-button")
    ).toBeFalsy();
  });

  it("keeps the mobile option expanded by default when the extension is unavailable and mobile is promoted", () => {
    const el = renderModal({"promote-mobile": "true"});

    expect(
      el.shadowRoot
        ?.getElementById("mobile-wallet-option")
        ?.classList.contains("pera-wallet-accordion-item--active")
    ).toBe(true);
    expect(
      el.shadowRoot
        ?.getElementById("extension-wallet-option")
        ?.classList.contains("pera-wallet-accordion-item--active")
    ).toBe(false);
  });

  it("collapses the other options when the extension is available", () => {
    const el = renderModal({
      "is-extension-available": "true",
      "promote-mobile": "true"
    });

    expect(
      el.shadowRoot
        ?.getElementById("mobile-wallet-option")
        ?.classList.contains("pera-wallet-accordion-item--active")
    ).toBe(false);
    expect(
      el.shadowRoot
        ?.getElementById("web-wallet-option")
        ?.classList.contains("pera-wallet-accordion-item--active")
    ).toBe(false);
  });

  it("shows the NEW badge on the extension option instead of the web option", () => {
    const el = renderModal({"should-display-new-badge": "true"});

    expect(el.shadowRoot?.getElementById("pera-extension-new-label")).toBeTruthy();
    expect(el.shadowRoot?.getElementById("pera-web-new-label")).toBeFalsy();
  });

  it("does not render the extension option at all when extension support is disabled", () => {
    const el = document.createElement("pera-wallet-modal-desktop-mode");

    el.setAttribute("uri", "wc:test");
    document.body.appendChild(el);

    expect(el.shadowRoot?.getElementById("extension-wallet-option")).toBeFalsy();
    expect(
      el.shadowRoot
        ?.getElementById("web-wallet-option")
        ?.classList.contains("pera-wallet-accordion-item--active")
    ).toBe(true);
  });

  it("hides the NEW badge when should-display-new-badge is false", () => {
    const el = renderModal({"should-display-new-badge": "false"});

    const label = el.shadowRoot?.getElementById("pera-extension-new-label");

    expect(label?.getAttribute("style")).toContain("display:none");
  });
});
