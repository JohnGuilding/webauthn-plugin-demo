"use client";
import useBalance from "@/hooks/useBalance";

const Balance = () => {
  const balance = useBalance();
  return <div>Balance: {balance}</div>;
};

export default Balance;
