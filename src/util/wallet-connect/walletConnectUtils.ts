import {SessionTypes} from "@walletconnect/types";

function formatWalletConnectSessionResponse(session: SessionTypes.Struct) {
  const {namespaces} = session;
  const accounts = Object.values(namespaces)
    .map((namespace) => namespace.accounts)
    .flat();
  const [namespace, reference, _address] = accounts[0].split(":");
  const accountsArray: string[] = accounts.map((account) => {
    const [_namespace, _reference, address] = account.split(":");

    return address;
  });
  // Make sure the accounts are sorted and unique
  const accountsSet = [...new Set(accountsArray)].sort();

  return {
    reference,
    namespace,
    accounts: accountsSet
  };
}

export {formatWalletConnectSessionResponse};
