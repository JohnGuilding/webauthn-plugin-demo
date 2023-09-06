"use client";

import { useEffect, useState } from "react";
import AccountDetails from "./AccountDetails";
import CreateAccount from "./CreateAccount";
import Send from "./Send";
import LoadingSpinner from "./LoadingSpinner";
import { useStore } from "@/store";

const Wallet = () => {
  const { provider } = useStore();
  const [loading, setLoading] = useState(true);
  const [accountCreated, setAccountCreated] = useState(false);

  useEffect(() => {
    async function getAccountCode(safeWebAuthnPluginAddress: string) {
      const accountCode = await provider.getCode(safeWebAuthnPluginAddress);

      if (accountCode == "0x") {
        setAccountCreated(false);
        setLoading(false);
      } else {
        setLoading(false);
        setAccountCreated(true);
      }
    }

    const safeWebAuthnPluginAddress = localStorage.getItem(
      "safeWebAuthnPluginAddress"
    );
    const credentialId = localStorage.getItem("credentialId");
    const publicKey = localStorage.getItem("publicKey");

    if (credentialId && publicKey && safeWebAuthnPluginAddress) {
      getAccountCode(safeWebAuthnPluginAddress);
    } else {
      setLoading(false);
      setAccountCreated(false);
    }
  }, [provider]);

  return (
    <div className="w-96 lg:w-[40rem]">
      {loading ? (
        <div className="h-40 flex items-center justify-center">
          <LoadingSpinner size={60} />
        </div>
      ) : accountCreated ? (
        <>
          <AccountDetails />
          <Send />
        </>
      ) : (
        <CreateAccount setAccountCreated={setAccountCreated} />
      )}
    </div>
  );
};

export default Wallet;
