// eslint-disable-next-line import/no-unresolved
import {IWalletConnectSession} from "@walletconnect/types";

import {PeraWalletDetails, PeraWalletPlatformType} from "../peraWalletTypes";
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

function getWalletConnectObjectFromStorage(): IWalletConnectSession | null {
  const storedWalletConnectObject = getLocalStorage()?.getItem(
    PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT
  );

  if (storedWalletConnectObject) {
    return JSON.parse(storedWalletConnectObject) as IWalletConnectSession;
  }

  return null;
}

function resetWalletDetailsFromStorage() {
  return new Promise<undefined>((resolve, reject) => {
    try {
      getLocalStorage()?.removeItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT);
      getLocalStorage()?.removeItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLET);
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
  getWalletConnectObjectFromStorage,
  getWalletPlatformFromStorage
};
