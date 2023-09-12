"use client";
import { useState } from "react";
import { HttpRpcClient } from "@account-abstraction/sdk";
import { BigNumber, ethers } from "ethers";

import { bundlerUrl, chainId, entryPointAddress } from "@/constants";
import { useStore } from "@/store";
import parseExpectedGas from "@/utils/parseExpectedGas";
import {
  authResponseToSigVerificationInput,
  getAuthenticatorAssertionResponse,
} from "@/utils/webauthn";
import useAccount from "@/hooks/useAccount";
import LoadingSpinner from "./LoadingSpinner";
import createUserOp from "@/utils/createUserOp";

export type WebAuthnParams = {
  signature: Array<string>;
  clientDataJSON: string;
  authDataBuffer: string;
};

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

const Send = () => {
  const { provider, signer } = useStore();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [sendingEth, setSendingEth] = useState(false);

  const account = useAccount();

  const sendEthWithECDSA = async (amountToTransfer: BigNumber) => {
    const tx = await signer.sendTransaction({
      to: recipient,
      value: amountToTransfer,
    });
    await tx.wait();
  };

  const sendEthWithWebAuthn = async (amountToTransfer: BigNumber) => {
    const authenticatorAssertionResponse =
      await getAuthenticatorAssertionResponse();

    if (!account) {
      console.log("Account not initialized");
      setSendingEth(false);
      return;
    }

    const bundlerProvider = new HttpRpcClient(
      bundlerUrl,
      entryPointAddress,
      chainId
    );

    const sigVerificationInput = authResponseToSigVerificationInput(
      authenticatorAssertionResponse
    );

    const clientDataJSON = Buffer.from(
      authenticatorAssertionResponse.clientDataJSON
    );
    const authDataBuffer = Buffer.from(
      authenticatorAssertionResponse.authenticatorData
    );

    const webAuthnParams: WebAuthnParams = {
      signature: sigVerificationInput.signature,
      clientDataJSON: "0x" + clientDataJSON.toString("hex"),
      authDataBuffer: "0x" + authDataBuffer.toString("hex"),
    };

    const userOp = await createUserOp(
      signer,
      recipient,
      amountToTransfer,
      webAuthnParams,
      account
    );

    try {
      const userOpHash = await bundlerProvider.sendUserOpToBundler(userOp);

      await account.getUserOpReceipt(userOpHash);
    } catch (e: any) {
      setSendingEth(false);
      throw parseExpectedGas(e);
    }
  };

  // const recipient = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"; // Hardhat account #2
  const sendEth = async () => {
    try {
      setSendingEth(true);

      const amountToTransfer = ethers.utils.parseEther(amount);
      const recipientBalanceBefore = await provider.getBalance(recipient);

      if (amountToTransfer.lt(ethers.utils.parseEther("0.1"))) {
        await sendEthWithECDSA(amountToTransfer);
      } else {
        await sendEthWithWebAuthn(amountToTransfer);
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

      setSendingEth(false);
    } catch (error) {
      setSendingEth(false);
      throw error;
    }
  };

  return (
    <div className="flex flex-col space-y-4 items-stretch justify-between my-4 p-4 backdrop-blur-md bg-white/10 rounded-xl">
      <p>Send ETH</p>
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
        onClick={sendEth}
      >
        {sendingEth && <LoadingSpinner size={20} />}
        {!sendingEth && <span>Send</span>}
      </button>
    </div>
  );
};

export default Send;
