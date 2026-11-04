import { PeraWalletConnectError } from '../PeraWalletConnectError.js'
import { waitForTabOpening } from '../dom/domUtils.js'
import {
    type PeraWalletArbitraryData,
    type PeraWalletTransaction,
} from '../model/peraWalletModels.js'
import {
    appTellerManager,
    type PeraTeller,
} from '../network/teller/appTellerManager.js'
import { getPeraWebWalletURL } from '../peraWalletConstants.js'
import { type RunSignTransactionFlowParams } from './signTransactionFlowModels.js'
import { newTabSignTransactionFlowTellerReducer } from './signTransactionFlowReducers.js'

function runWebSignTransactionFlow({
    method,
    signTxnRequestParams,
    signer,
    chainId,
    webWalletURL,
    resolve,
    reject,
}: RunSignTransactionFlowParams) {
    const webWalletURLs = getPeraWebWalletURL(webWalletURL)

    void runNewTabSignFlow()

    async function runNewTabSignFlow() {
        try {
            const newPeraWalletTab = await waitForTabOpening(
                webWalletURLs.TRANSACTION_SIGN,
            )

            if (newPeraWalletTab) {
                let message

                if (method === 'SIGN_TXN') {
                    message = {
                        type: 'SIGN_TXN',
                        txn: signTxnRequestParams as PeraWalletTransaction[],
                    } as const
                } else if (method === 'SIGN_DATA' && signer && chainId) {
                    message = {
                        type: 'SIGN_DATA',
                        data: signTxnRequestParams as PeraWalletArbitraryData[],

                        signer,
                        chainId,
                    } as const
                }

                if (message) {
                    appTellerManager.sendMessage({
                        message,

                        origin: webWalletURLs.TRANSACTION_SIGN,
                        targetWindow: newPeraWalletTab,
                    })
                }
            }

            const checkTabIsAliveInterval = setInterval(() => {
                if (newPeraWalletTab?.closed === true) {
                    reject(
                        new PeraWalletConnectError(
                            {
                                type: `${method}_CANCELLED`,
                            },
                            'Transaction signing is cancelled by user.',
                        ),
                    )

                    clearInterval(checkTabIsAliveInterval)
                }
            }, 2000)

            appTellerManager.setupListener({
                origin: webWalletURLs.TRANSACTION_SIGN,
                source: newPeraWalletTab,
                onReceiveMessage: (
                    event: MessageEvent<TellerMessage<PeraTeller>>,
                ) =>
                    newTabSignTransactionFlowTellerReducer({
                        event,
                        newPeraWalletTab,
                        method,
                        resolve,
                        reject,
                    }),
            })
        } catch (error) {
            reject(error)
        }
    }
}

export { runWebSignTransactionFlow }
