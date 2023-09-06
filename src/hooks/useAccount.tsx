import { useState, useEffect } from "react";
import { ethers } from "ethers";
import {
  PublicKey,
  SafeWebAuthnPluginAPI,
} from "@/account/SafeWebAuthnPluginAPI";
import {
  entryPointAddress,
  safeProxyFactoryAddress,
  safeSingletonAddress,
} from "@/constants";
import { useStore } from "@/store";
import SafeProxyFactory from "@/utils/ABIs/SafeProxyFactory.json";
import Safe from "@/utils/ABIs/Safe.json";
import SafeWebAuthnPluginArtifact from "@/utils/ABIs/SafeWebAuthnPlugin.json";

const useAccount = () => {
  const { provider, signer } = useStore();
  const [account, setAccount] = useState<SafeWebAuthnPluginAPI>();

  useEffect(() => {
    const publicKeyString = localStorage.getItem("publicKey");
    if (!publicKeyString) {
      return;
    }

    const safeWebAuthnPluginAddress = localStorage.getItem(
      "safeWebAuthnPluginAddress"
    );
    if (!safeWebAuthnPluginAddress) {
      return;
    }

    const parsedPublicKey = JSON.parse(publicKeyString);
    const publicKey: PublicKey = [parsedPublicKey[0], parsedPublicKey[1]];

    const safeProxyFactory = new ethers.ContractFactory(
      SafeProxyFactory.abi,
      SafeProxyFactory.bytecode,
      signer
    )
      .attach(safeProxyFactoryAddress)
      .connect(signer);

    const safeFactory = new ethers.ContractFactory(
      Safe.abi,
      Safe.bytecode,
      signer
    )
      .attach(safeSingletonAddress)
      .connect(signer);

    const safeWebAuthnPluginFactory = new ethers.ContractFactory(
      SafeWebAuthnPluginArtifact.abi,
      SafeWebAuthnPluginArtifact.bytecode,
      signer
    );

    const passkeyAccountAPI = new SafeWebAuthnPluginAPI({
      provider,
      entryPointAddress,
      safeProxyFactoryAddress,
      accountAddress: safeWebAuthnPluginAddress,
      owner: signer,
      publicKey,
      safeProxyFactory,
      safeFactory,
      safeWebAuthnPluginFactory,
    });

    setAccount(passkeyAccountAPI);
  }, [provider, signer]);

  return account;
};

export default useAccount;
