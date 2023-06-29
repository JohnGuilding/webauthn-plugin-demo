import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { ECDSASigValue } from "@peculiar/asn1-ecc";
import { AsnParser } from "@peculiar/asn1-schema";
import base64ToArrayBuffer from "./base64ToArrayBuffer";
import { Secp256r1VerifierAddress } from "@/constants";
import EllipticCurve from "@/utils/ABIs/EllipticCurve.json";
import { Wallet, ethers } from "ethers";

export const createCredential =
  async (): Promise<PublicKeyCredential | null> => {
    const challengeUuid = uuidv4();
    const userUuid = uuidv4();
    const textEncoder = new TextEncoder();
    // we need a randomly generated string from the server as a challenge to prevent replay attacks
    const challenge = textEncoder.encode(challengeUuid).buffer;
    const userId = textEncoder.encode(userUuid).buffer;

    // localStorage.setItem("challenge_uuid", challengeUuid);
    // localStorage.setItem("user_uuid", userUuid);

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions =
      {
        // The challenge is a buffer of cryptographically random bytes generated on the server, and is needed to prevent "replay attacks"
        challenge,
        // This stands for “relying party”; it can be considered as describing the organization responsible for registering and
        // authenticating the user. The id must be a subset of the domain currently in the browser. For example, a valid id for
        // this page is webauthn.guide
        rp: {
          name: window.location.hostname,
          id: window.location.hostname,
        },
        user: {
          id: userId,
          name: "jwguilding@gmail.com",
          displayName: "John",
        },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }],
        authenticatorSelection: {
          userVerification: "required",
          authenticatorAttachment: "platform",
        },
        timeout: 60000,
        attestation: "direct",
      };

    // Should get called on the client
    return (await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    })) as PublicKeyCredential;
  };

export const getCredential = async (
  credentialId: BufferSource
): Promise<Credential | null> => {
  const challengeUuid = uuidv4();
  const textEncoder = new TextEncoder();
  const challenge = textEncoder.encode(challengeUuid).buffer;

  const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
    challenge,
    allowCredentials: [
      {
        id: credentialId,
        type: "public-key",
      },
    ],
    timeout: 60000,
  };

  return navigator.credentials.get({
    publicKey: publicKeyCredentialRequestOptions,
  });
};

export const getAuthenticatorAssertionResponse =
  async (): Promise<AuthenticatorAssertionResponse> => {
    const credentialId = localStorage.getItem("credentialId");
    if (!credentialId) {
      throw new Error("Cannot retrieve credentialId from local storage");
    }

    // assertion instead of credential?
    const credentialIdArrayBuffer = base64ToArrayBuffer(credentialId);
    const credential = (await getCredential(
      credentialIdArrayBuffer
    )) as PublicKeyCredential;
    if (!credential) {
      throw new Error("Cannot get credential");
    }
    // setPublicKeyCredential(credential);

    return credential.response as AuthenticatorAssertionResponse;
  };

/**
 * Create the inputs to verify the secp256r1/p256 signatures minus the public key
 * in the EllipticCurve.sol contract, see https://github.com/tdrerup/elliptic-curve-solidity
 */
export const authResponseToSigVerificationInput = (
  authResponse: AuthenticatorAssertionResponse
) => {
  const messageHash = getMessageHash(authResponse);
  const signature = getSignature(authResponse.signature);

  return { messageHash, signature };
};

const getMessageHash = (authResponse: AuthenticatorAssertionResponse) => {
  const authDataBuffer = Buffer.from(authResponse.authenticatorData);
  const clientDataHash = toHash(Buffer.from(authResponse.clientDataJSON));

  const signatureBase = Buffer.concat([authDataBuffer, clientDataHash]);
  return "0x" + toHash(signatureBase).toString("hex");
};

export const getSignature = (signatureBuffer: ArrayBuffer) => {
  const parsedSignature = AsnParser.parse(signatureBuffer, ECDSASigValue);

  let rBytes = new Uint8Array(parsedSignature.r);
  let sBytes = new Uint8Array(parsedSignature.s);

  if (shouldRemoveLeadingZero(rBytes)) {
    rBytes = rBytes.slice(1);
  }

  if (shouldRemoveLeadingZero(sBytes)) {
    sBytes = sBytes.slice(1);
  }

  const signature = [
    "0x" + Buffer.from(rBytes).toString("hex"),
    "0x" + Buffer.from(sBytes).toString("hex"),
  ];
  return signature;
};

export function toHash(data: any, algo = "SHA256") {
  return crypto.createHash(algo).update(data).digest();
}

function shouldRemoveLeadingZero(bytes: Uint8Array): boolean {
  return bytes[0] === 0x0 && (bytes[1] & (1 << 7)) !== 0;
}

// const validationResult = await verifySignature(sigVerificationInput);
// console.log("ValidationResult", validationResult);
const verifySignature = async (sigVerificationInput: {
  messageHash: string;
  signature: string[];
}) => {
  const publicKeyBase64 = localStorage.getItem("public_key");
  if (!publicKeyBase64) {
    console.log("Cannot retrieve publicKeyBase64 from the local storage");
    return;
  }

  const publicKey: string[] = JSON.parse(publicKeyBase64);
  const signer = new Wallet(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    new ethers.providers.JsonRpcProvider("http://localhost:8545")
  );

  const ellipticCurve = new ethers.Contract(
    Secp256r1VerifierAddress,
    EllipticCurve.abi,
    signer
  );

  console.log("VERIFY", {
    messageHash: sigVerificationInput.messageHash,
    signature: sigVerificationInput.signature,
    publicKey: publicKey,
  });

  const sig1 = BigInt(sigVerificationInput.signature[0]);
  const sig2 = BigInt(sigVerificationInput.signature[1]);
  const publicKey1 = BigInt(publicKey[0]);
  const publicKey2 = BigInt(publicKey[1]);

  console.log(sig1.toString(10));
  console.log(sig2.toString(10));
  console.log(publicKey1.toString(10));
  console.log(publicKey2.toString(10));

  const tx = await ellipticCurve.validateSignature(
    sigVerificationInput.messageHash,
    sigVerificationInput.signature,
    publicKey
  );
  return tx;
};
