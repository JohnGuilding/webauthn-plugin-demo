"use client";

interface AddressProps {
  address: string;
}

const Address = ({ address }: AddressProps) => {
  return <p className="truncate">Address: {address}</p>;
};

export default Address;
