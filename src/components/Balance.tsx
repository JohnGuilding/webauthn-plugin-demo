import useBalance from "@/hooks/useBalance";

interface BalanceProps {
  address: string;
  name: string;
}

const Balance = ({ address, name }: BalanceProps) => {
  const balance = useBalance(address);
  return (
    <p>
      {name} balance: {balance} ETH
    </p>
  );
};

export default Balance;
