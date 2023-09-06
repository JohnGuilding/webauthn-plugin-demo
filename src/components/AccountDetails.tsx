"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import useBalance from "@/hooks/useBalance";
import useAccount from "@/hooks/useAccount";
import Address from "./Address";
import Balance from "./Balance";
import Faucet from "./Faucet";

const AccountDetails = () => {
  const [pluginAddress, setPluginAddress] = useState("");
  const [proxyAddress, setProxyAddress] = useState("");

  const account = useAccount();

  useEffect(() => {
    const getAccount = async () => {
      if (!account || !account.accountAddress) {
        return;
      }

      // FIXME: getCounterFactualAddress returns wrong address
      // const pluginAddress = await account.getCounterFactualAddress();
      const pluginAddress = account.accountAddress;
      const proxyAddress = await account.getProxyAddress();

      setPluginAddress(pluginAddress);
      setProxyAddress(proxyAddress);
    };

    getAccount();
  }, [account]);

  const balance = useBalance(proxyAddress);

  return (
    <div className="flex flex-col space-y-2 my-4 p-4 backdrop-blur-md bg-white/10 rounded-xl">
      <Address address={proxyAddress} name="Safe Proxy" />
      <Address address={pluginAddress} name="Safe Plugin" />
      <Balance address={proxyAddress} name="Safe Proxy" />
      {balance && ethers.utils.parseEther(balance).isZero() && <Faucet />}
    </div>
  );
};

export default AccountDetails;
