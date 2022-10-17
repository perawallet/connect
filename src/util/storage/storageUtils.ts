import {PeraWalletDetails, PeraWalletNetwork} from "../peraWalletTypes";
import {PERA_WALLET_LOCAL_STORAGE_KEYS} from "./storageConstants";

function getLocalStorage() {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}

function saveWalletDetailsToStorage(
  accounts: string[],
  type?: "pera-wallet" | "pera-wallet-web"
) {
  getLocalStorage()?.setItem(
    PERA_WALLET_LOCAL_STORAGE_KEYS.WALLET,
    JSON.stringify({
      type: type || "pera-wallet",
      accounts,
      selectedAccount: accounts[0]
    })
  );
}

function getWalletDetailsFromStorage(): PeraWalletDetails | null {
  const storedWalletDetails = getLocalStorage()?.getItem(
    PERA_WALLET_LOCAL_STORAGE_KEYS.WALLET
  );

  if (storedWalletDetails) {
    return JSON.parse(storedWalletDetails) as PeraWalletDetails;
  }

  return null;
}

function getNetworkFromStorage(): PeraWalletNetwork {
  const storedNetwork = getLocalStorage()?.getItem(
    PERA_WALLET_LOCAL_STORAGE_KEYS.NETWORK
  ) as PeraWalletNetwork;

  return storedNetwork || "mainnet";
}

function resetWalletDetailsFromStorage() {
  getLocalStorage()?.removeItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT);
  getLocalStorage()?.removeItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLET);
  getLocalStorage()?.removeItem(PERA_WALLET_LOCAL_STORAGE_KEYS.BRIDGE_URL);
  getLocalStorage()?.removeItem(PERA_WALLET_LOCAL_STORAGE_KEYS.NETWORK);
}

export {
  getLocalStorage,
  saveWalletDetailsToStorage,
  resetWalletDetailsFromStorage,
  getWalletDetailsFromStorage,
  getNetworkFromStorage
};
