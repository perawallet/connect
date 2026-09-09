// eslint-disable-next-line import/no-unresolved
import {IWalletConnectSession} from "@perawallet/walletconnect";

import {PeraWalletDetails, PeraWalletPlatformType} from "../peraWalletTypes";
import {
  PERA_WALLET_LOCAL_STORAGE_KEYS,
  LEGACY_WALLETCONNECT_STORAGE_KEY
} from "./storageConstants";

function getLocalStorage() {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}

function saveWalletDetailsToStorage(
  accounts: string[],
  type?: "pera-wallet" | "pera-wallet-web" | "pera-wallet-extension"
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

function isSameAccountList(a: string[], b: string[]) {
  // Order-sensitive on purpose: both lists are written from the same
  // `connector.accounts` array at connect time.
  return a.length > 0 && a.length === b.length && a.every((account, i) => account === b[i]);
}

/**
 * One-time, best-effort migration of a Pera session persisted by earlier
 * versions under the WalletConnect v1 default key ("walletconnect"), which is
 * shared with every other WC v1 wallet on the same origin.
 *
 * The legacy value is MOVED to the namespaced key only when it is clearly ours:
 * the stored Pera wallet details are for the mobile wallet and their accounts
 * match the session's accounts exactly. Anything else is left untouched so a
 * co-installed wallet's session is never clobbered. Never throws.
 */
function migrateLegacyWalletConnectSession() {
  try {
    const storage = getLocalStorage();

    if (!storage) {
      return;
    }

    const legacyRaw = storage.getItem(LEGACY_WALLETCONNECT_STORAGE_KEY);

    if (!legacyRaw) {
      return;
    }

    const namespacedRaw = storage.getItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT);

    if (namespacedRaw) {
      // Already migrated. A byte-identical legacy copy can only be ours (the
      // session key, client and peer ids are random), left behind if a
      // previous run copied but failed to remove; finish the move.
      if (namespacedRaw === legacyRaw) {
        storage.removeItem(LEGACY_WALLETCONNECT_STORAGE_KEY);
      }

      return;
    }

    const walletDetails = getWalletDetailsFromStorage();

    if (walletDetails?.type !== "pera-wallet" || !Array.isArray(walletDetails.accounts)) {
      return;
    }

    const legacySession = JSON.parse(legacyRaw) as Partial<IWalletConnectSession> | null;

    if (
      typeof legacySession?.bridge !== "string" ||
      !legacySession.bridge ||
      !Array.isArray(legacySession.accounts) ||
      !isSameAccountList(legacySession.accounts, walletDetails.accounts)
    ) {
      return;
    }

    // Write the new key before removing the old one so a failure between the
    // two can only leave a stale copy (cleaned up on the next run above),
    // never lose the session.
    storage.setItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT, legacyRaw);
    storage.removeItem(LEGACY_WALLETCONNECT_STORAGE_KEY);
  } catch {
    // Migration must never break initialisation.
  }
}

function getWalletPlatformFromStorage() {
  const walletDetails = getWalletDetailsFromStorage();
  let walletType: PeraWalletPlatformType = null;

  if (walletDetails?.type === "pera-wallet") {
    walletType = "mobile";
  } else if (walletDetails?.type === "pera-wallet-web") {
    walletType = "web";
  } else if (walletDetails?.type === "pera-wallet-extension") {
    walletType = "extension";
  }

  return walletType;
}

export {
  getLocalStorage,
  saveWalletDetailsToStorage,
  resetWalletDetailsFromStorage,
  getWalletDetailsFromStorage,
  getWalletConnectObjectFromStorage,
  getWalletPlatformFromStorage,
  migrateLegacyWalletConnectSession
};
