const PERA_WALLET_APP_DEEP_LINK = "perawallet-wc://";
const PERA_DOWNLOAD_URL = "https://perawallet.app/download/";

// Adding "MX" prefix (bytes [77, 88]) to the signature to be consistent with algosdk.verifyBytes function
// eslint-disable-next-line no-magic-numbers
const PERA_WALLET_SIGNATURE_PREFIX = [77, 88];

/**
 * Pera-hosted WalletConnect v1 bridges, mirroring `servers` in
 * https://wc.perawallet.app/config.json. Used ONLY when that config cannot be
 * fetched or lists no servers; a fresh fetch is still the source of truth.
 * Replaces the public bridge.walletconnect.org fallback, which WalletConnect
 * retired in 2023 and which no longer resolves. Keep in sync with config.json
 * when servers are added or removed; peraWalletConstants.test.ts pins the list.
 */
const PERA_WALLET_CONNECT_FALLBACK_BRIDGES = [
  "https://wallet-connect-a.perawallet.app",
  "https://wallet-connect-b.perawallet.app",
  "https://wallet-connect-c.perawallet.app",
  "https://wallet-connect-d.perawallet.app",
  "https://wallet-connect-e.perawallet.app",
  "https://wallet-connect-f.perawallet.app",
  "https://wallet-connect-g.perawallet.app",
  "https://wallet-connect-h.perawallet.app"
];

export interface PeraWebWalletURLs {
  ROOT: string;
  CONNECT: string;
  TRANSACTION_SIGN: string;
}

function getPeraWebWalletURL(webWalletURL: string): PeraWebWalletURLs {
  return {
    ROOT: `https://${webWalletURL}`,
    CONNECT: `https://${webWalletURL}/connect`,
    TRANSACTION_SIGN: `https://${webWalletURL}/transaction/sign`
  };
}

export {
  PERA_WALLET_APP_DEEP_LINK,
  getPeraWebWalletURL,
  PERA_DOWNLOAD_URL,
  PERA_WALLET_SIGNATURE_PREFIX,
  PERA_WALLET_CONNECT_FALLBACK_BRIDGES
};
