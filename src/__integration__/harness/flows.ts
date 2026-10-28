import { type PeraWalletConnect } from '../../index.js'
import { type FakePeraMobile } from './fakePeraMobile.js'
import { waitFor } from './flush.js'
import {
    getConnectModal,
    getConnectModalUri,
    getExtensionConnectButton,
} from './modalDom.js'
import { clickAsUser } from './userActivation.js'

// Whole user journeys reused as the "arrange" step of later flows.

/**
 * connect() up to the modal being on screen. A test may leave the call
 * pending: the environment closes any modal left open after each test, which
 * settles it and removes its listeners, so the rejection is pre-handled here.
 */
async function openConnectModal(
    pera: PeraWalletConnect,
    options?: Parameters<PeraWalletConnect['connect']>[0],
) {
    const connecting = pera.connect(options)

    connecting.catch(() => undefined)
    await waitFor(getConnectModal)

    // Wrapped: an async function returning the promise would adopt it.
    return { connecting }
}

/** connect() → the user scans the modal's QR code with Pera and approves. */
async function connectWithPeraMobile(
    pera: PeraWalletConnect,
    mobile: FakePeraMobile,
) {
    const { connecting } = await openConnectModal(pera)

    mobile.scanQrCode(getConnectModalUri())

    return connecting
}

/** connect() → the user clicks "Connect with Extension" in the modal. */
async function connectWithPeraExtension(pera: PeraWalletConnect) {
    const { connecting } = await openConnectModal(pera)

    clickAsUser(getExtensionConnectButton())

    return connecting
}

export { connectWithPeraExtension, connectWithPeraMobile, openConnectModal }
