"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { useStore } from "@/store";
import LoadingSpinner from "./LoadingSpinner";
import useAccount from "@/hooks/useAccount";

const Faucet = () => {
  const { signer } = useStore();
  const account = useAccount();
  const [requestingFunds, setRequestingFunds] = useState(false);

  const fundAccount = async () => {
    setRequestingFunds(true);
    if (!account) {
      return;
    }

    try {
      const proxyAddress = await account.getProxyAddress();

      const fundAccount = await signer.sendTransaction({
        to: proxyAddress,
        value: ethers.utils.parseEther("100"),
      });
      await fundAccount.wait();
    } catch (error) {
      setRequestingFunds(false);
      throw error;
    }

    setRequestingFunds(false);
  };

  return (
    <button
      className="bg-emerald-400 hover:bg-emerald-500 flex items-center justify-center w-32 h-8 rounded-md"
      onClick={fundAccount}
    >
      {requestingFunds && <LoadingSpinner size={20} />}
      {!requestingFunds && <span>Fund Account</span>}
    </button>
  );
};

export default Faucet;
