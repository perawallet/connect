![Pera Wallet Logo](https://perawallet.s3.amazonaws.com/images/logo.svg)

### @perawallet/connect

JavaScript SDK for integrating [Pera Wallet](https://perawallet.app) to web applications.

[![](https://img.shields.io/npm/v/@perawallet/connect?style=flat-square)](https://www.npmjs.com/package/@perawallet/connect) [![](https://img.shields.io/bundlephobia/min/@perawallet/connect?style=flat-square)](https://www.npmjs.com/package/@perawallet/connect)

### Getting Started

[Try it out using CodeSandbox](#example-applications)

[Learn how to integrate with your JavaScript application](#guide)

[Learn how to Sign Transactions](#sign-transaction)

### Example Applications

[Using React Hooks](https://codesandbox.io/s/perawallet-connect-react-demo-ib9tqt?file=/src/App.js)

[Using Vue3](https://codesandbox.io/s/perawallet-connect-vue-demo-m8q3sl?file=/src/App.vue)

### Guide

Let's start with installing `@perawallet/connect`

```
npm install --save @perawallet/connect
```

<details>
  <summary>Using with React 18</summary><br/>
  
  When you want to use `@perawallet/connect` library with React 18, you need to make some changes. After creating a new app with `npx create-react-app my-app`, the following changes should be made.

1. Firstly, you need to install this packages.

```sh
  npm install buffer,
  npm install crypto-browserify
  npm install process
  npm install react-app-rewired
  npm install stream-browserify
```

2. After that we need to override some webpack features. Create the following file in the root part of the project and copy the following code block into it.

`config-overrides.js`

```jsx
// eslint-disable-next-line @typescript-eslint/no-var-requires
const webpack = require("webpack");

module.exports = function override(config) {
  const fallback = config.resolve.fallback || {};

  Object.assign(fallback, {
    crypto: require.resolve("crypto-browserify"),
    stream: require.resolve("stream-browserify")
  });
  config.resolve.fallback = fallback;
  // ignore warning about source map of perawallet/connect

  config.ignoreWarnings = [/Failed to parse source map/];
  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
      process: "process/browser",
      Buffer: ["buffer", "Buffer"]
    })
  ]);
  return config;
};
```

3. Finally, we need to change the npm scripts.

`{ "start": "react-app-rewired start", "build": "react-app-rewired build" }`

After that, you are good to go! 🎊

</details>

#### Using React Hooks

```typescript
import {PeraWalletConnect} from "@perawallet/connect";

// Create the PeraWalletConnect instance outside of the component
const peraWallet = new PeraWalletConnect();

function App() {
  const [accountAddress, setAccountAddress] = useState<string | null>(null);
  const isConnectedToPeraWallet = !!accountAddress;

  useEffect(() => {
    // Reconnect to the session when the component is mounted
    peraWallet.reconnectSession().then((accounts) => {
      // Setup the disconnect event listener
      peraWallet.connector?.on("disconnect", handleDisconnectWalletClick);

      if (accounts.length) {
        setAccountAddress(accounts[0]);
      }
    });
  }, []);

  return (
    <button
      onClick={
        isConnectedToPeraWallet ? handleDisconnectWalletClick : handleConnectWalletClick
      }>
      {isConnectedToPeraWallet ? "Disconnect" : "Connect to Pera Wallet"}
    </button>
  );

  function handleConnectWalletClick() {
    peraWallet
      .connect()
      .then((newAccounts) => {
        // Setup the disconnect event listener
        peraWallet.connector?.on("disconnect", handleDisconnectWalletClick);

        setAccountAddress(newAccounts[0]);
      })
      .reject((error) => {
        // You MUST handle the reject because once the user closes the modal, peraWallet.connect() promise will be rejected.
        // For the async/await syntax you MUST use try/catch
        if (error?.data?.type !== "CONNECT_MODAL_CLOSED") {
          // log the necessary errors
        }
      });
  }

  function handleDisconnectWalletClick() {
    peraWallet.disconnect();

    setAccountAddress(null);
  }
}
```

### Sign Transaction

`@perawallet/connect` also allows signing transactions using the Pera Wallet application. Once the `signTransaction` method is triggered if the user is on a mobile browser, the Pera Wallet app will be launched automatically, if the browser blocks the redirection there's also a popup that links to the Pera Wallet app.

`@perawallet/connect` guides users with a toast message when the `signTransaction` is triggered. It's enabled by default but in some cases, you may not need to the toast message (e.g. you already have signing guidance for users). There's a configuration called `shouldShowSignTxnToast` to disable it, see the example below:

```js
const peraWallet = new PeraWalletConnect({shouldShowSignTxnToast: false});
```

`signTransaction` accepts `SignerTransaction[][]` the type can be found [here](./src/util/model/peraWalletModels.ts)

**To see more details & working examples please [visit here](https://codesandbox.io/s/txns-demo-pj3nf2)**

```javascript
// Setting up algosdk client
const algod = new algosdk.Algodv2("", "https://node.testnet.algoexplorerapi.io/", 443);

// Setting up Transactions
const suggestedParams = await algod.getTransactionParams().do();
const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
  from: FROM_ADDRESS,
  to: FROM_ADDRESS,
  assetIndex: ASSET_ID,
  amount: 0,
  suggestedParams
});
const optInTxn2 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
  from: FROM_ADDRESS,
  to: FROM_ADDRESS,
  assetIndex: ASSET_ID,
  amount: 0,
  suggestedParams
});

// Mapping `Transaction` to `SignerTransaction[]`
const singleTxnGroups = [{txn: optInTxn, signers: [FROM_ADDRESS]}];
const multipleTxnGroups = [
  {txn: optInTxn, signers: [FROM_ADDRESS]},
  {txn: optInTxn2, signers: [FROM_ADDRESS]}
];

// Single Transaction
try {
  const signedTxn = await peraWallet.signTransaction([singleTxnGroups]);
} catch (error) {
  console.log("Couldn't sign Opt-in txns", error);
}

// Group Transaction
try {
  const signedTxns = await peraWallet.signTransaction([multipleTxnGroups]);
} catch (error) {
  console.log("Couldn't sign Opt-in txns", error);
}
```

### Your app name on Pera Wallet

By default, the connect wallet drawer on Pera Wallet gets the app name from `document.title`.

In some cases, you may want to customize it. You can achieve this by adding a meta tag to your HTML between the `head` tag.

```html
<meta name="name" content="My dApp" />
```
