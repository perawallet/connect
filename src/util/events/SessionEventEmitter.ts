import { type PeraNetwork } from '../../transport/extension/peraProviderTypes.js'

type PeraWalletConnectEventMap = {
    /** The session ended from the wallet side (for example the user revoked the site). */
    disconnect: undefined
    /** The wallet switched network (extension only). */
    networkChanged: { network: PeraNetwork }
}

type PeraWalletConnectEvent = keyof PeraWalletConnectEventMap

type PeraWalletConnectEventHandler<E extends PeraWalletConnectEvent> = (
    payload: PeraWalletConnectEventMap[E],
) => void

type HandlerSets = {
    [E in PeraWalletConnectEvent]: Set<PeraWalletConnectEventHandler<E>>
}

class SessionEventEmitter {
    private handlers: HandlerSets = {
        disconnect: new Set(),
        networkChanged: new Set(),
    }

    on<E extends PeraWalletConnectEvent>(
        event: E,
        handler: PeraWalletConnectEventHandler<E>,
    ): () => void {
        const handlers = this.handlers[event] as Set<
            PeraWalletConnectEventHandler<E>
        >

        handlers.add(handler)

        return () => {
            handlers.delete(handler)
        }
    }

    emit<E extends PeraWalletConnectEvent>(
        event: E,
        payload: PeraWalletConnectEventMap[E],
    ) {
        const handlers = this.handlers[event] as Set<
            PeraWalletConnectEventHandler<E>
        >

        handlers.forEach(handler => {
            try {
                handler(payload)
            } catch {
                // A faulty listener must not break the others or the SDK.
            }
        })
    }

    clear() {
        Object.values(this.handlers).forEach(handlers => handlers.clear())
    }
}

export {
    SessionEventEmitter,
    type PeraWalletConnectEvent,
    type PeraWalletConnectEventHandler,
    type PeraWalletConnectEventMap,
}
