import { ethers, Wallet, BigNumber } from "ethers";
import { UserOperationStruct } from "@account-abstraction/contracts";
import SafeWebAuthnPluginArtifact from "@/utils/ABIs/SafeWebAuthnPlugin.json";
import EntryPoint from "@/utils/ABIs/EntryPoint.json";
import { Context } from "@/components/Send";
import { SafeWebAuthnPluginAPI } from "@/account/SafeWebAuthnPluginAPI";

const BUNDLER_URL = "http://localhost:3000/rpc";
const NODE_URL = "http://localhost:8545";

export default async function createUserOp(
  signer: Wallet,
  recipient: string,
  amountToTransfer: BigNumber,
  context: Context,
  account: SafeWebAuthnPluginAPI
) {
  const bundlerProvider = new ethers.providers.JsonRpcProvider(BUNDLER_URL);
  const provider = new ethers.providers.JsonRpcProvider(NODE_URL);

  const entryPoints = await bundlerProvider.send(
    "eth_supportedEntryPoints",
    []
  );

  const encoder = new ethers.utils.AbiCoder();
  const clientChallengeDataOffset = 36;
  const authenticatorDataFlagMask = "0x01";

  const userOpSignature = encoder.encode(
    ["bytes", "bytes1", "bytes", "uint256", "uint256[2]", "uint256[2]"],
    [
      context.authDataBuffer,
      authenticatorDataFlagMask,
      context.clientDataJSON,
      clientChallengeDataOffset,
      context.signature,
      account.publicKey,
    ]
  );
  const ENTRYPOINT_ADDRESS = entryPoints[0];

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
    ENTRYPOINT_ADDRESS,
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
    [userOperationWithoutGasFields, ENTRYPOINT_ADDRESS]
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
