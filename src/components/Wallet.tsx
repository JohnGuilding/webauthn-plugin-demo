"use client";

import { useEffect, useState } from "react";
import AccountDetails from "./AccountDetails";
import CreateAccount from "./CreateAccount";
import Send from "./Send";
import LoadingSpinner from "./LoadingSpinner";

const Wallet = () => {
  const [loading, setLoading] = useState(true);
  const [accountCreated, setAccountCreated] = useState(false);

  useEffect(() => {
    const credentialId = localStorage.getItem("credentialId");
    const publicKey = localStorage.getItem("publicKey");
    if (credentialId && publicKey) {
      setAccountCreated(true);
      setLoading(false);
    }

    setLoading(false);
  }, []);

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
