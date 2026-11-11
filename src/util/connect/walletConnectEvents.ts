import { type IWalletConnectSession } from '@perawallet/walletconnect'

// WalletConnect v1 passes `{ event, params: [{ message }] }` to `disconnect`
// handlers; anything else carries no reason.
function getWalletConnectEventMessage(payload: unknown): string | undefined {
    if (
        typeof payload !== 'object' ||
        payload === null ||
        !('params' in payload) ||
        !Array.isArray(payload.params)
    ) {
        return undefined
    }

    const [firstParam]: unknown[] = payload.params

    if (
        typeof firstParam === 'object' &&
        firstParam !== null &&
        'message' in firstParam &&
        typeof firstParam.message === 'string'
    ) {
        return firstParam.message
    }

    return undefined
}

interface ConnectorSessionIdentity {
    connected: boolean
    peerId: string
    key: string
}

// Same peer and key means the stored session is the one the connector holds;
// anything else (another tab connected again, the session was removed) is not.
function isConnectorForStoredSession(
    connector: ConnectorSessionIdentity,
    storedSession: IWalletConnectSession | null,
) {
    return (
        connector.connected &&
        storedSession !== null &&
        storedSession.peerId === connector.peerId &&
        storedSession.key === connector.key
    )
}

export { getWalletConnectEventMessage, isConnectorForStoredSession }
