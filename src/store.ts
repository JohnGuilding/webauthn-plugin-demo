import { Wallet, ethers } from "ethers";
import { create } from "zustand";

interface AppState {
  address: string;
  balance: string;
  provider: ethers.providers.JsonRpcProvider;
  signer: Wallet;
  publicKey: Array<string>;
  signature: Array<string>;
  challengeUuid: string;
  credentialId: string;
  publicKeyCredential: any;
  setAddress: (address: string) => void;
  setBalance: (address: string) => void;
  setProvider: (provider: ethers.providers.JsonRpcProvider) => void;
  setPublicKey: (publicKey: Array<string>) => void;
  setSignature: (signature: Array<string>) => void;
  setChallengeUuid: (challengeUuid: string) => void;
  setCredentialId: (credentialId: string) => void;
  setPublicKeyCredential: (publicKeyCredential: any) => void;
}

export const useStore = create<AppState>()((set) => ({
  address: "",
  balance: "",
  provider: new ethers.providers.JsonRpcProvider("http://localhost:8545"),
  signer: new Wallet(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    new ethers.providers.JsonRpcProvider("http://localhost:8545")
  ),
  publicKey: [],
  signature: [],
  challengeUuid: "",
  credentialId: "",
  publicKeyCredential: {},
  setAddress: (address) => set(() => ({ address: address })),
  setBalance: (balance) => set(() => ({ balance: balance })),
  setProvider: (provider) => set(() => ({ provider: provider })),
  setPublicKey: (publicKey) => set(() => ({ publicKey: publicKey })),
  setSignature: (signature) => set(() => ({ signature: signature })),
  setChallengeUuid: (challengeUuid) =>
    set(() => ({ challengeUuid: challengeUuid })),
  setCredentialId: (credentialId) =>
    set(() => ({ credentialId: credentialId })),
  setPublicKeyCredential: (publicKeyCredential) =>
    set(() => ({ publicKeyCredential: publicKeyCredential })),
}));
