import {describe, it, expect, beforeAll, afterEach, vi} from "vitest";

// The custom element self-registers on import via App.ts in production; here we
// register it directly if not already defined.
import {PeraWalletModalDesktopMode} from "../PeraWalletConnectModalDesktopMode";
import {PERA_WALLET_EXTENSION_CONNECT_EVENT} from "../../../peraWalletConnectModalUtils";

beforeAll(() => {
  if (!customElements.get("pera-wallet-modal-desktop-mode")) {
    customElements.define("pera-wallet-modal-desktop-mode", PeraWalletModalDesktopMode);
  }
});

function renderModal(attributes: Record<string, string>) {
  const el = document.createElement("pera-wallet-modal-desktop-mode");

  el.setAttribute("uri", "wc:test");

  for (const [name, value] of Object.entries(attributes)) {
    el.setAttribute(name, value);
  }

  document.body.appendChild(el);

  return el;
}

function isActive(el: Element, id: string) {
  return el.shadowRoot
    ?.getElementById(id)
    ?.classList.contains("pera-wallet-accordion-item--active");
}

describe("desktop modal extension option", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders the extension item first and pre-selected when enabled", () => {
    const el = renderModal({"is-extension-enabled": "true"});

    const view = el.shadowRoot?.querySelector(
      ".pera-wallet-connect-modal-desktop-mode__default-view"
    );

    expect(view?.firstElementChild?.id).toBe("extension-wallet-option");
    expect(isActive(el, "extension-wallet-option")).toBe(true);
    expect(
      el.shadowRoot?.getElementById("pera-wallet-connect-extension-launch-button")
    ).toBeTruthy();
  });

  it("mirrors the web wallet layout (logo, description, launch button)", () => {
    const el = renderModal({"is-extension-enabled": "true"});

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

  it("dispatches a composed, bubbling connect event from the button click", () => {
    const el = renderModal({"is-extension-enabled": "true"});
    const listener = vi.fn();

    document.addEventListener(PERA_WALLET_EXTENSION_CONNECT_EVENT, listener);

    const button = el.shadowRoot?.getElementById(
      "pera-wallet-connect-extension-launch-button"
    ) as HTMLButtonElement;

    button.click();

    // Reaches document through the shadow root in the same synchronous task.
    expect(listener).toHaveBeenCalledTimes(1);

    document.removeEventListener(PERA_WALLET_EXTENSION_CONNECT_EVENT, listener);
  });

  it("collapses the other options when the extension is enabled", () => {
    const el = renderModal({"is-extension-enabled": "true", "promote-mobile": "true"});

    expect(isActive(el, "mobile-wallet-option")).toBe(false);
    expect(isActive(el, "web-wallet-option")).toBe(false);
  });

  it("does not render the extension option when it is not enabled", () => {
    const el = renderModal({});

    expect(el.shadowRoot?.getElementById("extension-wallet-option")).toBeFalsy();
    expect(
      el.shadowRoot?.getElementById("pera-wallet-connect-extension-launch-button")
    ).toBeFalsy();
    expect(isActive(el, "web-wallet-option")).toBe(true);
  });

  it("keeps the mobile option expanded by default when the extension is not enabled and mobile is promoted", () => {
    const el = renderModal({"promote-mobile": "true"});

    expect(isActive(el, "mobile-wallet-option")).toBe(true);
    expect(el.shadowRoot?.getElementById("extension-wallet-option")).toBeFalsy();
  });

  it("shows the NEW badge on the extension option", () => {
    const el = renderModal({
      "is-extension-enabled": "true",
      "should-display-new-badge": "true"
    });

    expect(el.shadowRoot?.getElementById("pera-extension-new-label")).toBeTruthy();
  });

  it("hides the NEW badge when should-display-new-badge is false", () => {
    const el = renderModal({
      "is-extension-enabled": "true",
      "should-display-new-badge": "false"
    });

    const label = el.shadowRoot?.getElementById("pera-extension-new-label");

    expect(label?.getAttribute("style")).toContain("display:none");
  });
});
