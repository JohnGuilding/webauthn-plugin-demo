interface AddressProps {
  address: string;
  name: string;
}

const Address = ({ address, name }: AddressProps) => {
  return (
    <p className="truncate">
      {name} address: {address}
    </p>
  );
};

export default Address;
