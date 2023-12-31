import { ethers, Wallet, BigNumber } from "ethers";
import { UserOperationStruct } from "@account-abstraction/contracts";
import SafeWebAuthnPluginArtifact from "@/utils/hardhat-artifacts/SafeWebAuthnPlugin.json";
import EntryPoint from "@/utils/hardhat-artifacts/EntryPoint.json";
import { WebAuthnParams } from "@/components/Send";
import { SafeWebAuthnPluginAPI } from "@/account/SafeWebAuthnPluginAPI";
import { bundlerUrl, entryPointAddress, nodeUrl } from "@/constants";

export default async function createUserOp(
  signer: Wallet,
  recipient: string,
  amountToTransfer: BigNumber,
  webAuthnParams: WebAuthnParams,
  account: SafeWebAuthnPluginAPI
) {
  const bundlerProvider = new ethers.providers.JsonRpcProvider(bundlerUrl);
  const provider = new ethers.providers.JsonRpcProvider(nodeUrl);

  const encoder = new ethers.utils.AbiCoder();
  const clientChallengeDataOffset = 36;
  const authenticatorDataFlagMask = "0x01";

  const userOpSignature = encoder.encode(
    ["bytes", "bytes1", "bytes", "uint256", "uint256[2]", "uint256[2]"],
    [
      webAuthnParams.authDataBuffer,
      authenticatorDataFlagMask,
      webAuthnParams.clientDataJSON,
      clientChallengeDataOffset,
      webAuthnParams.signature,
      account.publicKey,
    ]
  );

  const safeWebAuthnPlugin = new ethers.Contract(
    account.accountAddress!,
    SafeWebAuthnPluginArtifact.abi,
    account.owner
  );

  const proxyAddress = await account.getProxyAddress();
  const proxyCode = await provider.getCode(proxyAddress);

  let initCode: string;
  if (proxyCode === "0x") {
    initCode = await account.getAccountInitCode();
  } else {
    initCode = "0x";
  }

  const recipientAddress = recipient;
  const transferAmount = amountToTransfer;

  const userOpCallData = safeWebAuthnPlugin.interface.encodeFunctionData(
    "execTransaction",
    [recipientAddress, transferAmount, "0x00"]
  );

  const entryPoint = new ethers.Contract(
    entryPointAddress,
    EntryPoint.abi,
    signer
  );

  const nonce = await entryPoint.getNonce(proxyAddress, 0);

  const userOperationWithoutGasFields = {
    sender: proxyAddress,
    nonce: nonce._hex,
    initCode,
    callData: userOpCallData,
    callGasLimit: "0x00",
    paymasterAndData: "0x",
    signature: userOpSignature,
  };

  const gasEstimate = await bundlerProvider.send(
    "eth_estimateUserOperationGas",
    [userOperationWithoutGasFields, entryPointAddress]
  );

  const safeVerificationGasLimit = BigNumber.from(
    gasEstimate.verificationGasLimit
  ).add(
    BigNumber.from(gasEstimate.verificationGasLimit).div(BigNumber.from(10))
  ); // + 10%
  const safePreVerificationGas = BigNumber.from(
    gasEstimate.preVerificationGas
  ).add(BigNumber.from(gasEstimate.preVerificationGas).div(BigNumber.from(50))); // + 2%

  const feeData = await provider.getFeeData();
  if (!feeData.maxFeePerGas || !feeData.maxPriorityFeePerGas) {
    throw new Error(
      "maxFeePerGas or maxPriorityFeePerGas is null or undefined"
    );
  }

  const maxFeePerGas = "0x" + feeData.maxFeePerGas.toString();
  const maxPriorityFeePerGas = "0x" + feeData.maxPriorityFeePerGas.toString();

  const userOperation: UserOperationStruct = {
    sender: proxyAddress,
    nonce: nonce._hex,
    initCode,
    callData: userOpCallData,
    callGasLimit: gasEstimate.callGasLimit,
    verificationGasLimit: ethers.utils.hexlify(safeVerificationGasLimit),
    preVerificationGas: ethers.utils.hexlify(safePreVerificationGas),
    maxFeePerGas,
    maxPriorityFeePerGas,
    paymasterAndData: "0x",
    signature: userOpSignature,
  };

  return userOperation;
}
