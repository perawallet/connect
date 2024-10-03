// eslint-disable-next-line import/no-unresolved

import {
  PeraWalletDetails,
  PeraWalletNetwork,
  PeraWalletPlatformType
} from "../peraWalletTypes";
import {PERA_WALLET_LOCAL_STORAGE_KEYS} from "./storageConstants";

function getLocalStorage() {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}

function saveWalletDetailsToStorage(
  accounts: string[],
  type: "pera-wallet" | "pera-wallet-web",
  chainId?: string
) {
  getLocalStorage()?.setItem(
    PERA_WALLET_LOCAL_STORAGE_KEYS.WALLET,
    JSON.stringify({
      type: type || "pera-wallet",
      accounts,
      selectedAccount: accounts[0],
      chainId,
      version: "2.0"
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
  return new Promise<undefined>((resolve, reject) => {
    try {
      getLocalStorage()?.removeItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLET);
      getLocalStorage()?.removeItem(PERA_WALLET_LOCAL_STORAGE_KEYS.NETWORK);
      resolve(undefined);
    } catch (error) {
      reject(error);
    }
  });
}

function getWalletPlatformFromStorage() {
  const walletDetails = getWalletDetailsFromStorage();
  let walletType: PeraWalletPlatformType = null;

  if (walletDetails?.type === "pera-wallet") {
    walletType = "mobile";
  } else if (walletDetails?.type === "pera-wallet-web") {
    walletType = "web";
  }

  return walletType;
}

export {
  getLocalStorage,
  saveWalletDetailsToStorage,
  resetWalletDetailsFromStorage,
  getWalletDetailsFromStorage,
  getNetworkFromStorage,
  getWalletPlatformFromStorage
};
