import {PERA_WALLET_LOCAL_STORAGE_KEYS} from "./storageConstants";

function saveWalletDetailsToStorage(accounts: string[]) {
  localStorage.setItem(
    PERA_WALLET_LOCAL_STORAGE_KEYS.WALLET,
    JSON.stringify({
      type: "pera-wallet",
      accounts,
      selectedAccount: accounts[0]
    })
  );
}

function resetWalletDetailsFromStorage() {
  localStorage.removeItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT);
  localStorage.removeItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLET);
  localStorage.removeItem(PERA_WALLET_LOCAL_STORAGE_KEYS.BRIDGE_URL);
}

export {saveWalletDetailsToStorage, resetWalletDetailsFromStorage};
