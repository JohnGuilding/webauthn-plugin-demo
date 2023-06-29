"use client";

import { useStore } from "@/store";
import { ethers } from "ethers";
import LoadingSpinner from "./LoadingSpinner";
import { useState } from "react";

interface FaucetProps {
  address: string;
}

const Faucet = ({ address }: FaucetProps) => {
  const { signer } = useStore();
  const [requestingFunds, setRequestingFunds] = useState(false);

  const fundAccount = async () => {
    setRequestingFunds(true);
    if (address === "") {
      return;
    }

    const fundAccount = await signer.sendTransaction({
      to: address,
      value: ethers.utils.parseEther("100"),
    });
    await fundAccount.wait();
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
