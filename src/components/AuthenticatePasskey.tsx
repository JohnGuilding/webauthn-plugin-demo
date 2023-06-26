"use client";
import { useState } from "react";
import { ethers } from "ethers";

import base64ToArrayBuffer from "@/utils/base64ToArrayBuffer";
import {
  authResponseToSigVerificationInput,
  getCredential,
} from "@/utils/webauthn";
import Send from "./Send";
import { Secp256r1VerifierAddress } from "@/constants";
import { useStore } from "@/store";
import EllipticCurve from "@/utils/ABIs/EllipticCurve.json";

const AuthenticatePasskey = () => {
  const { signer } = useStore();
  const [publicKey, setPublicKey] = useState<Array<string>>([]);
  const [signature, setSignature] = useState<Array<string>>([]);
  const [publicKeyCredential, setPublicKeyCredential] = useState<any>({});

  const authenticate = async () => {
    const credentialId = localStorage.getItem("credential_id");
    if (!credentialId) {
      console.log("Cannot retrieve credentialId from the local storage");
      return;
    }

    // assertion instead of credential?
    const credentialIdArrayBuffer = base64ToArrayBuffer(credentialId);
    const credential = (await getCredential(
      credentialIdArrayBuffer
    )) as PublicKeyCredential;
    setPublicKeyCredential(credential);

    const publicKeyBase64 = localStorage.getItem("public_key");
    if (!publicKeyBase64) {
      console.log("Cannot retrieve publicKeyBase64 from the local storage");
      return;
    }

    const pubKey: string[] = JSON.parse(publicKeyBase64);

    const response = credential.response as AuthenticatorAssertionResponse;
    const sigVerificationInput = authResponseToSigVerificationInput(response);

    const authDataBuffer = Buffer.from(response.authenticatorData);
    console.log("Authenticated");

    // const ValidationResult = await verifySignature(
    //   sigVerificationInput,
    //   pubKey
    // );
    // console.log("ValidationResult", ValidationResult);

    setPublicKey(pubKey);
    setSignature(sigVerificationInput.signature);
  };

  const verifySignature = async (
    sigVerificationInput: {
      messageHash: string;
      signature: string[];
    },
    publicKey: Array<string>
  ) => {
    const ellipticCurve = new ethers.Contract(
      Secp256r1VerifierAddress,
      EllipticCurve.abi,
      signer
    );

    const tx = await ellipticCurve.validateSignature(
      sigVerificationInput.messageHash,
      sigVerificationInput.signature,
      publicKey
    );
    return tx;
  };

  return (
    <div className="flex flex-col mt-4">
      <p>Authorize wallet creation with your passkey</p>
      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        type="button"
        onClick={authenticate}
      >
        Authenticate
      </button>

      <Send
        publicKey={publicKey}
        signature={signature}
        publicKeyCredential={publicKeyCredential}
      />
    </div>
  );
};

export default AuthenticatePasskey;
