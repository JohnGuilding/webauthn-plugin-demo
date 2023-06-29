"use client";

import useBalance from "@/hooks/useBalance";

interface BalanceProps {
  address: string;
}

const Balance = ({ address }: BalanceProps) => {
  const balance = useBalance(address);
  return <p>Balance: {balance} ETH</p>;
};

export default Balance;
