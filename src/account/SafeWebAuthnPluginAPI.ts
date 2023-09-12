import {
  BigNumber,
  BigNumberish,
  Contract,
  ContractFactory,
  ethers,
} from "ethers";
import { AddressZero } from "@ethersproject/constants";
import { arrayify, hexConcat } from "ethers/lib/utils";
import { Signer } from "@ethersproject/abstract-signer";

import SafeWebAuthnPluginArtifact from "@/utils/hardhat-artifacts/SafeWebAuthnPlugin.json";
import { BaseApiParams, BaseAccountAPI } from "./BaseAccountAPI";
import { SafeWebAuthnPlugin } from "@/utils/typechain-types/SafeWebAuthnPlugin";
import { UserOperationStruct } from "@account-abstraction/contracts";
import { WebAuthnParams } from "@/components/Send";
import { safeSingletonAddress } from "@/constants";
import { SafeWebAuthnPlugin__factory } from "@/utils/typechain-types";
import { calculateProxyAddress } from "@/utils/calculateProxyAddress";

/**
 * constructor params, added no top of base params:
 * @param owner the signer object for the account owner
 * @param safeProxyFactoryAddress address of contract "SafeProxyFactory" to deploy new safe proxy contracts
 */
export interface SafeWebAuthnPluginAPIParams extends BaseApiParams {
  owner: Signer;
  safeProxyFactoryAddress: string;
  publicKey: PublicKey;
  safeProxyFactory: Contract;
  safeFactory: Contract;
  safeWebAuthnPluginFactory: ContractFactory;
}

export type PublicKey = [string, string];

/**
 * An implementation of the BaseAccountAPI using the SafeWebAuthnPlugin contract.
 * - owner signs requests using normal "Ethereum Signed Message" (ether's signer.signMessage())
 * - nonce method is "nonce()"
 * - execute method is "execFromEntryPoint()"
 */
export class SafeWebAuthnPluginAPI extends BaseAccountAPI {
  owner: Signer;
  safeProxyFactoryAddress: string;
  publicKey: PublicKey;

  /**
   * our account contract.
   * should support the "execFromEntryPoint" and "nonce" methods
   */
  accountContract?: SafeWebAuthnPlugin;

  safeProxyFactory: Contract;
  safeFactory: Contract;
  safeWebAuthnPluginFactory: ContractFactory;

  constructor(params: SafeWebAuthnPluginAPIParams) {
    super(params);
    this.owner = params.owner;
    this.safeProxyFactoryAddress = params.safeProxyFactoryAddress;
    this.publicKey = params.publicKey;
    this.safeProxyFactory = params.safeProxyFactory;
    this.safeFactory = params.safeFactory;
    this.safeWebAuthnPluginFactory = params.safeWebAuthnPluginFactory;
  }

  async _getAccountContract(): Promise<Contract> {
    if (this.accountContract == null) {
      if (!this.accountAddress) {
        throw new Error("No accountAddress");
      }

      this.accountContract = SafeWebAuthnPlugin__factory.connect(
        // await this.getAccountAddress(), // FIXME: getCounterFactualAddress wasn't working with this setup. Returned different address and once returned zero address
        this.accountAddress,
        this.provider
      );
    }

    return this.accountContract;
  }

  /**
   * return the value to put into the "initCode" field, if the account is not yet deployed.
   * this value holds the "safeWebAuthnPluginFactory" address, followed by this account's information
   */
  async getAccountInitCode(): Promise<string> {
    if (!this.accountAddress) {
      throw new Error("No accountAddress");
    }

    const accountCode = await this.owner.provider?.getCode(this.accountAddress);

    if (accountCode === "0x") {
      throw new Error("No plugin deployed");
    }

    const safeWebAuthnPlugin = new ethers.Contract(
      this.accountAddress,
      SafeWebAuthnPluginArtifact.abi,
      this.owner
    );

    const moduleInitializer = safeWebAuthnPlugin.interface.encodeFunctionData(
      "enableMyself",
      []
    );

    const ownerAddress = await this.owner.getAddress();
    const encodedInitializer = this.safeFactory.interface.encodeFunctionData(
      "setup",
      [
        [ownerAddress],
        1,
        this.accountAddress,
        moduleInitializer,
        this.accountAddress,
        AddressZero,
        0,
        AddressZero,
      ]
    );

    return hexConcat([
      this.safeProxyFactory.address,
      this.safeProxyFactory.interface.encodeFunctionData(
        "createProxyWithNonce",
        [safeSingletonAddress, encodedInitializer, 73]
      ),
    ]);
  }

  // FIXME: returns nonce from plugin contract instead of proxy, which is what the EntryPoint is using (userOp.sender)
  async getNonce(): Promise<BigNumber> {
    if (await this.checkAccountPhantom()) {
      return BigNumber.from(0);
    }
    const accountContract = await this._getAccountContract();
    return await accountContract.getNonce();
  }

  /**
   * encode a method call from entryPoint to our contract
   * @param target
   * @param value
   * @param data
   */
  async encodeExecute(
    target: string,
    value: BigNumberish,
    data: string
  ): Promise<string> {
    const accountContract = await this._getAccountContract();
    return accountContract.interface.encodeFunctionData("execTransaction", [
      target,
      value,
      data,
    ]);
  }

  // TODO: update this function
  async signUserOpHash(userOpHash: string): Promise<string> {
    return await this.owner.signMessage(arrayify(userOpHash));
  }

  // TODO: update this function
  async signUserOpWithContext(
    userOp: UserOperationStruct,
    context: WebAuthnParams
  ): Promise<UserOperationStruct> {
    await userOp.verificationGasLimit;
    return {
      ...userOp,
      verificationGasLimit: Number(userOp.verificationGasLimit) * 7,
      preVerificationGas: 486880,
      // preVerificationGas: await this.getPreVerificationGas(userOp),
      // signature: ethers.utils.defaultAbiCoder.encode(
      //   ["bytes", "bytes", "bytes", "bytes32", "string", "address", "bytes"],
      //   [
      //     ethers.utils.hexConcat(context.signature),
      //     context.clientDataJSON,
      //     context.authDataBuffer,
      //     context.challenge,
      //     context.clientDataType,
      //     context.origin,
      //     context.credentialId,
      //   ]
      // ),
    };
  }

  async getProxyAddress() {
    if (!this.accountAddress) {
      throw new Error("Plugin not deployed");
    }
    const accountContract = await this._getAccountContract();

    const safeWebAuthnPlugin = new ethers.Contract(
      this.accountAddress,
      SafeWebAuthnPluginArtifact.abi,
      this.owner
    );

    const moduleInitializer = safeWebAuthnPlugin.interface.encodeFunctionData(
      "enableMyself",
      []
    );

    const encodedInitializer = this.safeFactory.interface.encodeFunctionData(
      "setup",
      [
        [await this.owner.getAddress()],
        1,
        accountContract.address,
        moduleInitializer,
        accountContract.address,
        AddressZero,
        0,
        AddressZero,
      ]
    );

    return await calculateProxyAddress(
      this.safeProxyFactory,
      this.safeFactory.address,
      encodedInitializer,
      73
    );
  }
}
