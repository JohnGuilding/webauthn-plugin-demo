"use client";
import { useEffect, useState } from "react";

import { createCredential } from "@/utils/webauthn";
import { getPublicKey } from "@/utils/getPublicKey";

const CreatePasskey = () => {
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

    localStorage.setItem("public_key", JSON.stringify(pubKey));
    localStorage.setItem("credential_id", credential.id);
    console.log("Created");
  };

  return (
    <div className="flex flex-col mt-4">
      <p>Create a passkey for signing ethereum transactions</p>
      {isComptabible ? (
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          type="button"
          onClick={createPasskey}
        >
          Create Passkey
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

export default CreatePasskey;
