"use client";
import { useEffect, useState } from "react";

import { createCredential } from "@/utils/webauthn";
import { getPublicKey } from "@/utils/getPublicKey";

interface CreateAccountProps {
  setAccountCreated: (accountCreated: boolean) => void;
}

const CreateAccount = ({ setAccountCreated }: CreateAccountProps) => {
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

    // public key and randomly generated credential ID is sent to the server for storage
    localStorage.setItem("credentialId", credential.id);
    localStorage.setItem("publicKey", JSON.stringify(pubKey));
    console.log("Created");
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
          Create Passkey
        </button>
      )}
    </div>
  );
};

export default CreateAccount;
