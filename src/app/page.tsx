import Address from "@/components/Address";
import Balance from "@/components/Balance";
import Send from "@/components/Send";

export default function Home() {
  return (
    <main className="p-12">
      <h1 className="text-xl">Passkey Wallet</h1>
      <div className="w-1/3">
        <Address />
        <Balance />
        <Send />
      </div>
    </main>
  );
}
