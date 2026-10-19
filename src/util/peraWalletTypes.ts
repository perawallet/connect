type PeraWalletType =
    | 'pera-wallet'
    | 'pera-wallet-web'
    | 'pera-wallet-extension'
type PeraWalletPlatformType = 'mobile' | 'web' | 'extension' | null

type AlgorandChainIDs = 416_001 | 416_002 | 416_003 | 4160

interface PeraWalletDetails {
    type: PeraWalletType
    accounts: string[]
    selectedAccount: string
}

export type {
    PeraWalletType,
    PeraWalletPlatformType,
    PeraWalletDetails,
    AlgorandChainIDs,
}
