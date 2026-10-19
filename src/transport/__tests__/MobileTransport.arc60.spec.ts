import { describe, it, expect, vi } from 'vitest'
import algosdk from 'algosdk'

import { MobileTransport } from '../MobileTransport.js'
import { ScopeType } from '../../util/model/peraWalletModels.js'

function makeTransport(connector: unknown) {
    return new MobileTransport({
        connector: connector as any,
        shouldShowSignTxnToast: false,
        isInWebview: false,
        getSilent: () => Promise.resolve(true),
    })
}

describe('MobileTransport.signArc60Data with a scheme', () => {
    it("sends a Falcon request's scheme and base64 key, and returns them as asked", async () => {
        const connector = {
            sendCustomRequest: vi
                .fn()
                .mockResolvedValue([Buffer.from([9, 9]).toString('base64')]),
            accounts: [algosdk.generateAccount().addr.toString()],
        }
        const payload = {
            data: Buffer.from([1, 2]).toString('base64'),
            signer: new Uint8Array(1793).fill(5),
            domain: 'example.com',
            authenticatorData: new Uint8Array(37),
            scheme: 'falcon-1024-det',
        }

        const response = await makeTransport(connector).signArc60Data(payload, {
            scope: ScopeType.AUTH,
            encoding: 'base64',
        })

        const [request] = connector.sendCustomRequest.mock.calls[0]

        expect(request.params.signer).toBe(
            Buffer.from(payload.signer).toString('base64'),
        )
        expect(request.params.scheme).toBe('falcon-1024-det')
        expect(response.signer).toEqual(payload.signer)
        expect(response.scheme).toBe('falcon-1024-det')
    })
})
