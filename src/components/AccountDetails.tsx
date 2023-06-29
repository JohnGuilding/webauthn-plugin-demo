"use client";

import { useEffect, useState } from "react";
import Address from "./Address";
import useAccount from "@/hooks/useAccount";
import Balance from "./Balance";
import useBalance from "@/hooks/useBalance";
import { ethers } from "ethers";
import Faucet from "./Faucet";

const AccountDetails = () => {
  const [address, setAddress] = useState("");

  const account = useAccount();

  useEffect(() => {
    const getAccount = async () => {
      if (!account) {
        return;
      }

      const passkeyAccountAddress = await account.getCounterFactualAddress();
      setAddress(passkeyAccountAddress);
    };

    getAccount();
  }, [account]);

  const balance = useBalance(address);

  return (
    <div className="flex flex-col space-y-2 my-4 p-4 backdrop-blur-md bg-white/10 rounded-xl">
      <Address address={address} />
      <Balance address={address} />
      {balance && ethers.utils.parseEther(balance).isZero() && (
        <Faucet address={address} />
      )}
    </div>
  );
};

export default AccountDetails;
