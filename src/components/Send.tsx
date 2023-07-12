"use client";
import { useState } from "react";
import { HttpRpcClient } from "@account-abstraction/sdk";
import { ethers } from "ethers";
import { v4 as uuidv4 } from "uuid";
import base64 from "@hexagon/base64";

import { bundlerUrl, chainId, entryPointAddress } from "@/constants";
import { useStore } from "@/store";
import parseExpectedGas from "@/utils/parseExpectedGas";
import {
  authResponseToSigVerificationInput,
  getAuthenticatorAssertionResponse,
} from "@/utils/webauthn";
import useAccount from "@/hooks/useAccount";
import LoadingSpinner from "./LoadingSpinner";
import base64ToArrayBuffer from "@/utils/base64ToArrayBuffer";
import { bufferToBase64URLString } from "@/utils/bufferToBase64URLString";
import { parseAuthenticatorData } from "@/utils/parseAuthenticatorData";
import base64url from "base64url";

export type Context = {
  signature: Array<string>;
  clientDataJSON: string;
  authDataBuffer: string;
  challenge: string;
  clientDataType: string;
  origin: string;
  credentialId: string;
};

/**
 * Decode from a Base64URL-encoded string to an ArrayBuffer. Best used when converting a
 * credential ID from a JSON string to an ArrayBuffer, like in allowCredentials or
 * excludeCredentials.
 *
 * @param buffer Value to decode from base64
 * @param to (optional) The decoding to use, in case it's desirable to decode from base64 instead
 */
export function toBuffer(
  base64urlString: string,
  from: "base64" | "base64url" = "base64url"
): Uint8Array {
  const _buffer = base64.toArrayBuffer(base64urlString, from === "base64url");
  return new Uint8Array(_buffer);
}

/**
 * Decode a base64url string into its original string
 */
export function toString(base64urlString: string): string {
  return base64.toString(base64urlString, true);
}

/**
 * Decode an authenticator's base64url-encoded clientDataJSON to JSON
 */
export function decodeClientDataJSON(data: string): ClientDataJSON {
  const dataToString = toString(data);
  const clientData: ClientDataJSON = JSON.parse(dataToString);

  return clientData;
}

export type ClientDataJSON = {
  type: string;
  challenge: string;
  origin: string;
  crossOrigin?: boolean;
  tokenBinding?: {
    id?: string;
    status: "present" | "supported" | "not-supported";
  };
};

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.prototype.map
    .call(new Uint8Array(buffer), (x) => ("00" + x.toString(16)).slice(-2))
    .join("");
}

const Send = () => {
  const { provider } = useStore();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [sendingUserOperation, setSendingUserOperation] = useState(false);

  const account = useAccount();

  // const recipient = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // HH account 1
  const sendUserOperation = async () => {
    try {
      setSendingUserOperation(true);
      const authenticatorAssertionResponse =
        await getAuthenticatorAssertionResponse();

      const clientDataJSONStr = bufferToBase64URLString(
        authenticatorAssertionResponse.clientDataJSON
      );
      const authenticatorDataStr = bufferToBase64URLString(
        authenticatorAssertionResponse.authenticatorData
      );
      const parsedAuthenticatorData = parseAuthenticatorData(
        toBuffer(authenticatorDataStr)
      );
      console.log("authenticatorAssertionResponse", parsedAuthenticatorData);

      const clientDataJSONTest = decodeClientDataJSON(clientDataJSONStr);
      console.log("clientDataJSON", clientDataJSONTest);

      const sigVerificationInput = authResponseToSigVerificationInput(
        authenticatorAssertionResponse
      );

      if (!account) {
        console.log("Account not initialized");
        setSendingUserOperation(false);
        return;
      }

      const amountToTransfer = ethers.utils.parseEther(amount);
      const bundlerProvider = new HttpRpcClient(
        bundlerUrl,
        entryPointAddress,
        chainId
      );

      const clientDataJSON = Buffer.from(
        authenticatorAssertionResponse.clientDataJSON
      );
      const authDataBuffer = Buffer.from(
        authenticatorAssertionResponse.authenticatorData
      );

      const credentialId = localStorage.getItem("credentialId");
      if (!credentialId) {
        throw new Error("Cannot retrieve credentialId from local storage");
      }

      // assertion instead of credential?
      const credentialIdArrayBuffer = base64ToArrayBuffer(credentialId);

      const clientDataString = new TextDecoder().decode(
        authenticatorAssertionResponse.clientDataJSON
      );

      // Parse the string as JSON
      const clientData = JSON.parse(clientDataString);

      // Access the challenge field of the object
      const returnedChallenge = clientData.challenge;

      // Convert the Base64URL-encoded challenge into an ArrayBuffer of bytes
      const returnedChallengeBuffer = base64url.toBuffer(returnedChallenge);

      // Convert the ArrayBuffer to a hexadecimal string
      const challengeHex =
        "0x" +
        Array.from(new Uint8Array(returnedChallengeBuffer))
          .map((b) => ("0" + b.toString(16)).slice(-2))
          .join("");

      console.log("challengeHex", challengeHex);

      const context: Context = {
        signature: sigVerificationInput.signature,
        clientDataJSON: "0x" + clientDataJSON.toString("hex"),
        authDataBuffer: "0x" + authDataBuffer.toString("hex"),
        challenge: challengeHex,
        clientDataType: clientDataJSONTest.type,
        origin: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        credentialId:
          "0x" + Buffer.from(credentialIdArrayBuffer).toString("hex"),
      };

      const unsignedUserOperation = await account.createUnsignedUserOp({
        target: recipient,
        data: "0x",
        value: amountToTransfer,
      });

      const signedUserOperation = await account.signUserOpWithContext(
        unsignedUserOperation,
        context
      );

      const recipientBalanceBefore = await provider.getBalance(recipient);
      try {
        const userOpHash = await bundlerProvider.sendUserOpToBundler(
          signedUserOperation
        );

        await account.getUserOpReceipt(userOpHash);
      } catch (e: any) {
        setSendingUserOperation(false);
        throw parseExpectedGas(e);
      }

      const recipientBalanceAfter = await provider.getBalance(recipient);
      console.log(
        "Recipient balance before:",
        ethers.utils.formatEther(recipientBalanceBefore)
      );
      console.log(
        "Recipient balance after:",
        ethers.utils.formatEther(recipientBalanceAfter)
      );
      setSendingUserOperation(false);
    } catch (error) {
      console.log("An error occurred while sending the user operation", error);
      setSendingUserOperation(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4 items-stretch justify-between my-4 p-4 backdrop-blur-md bg-white/10 rounded-xl">
      <p>Send ETH using passkeys</p>
      <input
        type="text"
        placeholder="recipient"
        className="py-2 px-4 rounded text-gray-700"
        onChange={(e) => setRecipient(e.target.value)}
      />
      <div className="relative">
        <input
          type="number"
          placeholder="amount"
          className="py-2 px-4 rounded text-gray-700 pr-12 w-full"
          onChange={(e) => setAmount(e.target.value)}
        />
        <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400">
          ETH
        </span>
      </div>
      <button
        className="bg-emerald-400 hover:bg-emerald-500 text-white font-bold flex items-center justify-center h-10 rounded"
        type="button"
        onClick={sendUserOperation}
      >
        {sendingUserOperation && <LoadingSpinner size={20} />}
        {!sendingUserOperation && <span>Send</span>}
      </button>
    </div>
  );
};

export default Send;
