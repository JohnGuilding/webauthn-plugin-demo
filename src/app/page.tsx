import Wallet from "@/components/Wallet";

export default function Home() {
  return (
    <main className="p-12 flex items-center justify-center flex-col">
      <h1 className="text-xl">WebAuthn Wallet</h1>
      <Wallet />
    </main>
  );
}
