import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { ECDSASigValue } from "@peculiar/asn1-ecc";
import { AsnParser } from "@peculiar/asn1-schema";

export const createCredential =
  async (): Promise<PublicKeyCredential | null> => {
    const challengeUuid = uuidv4();
    const userUuid = uuidv4();
    const textEncoder = new TextEncoder();
    const challenge = textEncoder.encode(challengeUuid).buffer;
    const userId = textEncoder.encode(userUuid).buffer;

    // localStorage.setItem("challenge_uuid", challengeUuid);
    // localStorage.setItem("user_uuid", userUuid);

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions =
      {
        challenge,
        rp: {
          name: window.location.hostname,
          id: window.location.hostname,
        },
        user: {
          id: userId,
          name: "jwguilding@gmail.com",
          displayName: "John",
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          userVerification: "required",
          authenticatorAttachment: "platform",
        },
        timeout: 60000,
        attestation: "direct",
      };

    return (await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    })) as PublicKeyCredential;
  };

export const getCredential = async (
  credentialId: BufferSource,
  challenge: string
): Promise<Credential | null> => {
  const textEncoder = new TextEncoder();

  const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
    challenge: textEncoder.encode(challenge).buffer,
    allowCredentials: [
      {
        id: credentialId,
        type: "public-key",
        // transports: ["usb", "ble", "nfc"],
      },
    ],
    timeout: 60000,
  };

  return navigator.credentials.get({
    publicKey: publicKeyCredentialRequestOptions,
  });
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

function toHash(data: any, algo = "SHA256") {
  return crypto.createHash(algo).update(data).digest();
}

function shouldRemoveLeadingZero(bytes: Uint8Array): boolean {
  return bytes[0] === 0x0 && (bytes[1] & (1 << 7)) !== 0;
}
