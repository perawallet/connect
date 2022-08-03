const peraWalletConnectModalTemplate = document.createElement("template");

peraWalletConnectModalTemplate.innerHTML = `<div class="pera-wallet-connect-modal">
<div class="pera-wallet-connect-modal__body">
  <div class="pera-wallet-connect-modal__body__header">
    <button
      class ="pera-wallet-connect-button pera-wallet-connect-modal__close-button"
      onclick=onClose>
      <img src={isSmallScreen ? CloseIconDark : CloseIcon} />
    </button>
  </div>

  {isSmallScreen ? (
    <PeraWalletConnectModalTouchScreenMode uri={uri} />
  ) : (
    <PeraWalletConnectModalDesktopMode uri={uri} />
  )}
</div>
</div>`;
