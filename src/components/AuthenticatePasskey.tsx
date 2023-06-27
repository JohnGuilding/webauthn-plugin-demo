"use client";
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
  const {
    signer,
    publicKey,
    challengeUuid,
    credentialId,
    setSignature,
    setPublicKeyCredential,
  } = useStore();

  const authenticate = async () => {
    if (credentialId.length === 0) {
      console.log("credentialId has not been set");
      return;
    }

    // assertion instead of credential?
    const credentialIdArrayBuffer = base64ToArrayBuffer(credentialId);
    const credential = (await getCredential(
      credentialIdArrayBuffer,
      challengeUuid
    )) as PublicKeyCredential;
    setPublicKeyCredential(credential);

    const response = credential.response as AuthenticatorAssertionResponse;
    const sigVerificationInput = authResponseToSigVerificationInput(response);

    const authDataBuffer = Buffer.from(response.authenticatorData);
    console.log("Authenticated");

    const ValidationResult = await verifySignature(
      sigVerificationInput,
      publicKey
    );
    console.log("ValidationResult", ValidationResult);

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

      <Send />
    </div>
  );
};

export default AuthenticatePasskey;
