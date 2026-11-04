import { PeraWalletConnect } from '@perawallet/connect'

// Exposed so specs can drive the SDK the way a dApp's own code would.
declare global {
    interface Window {
        PeraWalletConnect: typeof PeraWalletConnect
    }
}

window.PeraWalletConnect = PeraWalletConnect
document.body.dataset.ready = 'true'
