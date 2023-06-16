import { useState, useEffect } from "react";
import { formatEther } from "ethers/lib/utils";
import { useStore } from "@/store";

const useBalance = () => {
  const { signer } = useStore();
  const [balance, setBalance] = useState("");

  useEffect(() => {
    const getBalance = async () => {
      const newBalance = await signer.getBalance();
      setBalance(formatEther(newBalance));
    };

    getBalance();

    const intervalId = setInterval(() => {
      getBalance();
    }, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [signer]);

  return balance;
};

export default useBalance;
