import { Buffer } from 'buffer'

import { closePeraWalletSignTxnToast } from './modal/peraWalletConnectModalUtils'
import { PeraWalletConnect } from './PeraWalletConnect'

if (typeof window !== 'undefined') {
    // The SDK no longer reads these, but earlier releases installed them and
    // dApps came to rely on them, so removing them is a breaking change.
    window.global = window
    window.Buffer = window.Buffer || Buffer

    // Registers the modal's custom elements. Loaded lazily so server-side
    // rendering never touches `customElements`.
    void import('./App')
}

export { PeraWalletConnect, closePeraWalletSignTxnToast }
export { type PeraWalletConnectOptions } from './PeraWalletConnect'
export {
    type PeraWalletConnectEvent,
    type PeraWalletConnectEventHandler,
    type PeraWalletConnectEventMap,
} from './util/events/SessionEventEmitter'
export {
    ScopeType,
    type PeraWalletArbitraryData,
    type PeraWalletArc60SignData,
    type PeraWalletArc60SignDataResponse,
    type PeraWalletArc60SignerResolution,
    type PeraWalletAlgodClients,
    type PeraWalletNetwork,
    type PeraWalletMultisigMetadata,
    type PeraWalletTransaction,
    type SignerTransaction,
    type SignMetadata,
    type Siwa,
} from './util/model/peraWalletModels'
export {
    PERA_PROVIDER_ERROR_CODES,
    getPeraProvider,
    isPeraProviderError,
    type PeraAccount,
    type PeraNetwork,
    type PeraProvider,
    type PeraProviderConnectOptions,
    type PeraProviderConnectResult,
    type PeraProviderError,
    type PeraProviderEvent,
    type PeraProviderWalletTransaction,
} from './transport/extension/peraProviderTypes'
