const PERA_WALLET_APP_DEEP_LINK = "perawallet-wc://";
const PERA_DOWNLOAD_URL = "https://perawallet.app/download/";

// Adding "MX" prefix (bytes [77, 88]) to the signature to be consistent with algosdk.verifyBytes function
// eslint-disable-next-line no-magic-numbers
const PERA_WALLET_SIGNATURE_PREFIX = [77, 88];

/**
 * WalletConnect v1 bridge used ONLY when https://wc.perawallet.app/config.json
 * cannot be fetched or lists no servers; config.json stays the source of truth.
 * A Pera-controlled DNS name, so it can be repointed at any bridge without an
 * SDK release. Replaces the public bridge.walletconnect.org fallback, which
 * WalletConnect retired in 2023 and which no longer resolves.
 */
const PERA_WALLET_CONNECT_FALLBACK_BRIDGE =
  "https://wallet-connect-fallback.perawallet.app";

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
  PERA_WALLET_CONNECT_FALLBACK_BRIDGE
};
