import {
  PERA_WALLET_MODAL_CLASSNAME,
  PERA_WALLET_SIGN_TXN_MODAL_ID
} from "../peraWalletConnectModalUtils";
import styles from "./_pera-wallet-sign-txn-modal.scss";

const peraWalletSignTxnModal = document.createElement("template");

peraWalletSignTxnModal.innerHTML = `
  <div class="${PERA_WALLET_MODAL_CLASSNAME} pera-wallet-sign-txn-modal">
    <div class="pera-wallet-modal__body">
      <pera-wallet-modal-header modal-id="${PERA_WALLET_SIGN_TXN_MODAL_ID}"></pera-wallet-modal-header/>

      <div class="pera-wallet-sign-txn-modal__body__content" />
    </div>
  </div>
`;

export class PeraWalletSignTxnModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});

    if (this.shadowRoot) {
      const styleSheet = document.createElement("style");

      styleSheet.textContent = styles;

      this.shadowRoot.append(peraWalletSignTxnModal.content.cloneNode(true), styleSheet);
    }
  }
}
