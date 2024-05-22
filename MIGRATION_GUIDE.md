# Migration Guide for Pera Wallet v2

Pera Connect is upgrading to Wallet Connect v2. This update introduces some breaking changes. Please follow the steps below to ensure a seamless transition.


### 1. Initializing PeraWalletConnect Instance

In the new version, you must pass a `projectId` when creating an instance of `PeraWalletConnect`. You can obtain your projectId from Wallet Connect. For more details, please refer to this link.

```js
const peraWallet = new PeraWalletConnect({projectId: <YOUR_PROJECT_ID>});
```


### 2. Updating Event Listeners

The event listener functions have been updated. For example, the event for disconnection has changed from "disconnect" to "session_delete".

##### v1

```js
peraWallet.connector?.on("disconnect", () => {
      // handle disconnect
});
```

##### v2

```js
peraWallet.client?.on("session_delete", () => {
      // handle session delete
});
```

Please make these changes to ensure your implementation continues to function correctly with the latest version of the SDK. If you have any questions or encounter issues, refer to the detailed documentation or contact support.