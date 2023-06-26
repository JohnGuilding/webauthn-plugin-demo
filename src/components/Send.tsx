"use client";
import { DeterministicDeployer, HttpRpcClient } from "@account-abstraction/sdk";
import { ethers } from "ethers";

import { PasskeyAccountAPI } from "@/account/PasskeyAccountAPI";
import {
  Secp256r1VerifierAddress,
  bundlerUrl,
  chainId,
  entryPointAddress,
} from "@/constants";
import { useStore } from "@/store";
import parseExpectedGas from "@/utils/parseExpectedGas";
import { PasskeyAccountFactory__factory } from "@/utils/typechain-types/factories/PasskeyAccountFactory__factory";

interface SendProps {
  publicKey: Array<string>;
  signature: Array<string>;
  publicKeyCredential: any;
}

type Context = {
  signature: Array<string>;
  clientDataJSON: string;
  authDataBuffer: string;
};

const Send = ({ publicKey, signature, publicKeyCredential }: SendProps) => {
  const { provider, signer } = useStore();

  const sendUserOperation = async () => {
    const recipient = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // HH account 1

    const detDeployer = new DeterministicDeployer(provider);
    const PasskeyAccountFactory = await detDeployer.deterministicDeploy(
      new PasskeyAccountFactory__factory(),
      0,
      [entryPointAddress]
    );

    const q_values = {
      q0: publicKey[0],
      q1: publicKey[1],
    };

    const passkeyAccountAPI = new PasskeyAccountAPI({
      provider,
      entryPointAddress,
      factoryAddress: PasskeyAccountFactory,
      owner: signer,
      ec: Secp256r1VerifierAddress,
      q: q_values,
    });

    const counterFactualAddress =
      await passkeyAccountAPI.getCounterFactualAddress();

    const amountToTransfer = ethers.utils.parseEther("1");
    const balance = await provider.getBalance(counterFactualAddress);
    const recipientBalanceBefore = await provider.getBalance(recipient);

    if (balance.lt(amountToTransfer)) {
      const fundAccount = await signer.sendTransaction({
        to: counterFactualAddress,
        value: ethers.utils.parseEther("100"),
      });
      await fundAccount.wait();
    }

    const bundlerProvider = new HttpRpcClient(
      bundlerUrl,
      entryPointAddress,
      chainId
    );

    const clientDataJSON = Buffer.from(
      publicKeyCredential.response.clientDataJSON
    );
    const authDataBuffer = Buffer.from(
      publicKeyCredential.response.authenticatorData
    );

    const context: Context = {
      signature,
      clientDataJSON: "0x" + clientDataJSON.toString("hex"),
      authDataBuffer: "0x" + authDataBuffer.toString("hex"),
    };

    const unsignedUserOperation = await passkeyAccountAPI.createUnsignedUserOp({
      target: recipient,
      data: "0x",
      value: amountToTransfer,
    });

    const signedUserOperation = await passkeyAccountAPI.signUserOpWithContext(
      unsignedUserOperation,
      context
    );

    try {
      const userOpHash = await bundlerProvider.sendUserOpToBundler(
        signedUserOperation
      );

      await passkeyAccountAPI.getUserOpReceipt(userOpHash);
    } catch (e: any) {
      throw parseExpectedGas(e);
    }

    const newBalance = await provider.getBalance(counterFactualAddress);

    console.log(
      "Smart Account balance before:",
      ethers.utils.formatEther(balance)
    );
    console.log(
      "Smart Account balance after:",
      ethers.utils.formatEther(newBalance)
    );

    console.log(
      "Recipient balance before:",
      ethers.utils.formatEther(recipientBalanceBefore)
    );
    const recipientBalance = await provider.getBalance(recipient);
    console.log(
      "Recipient balance after:",
      ethers.utils.formatEther(recipientBalance)
    );
  };

  return (
    <div className="flex flex-col space-y-4">
      <p>Create your wallet and send a user operation using SECP256R1</p>
      {/* <input
        type="text"
        placeholder="recipient"
        className="py-2 px-4 rounded text-gray-700"
      />
      <input
        type="text"
        placeholder="amount"
        className="py-2 px-4 rounded text-gray-700"
      /> */}
      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        type="button"
        onClick={sendUserOperation}
      >
        Create & Send
      </button>
      <br />
    </div>
  );
};

export default Send;
