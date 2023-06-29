import { useState, useEffect } from "react";
import { formatEther } from "ethers/lib/utils";
import { useStore } from "@/store";

const useBalance = (address: string) => {
  const { provider } = useStore();
  const [balance, setBalance] = useState("");

  useEffect(() => {
    const getBalance = async () => {
      if (!address) {
        return;
      }

      const newBalance = await provider.getBalance(address);
      setBalance(formatEther(newBalance));
    };

    getBalance();

    const intervalId = setInterval(() => {
      getBalance();
    }, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [provider, address]);

  return balance;
};

export default useBalance;
