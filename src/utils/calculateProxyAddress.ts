import { ethers, Contract } from "ethers";

export const calculateProxyAddress = async (
  factory: Contract,
  singleton: string,
  inititalizer: string,
  nonce: number | string
) => {
  const deploymentCode = ethers.utils.solidityPack(
    ["bytes", "uint256"],
    [await factory.proxyCreationCode(), singleton]
  );
  const salt = ethers.utils.solidityKeccak256(
    ["bytes32", "uint256"],
    [ethers.utils.solidityKeccak256(["bytes"], [inititalizer]), nonce]
  );
  return ethers.utils.getCreate2Address(
    factory.address,
    salt,
    ethers.utils.keccak256(deploymentCode)
  );
};
