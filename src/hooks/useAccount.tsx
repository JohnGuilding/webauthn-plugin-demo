import { useState, useEffect } from "react";
import { PasskeyAccountAPI } from "@/account/PasskeyAccountAPI";
import {
  secp256r1VerifierAddress,
  entryPointAddress,
  passkeyAccountFactoryAddress,
  webAuthnRelayingParty,
} from "@/constants";
import { useStore } from "@/store";

const useAccount = () => {
  const { provider, signer } = useStore();
  const [account, setAccount] = useState<PasskeyAccountAPI>();

  useEffect(() => {
    const publicKey = localStorage.getItem("publicKey");
    if (!publicKey) {
      return;
    }

    const parsedPublicKey = JSON.parse(publicKey);
    const q = {
      q0: parsedPublicKey[0],
      q1: parsedPublicKey[1],
    };

    const passkeyAccountAPI = new PasskeyAccountAPI({
      provider,
      entryPointAddress,
      factoryAddress: passkeyAccountFactoryAddress,
      owner: signer,
      ec: secp256r1VerifierAddress,
      q,
      // webAuthnRelayingParty,
    });

    setAccount(passkeyAccountAPI);
  }, [provider, signer]);

  return account;
};

export default useAccount;
