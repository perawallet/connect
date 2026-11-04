import {
    PERA_WALLET_CONNECT_MODAL_ID,
    removeModalWrapperFromDOM,
} from '../../modal/peraWalletConnectModalUtils.js'
import { PeraWalletConnectError } from '../PeraWalletConnectError.js'
import { getMetaInfo, waitForTabOpening } from '../dom/domUtils.js'
import {
    appTellerManager,
    type PeraTeller,
} from '../network/teller/appTellerManager.js'
import { getPeraWebWalletURL } from '../peraWalletConstants.js'
import { type RunWebConnectFlowTypes } from './connectFlowModels.js'
import { newTabConnectFlowTellerReducer } from './connectFlowReducers.js'

function runWebConnectFlow({
    webWalletURL,
    chainId,
    resolve,
    reject,
}: RunWebConnectFlowTypes) {
    const webWalletURLs = getPeraWebWalletURL(webWalletURL)

    return runNewTabWebConnectFlow

    async function runNewTabWebConnectFlow() {
        try {
            const newPeraWalletTab = await waitForTabOpening(
                webWalletURLs.CONNECT,
            )

            if (newPeraWalletTab) {
                appTellerManager.sendMessage({
                    message: {
                        type: 'CONNECT',
                        data: {
                            ...getMetaInfo(),
                            chainId,
                        },
                    },

                    origin: webWalletURLs.CONNECT,
                    targetWindow: newPeraWalletTab,
                })
            }

            const checkTabIsAliveInterval = setInterval(() => {
                if (newPeraWalletTab?.closed === true) {
                    reject(
                        new PeraWalletConnectError(
                            {
                                type: 'CONNECT_CANCELLED',
                            },
                            'Connect is cancelled by user',
                        ),
                    )

                    clearInterval(checkTabIsAliveInterval)
                    closeWebConnectFlow()
                }
            }, 2000)

            appTellerManager.setupListener({
                origin: webWalletURLs.CONNECT,
                source: newPeraWalletTab,
                onReceiveMessage: (
                    event: MessageEvent<TellerMessage<PeraTeller>>,
                ) =>
                    newTabConnectFlowTellerReducer({
                        event,
                        newPeraWalletTab,
                        resolve,
                        reject,
                    }),
            })
        } catch (error) {
            closeWebConnectFlow()

            reject(error)
        }
    }

    function closeWebConnectFlow() {
        removeModalWrapperFromDOM(PERA_WALLET_CONNECT_MODAL_ID)
    }
}

export { runWebConnectFlow }
