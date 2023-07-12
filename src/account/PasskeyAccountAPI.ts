import { BigNumber, BigNumberish, ethers } from "ethers";
import { arrayify, hexConcat } from "ethers/lib/utils";
import { Signer } from "@ethersproject/abstract-signer";

import { BaseApiParams, BaseAccountAPI } from "./BaseAccountAPI";
import { PasskeyAccount } from "@/utils/typechain-types/PasskeyAccount";
import { PasskeyAccountFactory } from "@/utils/typechain-types/PasskeyAccountFactory";
import { PasskeyAccountFactory__factory } from "@/utils/typechain-types/factories/PasskeyAccountFactory__factory";
import { PasskeyAccount__factory } from "@/utils/typechain-types/factories/PasskeyAccount__factory";
import { UserOperationStruct } from "@account-abstraction/contracts";
import { Context } from "@/components/Send";

/**
 * constructor params, added no top of base params:
 * @param owner the signer object for the account owner
 * @param factoryAddress address of contract "factory" to deploy new contracts (not needed if account already deployed)
 * @param index nonce value used when creating multiple accounts for the same owner
 */
export interface PasskeyAccountApiParams extends BaseApiParams {
  owner: Signer;
  factoryAddress?: string;
  index?: BigNumberish;
  ec: string;
  q: QValues;
  // webAuthnRelayingParty: string;
}

export type QValues = {
  q0: string;
  q1: string;
};

/**
 * An implementation of the BaseAccountAPI using the PasskeyAccount contract.
 * - contract deployer gets "entrypoint", "owner" addresses and "index" nonce
 * - owner signs requests using normal "Ethereum Signed Message" (ether's signer.signMessage())
 * - nonce method is "nonce()"
 * - execute method is "execFromEntryPoint()"
 */
export class PasskeyAccountAPI extends BaseAccountAPI {
  factoryAddress?: string;
  owner: Signer;
  index: BigNumberish;
  ec: string;
  q: QValues;
  // webAuthnRelayingParty: string;

  /**
   * our account contract.
   * should support the "execFromEntryPoint" and "nonce" methods
   */
  accountContract?: PasskeyAccount;

  factory?: PasskeyAccountFactory;

  constructor(params: PasskeyAccountApiParams) {
    super(params);
    this.factoryAddress = params.factoryAddress;
    this.owner = params.owner;
    this.index = BigNumber.from(params.index ?? 0);
    this.ec = params.ec;
    this.q = params.q;
    // this.webAuthnRelayingParty = params.webAuthnRelayingParty;
  }

  async _getAccountContract(): Promise<PasskeyAccount> {
    if (this.accountContract == null) {
      this.accountContract = PasskeyAccount__factory.connect(
        await this.getAccountAddress(),
        this.provider
      );
    }
    return this.accountContract;
  }

  /**
   * return the value to put into the "initCode" field, if the account is not yet deployed.
   * this value holds the "factory" address, followed by this account's information
   */
  async getAccountInitCode(): Promise<string> {
    if (this.factory == null) {
      if (this.factoryAddress != null && this.factoryAddress !== "") {
        this.factory = PasskeyAccountFactory__factory.connect(
          this.factoryAddress,
          this.provider
        );
      } else {
        throw new Error("no factory to get initCode");
      }
    }
    return hexConcat([
      this.factory.address,
      this.factory.interface.encodeFunctionData("createAccount", [
        await this.owner.getAddress(),
        this.index,
        this.ec,
        [this.q.q0, this.q.q1],
      ]),
    ]);
  }

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
    return accountContract.interface.encodeFunctionData("execute", [
      target,
      value,
      data,
    ]);
  }

  async signUserOpHash(userOpHash: string): Promise<string> {
    return await this.owner.signMessage(arrayify(userOpHash));
  }

  async signUserOpWithContext(
    userOp: UserOperationStruct,
    context: Context
  ): Promise<UserOperationStruct> {
    await userOp.verificationGasLimit;
    return {
      ...userOp,
      verificationGasLimit: Number(userOp.verificationGasLimit) * 7,
      preVerificationGas: 486880,
      // preVerificationGas: await this.getPreVerificationGas(userOp),
      signature: ethers.utils.defaultAbiCoder.encode(
        ["bytes", "bytes", "bytes", "bytes32", "string", "address", "bytes"],
        [
          ethers.utils.hexConcat(context.signature),
          context.clientDataJSON,
          context.authDataBuffer,
          context.challenge,
          context.clientDataType,
          context.origin,
          context.credentialId,
        ]
      ),
    };
  }
}
