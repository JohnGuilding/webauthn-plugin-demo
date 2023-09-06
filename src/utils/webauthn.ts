import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { ECDSASigValue } from "@peculiar/asn1-ecc";
import { AsnParser } from "@peculiar/asn1-schema";
import base64ToArrayBuffer from "./base64ToArrayBuffer";

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
    let result: PublicKeyCredential;
    try {
      result = (await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      })) as PublicKeyCredential;
    } catch (error) {
      throw new Error(
        `An unexptected error occired trying to create the public key credential: ${error}`
      );
    }

    return result;
  };

export function hexStringToBuffer(hexString: string) {
  const bytes = new Uint8Array(Math.ceil(hexString.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hexString.substr(i * 2, 2), 16);
  }
  return bytes.buffer;
}

export const getCredential = async (
  credentialId: BufferSource
): Promise<Credential | null> => {
  // const challengeUuid = uuidv4();
  const hexChallenge =
    "0xe17103a9c84185b1fa2a812bedb82c3e39b3a91c0b3f7238459ed097eb933ce3";
  // const textEncoder = new TextEncoder();
  const challenge = hexStringToBuffer(hexChallenge.slice(2));
  // const challenge = textEncoder.encode(challengeUuid).buffer;

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

  // Wait for the user to complete assertion
  let credential;
  try {
    credential = (await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    })) as Credential;
  } catch (err) {
    throw new Error("An unexpected error occured getting the credential");
  }

  if (!credential) {
    throw new Error("Authentication was not completed");
  }

  return credential;
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
