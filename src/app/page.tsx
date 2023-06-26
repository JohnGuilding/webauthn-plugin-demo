import CreatePasskey from "@/components/CreatePasskey";
import AuthenticatePasskey from "@/components/AuthenticatePasskey";

export default function Home() {
  return (
    <main className="p-12">
      <h1 className="text-xl">Passkey Wallet</h1>
      <div className="w-1/3">
        <CreatePasskey />
        <AuthenticatePasskey />
      </div>
    </main>
  );
}
