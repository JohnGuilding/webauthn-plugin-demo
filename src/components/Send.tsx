"use client";
import { useState } from "react";
import { HttpRpcClient } from "@account-abstraction/sdk";
import { ethers } from "ethers";

import { bundlerUrl, chainId, entryPointAddress } from "@/constants";
import { useStore } from "@/store";
import parseExpectedGas from "@/utils/parseExpectedGas";
import {
  authResponseToSigVerificationInput,
  getAuthenticatorAssertionResponse,
} from "@/utils/webauthn";
import useAccount from "@/hooks/useAccount";
import LoadingSpinner from "./LoadingSpinner";

type Context = {
  signature: Array<string>;
  clientDataJSON: string;
  authDataBuffer: string;
};

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

      const context: Context = {
        signature: sigVerificationInput.signature,
        clientDataJSON: "0x" + clientDataJSON.toString("hex"),
        authDataBuffer: "0x" + authDataBuffer.toString("hex"),
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
