"use client";
import { useEffect, useState } from "react";
import { ethers } from "ethers";

import { createCredential } from "@/utils/webauthn";
import { getPublicKey } from "@/utils/getPublicKey";
import { entryPointAddress } from "@/constants";
import SafeWebAuthnPluginArtifact from "@/utils/ABIs/SafeWebAuthnPlugin.json";
import { useStore } from "@/store";

interface CreateAccountProps {
  setAccountCreated: (accountCreated: boolean) => void;
}

const CreateAccount = ({ setAccountCreated }: CreateAccountProps) => {
  const { signer } = useStore();
  const [isComptabible, setIsComptabible] = useState(false);

  useEffect(() => {
    checkDeviceCompatibility();
  }, []);

  const checkDeviceCompatibility = async () => {
    if (window.PublicKeyCredential) {
      Promise.all([
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(),
        PublicKeyCredential.isConditionalMediationAvailable(),
      ]).then((results) => {
        if (results.every((r) => r === true)) {
          setIsComptabible(true);
        }
      });
    }

    setIsComptabible(false);
    // Show toast message
  };

  const createPasskey = async () => {
    // Registration flow:
    // TODO: 1. go to SERVER and generate registration options
    // TODO: 2. await navigator.credentials.create via the CLIENT and return PublicKeyCredential response
    // TODO: 3. verify registration on the SERVER

    // Authentication flow:
    // TODO: 4. generate authentication options on the SERVER
    // TODO: 5. authenticate the user via the CLIENT (navigator.credentials.get)
    // TODO: 6. verify authentication on the SERVER

    // Questions:
    // 1. do I need to generate the registration options on the server (smart contracts in our case)?
    // 2. do I need to verify the registration on the server (smart contracts in our case)?
    // 3. do I need to generate authentication options on the server (smart contracts in our case)?

    const credential = await createCredential();

    if (!credential) {
      console.log("Credential creation failed");
      return;
    }

    const authenticatorAttestationResponse =
      credential.response as AuthenticatorAttestationResponse;

    const attestationObject =
      authenticatorAttestationResponse.attestationObject;
    const pubKey = getPublicKey(attestationObject);

    if (!pubKey) {
      console.log("Cannot retrieve public key from the credential");
      return;
    }

    const safeWebAuthnPluginFactory = new ethers.ContractFactory(
      SafeWebAuthnPluginArtifact.abi,
      SafeWebAuthnPluginArtifact.bytecode,
      signer
    );

    const safeWebAuthnPlugin = await safeWebAuthnPluginFactory.deploy(
      entryPointAddress,
      pubKey
    );
    const safeWebAuthnPluginAddress = safeWebAuthnPlugin.address;

    // public key and randomly generated credential ID is sent to the server for storage
    localStorage.setItem(
      "safeWebAuthnPluginAddress",
      safeWebAuthnPluginAddress
    );
    localStorage.setItem("credentialId", credential.id);
    localStorage.setItem("publicKey", JSON.stringify(pubKey));
    setAccountCreated(true);
  };

  return (
    <div className="flex flex-col mt-4 p-4 backdrop-blur-md bg-white/10 rounded-xl">
      <p>Create an account</p>
      {isComptabible ? (
        <button
          className="bg-emerald-400 hover:bg-emerald-500 text-white font-bold py-2 px-4 my-4 rounded-lg"
          type="button"
          onClick={createPasskey}
        >
          Create Account
        </button>
      ) : (
        <button
          className="bg-slate-500 text-white font-bold py-2 px-4 rounded"
          type="button"
          disabled
        >
          Create Account
        </button>
      )}
    </div>
  );
};

export default CreateAccount;
