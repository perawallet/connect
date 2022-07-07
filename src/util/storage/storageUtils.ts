import {PeraWalletDetails} from "../peraWalletTypes";
import {PERA_WALLET_LOCAL_STORAGE_KEYS} from "./storageConstants";

function saveWalletDetailsToStorage(
  accounts: string[],
  type?: "pera-wallet" | "pera-wallet-web"
) {
  localStorage.setItem(
    PERA_WALLET_LOCAL_STORAGE_KEYS.WALLET,
    JSON.stringify({
      type: type || "pera-wallet",
      accounts,
      selectedAccount: accounts[0]
    })
  );
}

function getWalletDetailsFromStorage(): PeraWalletDetails | null {
  const storedWalletDetails = localStorage.getItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLET);

  if (storedWalletDetails) {
    return JSON.parse(storedWalletDetails) as PeraWalletDetails;
  }

  return null;
}

function resetWalletDetailsFromStorage() {
  localStorage.removeItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT);
  localStorage.removeItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLET);
  localStorage.removeItem(PERA_WALLET_LOCAL_STORAGE_KEYS.BRIDGE_URL);
}

export {
  saveWalletDetailsToStorage,
  resetWalletDetailsFromStorage,
  getWalletDetailsFromStorage
};
