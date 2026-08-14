import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";

import {PeraWalletRedirectModal} from "../PeraWalletRedirectModal";
import {openDeepLinkInCurrentTab} from "../../../util/dom/domUtils";
import {
  PERA_WALLET_REDIRECT_MODAL_ID,
  openPeraWalletRedirectModal
} from "../../peraWalletConnectModalUtils";

vi.mock("../../../util/dom/domUtils", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  openDeepLinkInCurrentTab: vi.fn()
}));

vi.mock("../../../util/device/deviceUtils", () => ({
  detectBrowser: () => "Chrome",
  isAndroid: () => false,
  isIOS: () => true,
  isMobile: () => true
}));

const EXPECTED_DEEP_LINK = "perawallet-wc://?browser=Chrome";

if (!window.customElements.get("pera-wallet-redirect-modal")) {
  window.customElements.define("pera-wallet-redirect-modal", PeraWalletRedirectModal);
}

function renderRedirectModal() {
  openPeraWalletRedirectModal();

  return document.getElementById(PERA_WALLET_REDIRECT_MODAL_ID);
}

function setPageVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: state
  });

  document.dispatchEvent(new Event("visibilitychange"));
}

describe("PeraWalletRedirectModal", () => {
  let windowOpenSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(null);
  });

  afterEach(() => {
    document.body.innerHTML = "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (document as any).visibilityState;
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("wakes Pera by navigating the current tab, never by opening a new one", () => {
    renderRedirectModal();

    expect(openDeepLinkInCurrentTab).toHaveBeenCalledWith(EXPECTED_DEEP_LINK);
    expect(windowOpenSpy).not.toHaveBeenCalled();
  });

  it("keeps the fallback modal on screen after triggering the launch", () => {
    const wrapper = renderRedirectModal();

    expect(wrapper).not.toBeNull();
    expect(document.getElementById(PERA_WALLET_REDIRECT_MODAL_ID)).not.toBeNull();
  });

  it("closes once the page is hidden, meaning the app actually launched", () => {
    renderRedirectModal();

    setPageVisibility("hidden");

    expect(document.getElementById(PERA_WALLET_REDIRECT_MODAL_ID)).toBeNull();
  });

  it("stays open while the page remains visible", () => {
    renderRedirectModal();

    setPageVisibility("visible");

    expect(document.getElementById(PERA_WALLET_REDIRECT_MODAL_ID)).not.toBeNull();
  });

  it("launches via the current tab when the manual button is tapped", () => {
    const wrapper = renderRedirectModal();

    const launchLink = wrapper
      ?.querySelector("pera-wallet-redirect-modal")
      ?.shadowRoot?.getElementById("pera-wallet-redirect-modal-launch-pera-link");

    vi.mocked(openDeepLinkInCurrentTab).mockClear();

    launchLink?.click();

    expect(openDeepLinkInCurrentTab).toHaveBeenCalledWith(EXPECTED_DEEP_LINK);
    expect(windowOpenSpy).not.toHaveBeenCalled();
    expect(document.getElementById(PERA_WALLET_REDIRECT_MODAL_ID)).not.toBeNull();
  });

  it("stops watching page visibility after it is removed from the DOM", () => {
    const removeListenerSpy = vi.spyOn(document, "removeEventListener");

    const wrapper = renderRedirectModal();

    wrapper?.remove();

    expect(removeListenerSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function)
    );
  });
});
