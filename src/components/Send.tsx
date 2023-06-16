"use client";
import { SimpleAccountAPI } from "@/account/SimpleAccountAPI";
import { bundlerUrl, chainId, entryPointAddress } from "@/constants";
import { useStore } from "@/store";
import parseExpectedGas from "@/utils/parseExpectedGas";
import { SimpleAccountFactory__factory } from "@account-abstraction/contracts";
import { DeterministicDeployer, HttpRpcClient } from "@account-abstraction/sdk";
import { ethers } from "ethers";

const Send = () => {
  const { provider, signer } = useStore();

  const sendUserOperation = async () => {
    const recipient = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // HH account 1

    const detDeployer = new DeterministicDeployer(provider);
    const SimpleAccountFactory = await detDeployer.deterministicDeploy(
      new SimpleAccountFactory__factory(),
      0,
      [entryPointAddress]
    );

    const simpleAccountAPI = new SimpleAccountAPI({
      provider,
      entryPointAddress,
      owner: signer,
      factoryAddress: SimpleAccountFactory,
    });

    const counterFactualAddress =
      await simpleAccountAPI.getCounterFactualAddress();

    const fundAccount = await signer.sendTransaction({
      to: counterFactualAddress,
      value: ethers.utils.parseEther("1"),
    });
    await fundAccount.wait();

    const balance = await provider.getBalance(counterFactualAddress);
    console.log("Balance:", ethers.utils.formatEther(balance));

    const bundlerProvider = new HttpRpcClient(
      bundlerUrl,
      entryPointAddress,
      chainId
    );

    const userOperation = await simpleAccountAPI.createSignedUserOp({
      target: recipient,
      data: "0x",
      value: ethers.utils.parseEther("1"),
    });

    try {
      const userOpHash = await bundlerProvider.sendUserOpToBundler(
        userOperation
      );
      // console.log("User Operation Hash:", userOpHash);

      const transactionReceipt = await simpleAccountAPI.getUserOpReceipt(
        userOpHash
      );
      // console.log("Transaction Receipt:", transactionReceipt);
    } catch (e: any) {
      throw parseExpectedGas(e);
    }

    const newBalance = await provider.getBalance(counterFactualAddress);
    console.log("New balance:", ethers.utils.formatEther(newBalance));

    const recipientBalance = await provider.getBalance(recipient);
    console.log(
      "Recipient balance:",
      ethers.utils.formatEther(recipientBalance)
    );
  };

  return (
    <div className="flex flex-col space-y-4">
      <input
        type="text"
        placeholder="recipient"
        className="py-2 px-4 rounded text-gray-700"
      />
      <input
        type="text"
        placeholder="amount"
        className="py-2 px-4 rounded text-gray-700"
      />
      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        type="button"
        onClick={sendUserOperation}
      >
        Send User Operation
      </button>
    </div>
  );
};

export default Send;
