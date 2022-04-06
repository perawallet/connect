![Pera Wallet Logo](https://perawallet.s3.amazonaws.com/images/logo.svg)

### @perawallet/connect

JavaScript SDK for integrating [Pera Wallet](https://perawallet.app) to web applications.

[![](https://img.shields.io/npm/v/@perawallet/connect?style=flat-square)](https://www.npmjs.com/package/@perawallet/connect) [![](https://img.shields.io/bundlephobia/min/@perawallet/connect?style=flat-square)](https://www.npmjs.com/package/@perawallet/connect)

### Getting Started

[Try it out using CodeSandbox](#example-applications)

[Learn how to integrate with your JavaScript application](#guide)

### Example Applications

[Using React Hooks](https://codesandbox.io/s/perawallet-connect-react-demo-ib9tqt?file=/src/App.js)

[Using Vue3](https://codesandbox.io/s/perawallet-connect-vue-demo-m8q3sl?file=/src/App.vue)

### Guide

Let's start with installing `@perawallet/connect`

```
npm install --save @perawallet/connect
```

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

  async function handleConnectWalletClick() {
    const newAccounts = await peraWallet.connect();

    setAccountAddress(newAccounts[0]);
  }

  function handleDisconnectWalletClick() {
    peraWallet.disconnect();

    setAccountAddress(null);
  }
}
```
