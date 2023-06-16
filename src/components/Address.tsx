"use client";
import { useStore } from "@/store";

const Address = () => {
  const { signer } = useStore();
  return <div>Address: {signer.address}</div>;
};

export default Address;
