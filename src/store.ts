import { Wallet, ethers } from "ethers";
import { create } from "zustand";

interface AppState {
  provider: ethers.providers.JsonRpcProvider;
  signer: Wallet;
  setProvider: (provider: ethers.providers.JsonRpcProvider) => void;
}

export const useStore = create<AppState>()((set) => ({
  provider: new ethers.providers.JsonRpcProvider("http://localhost:8545"),
  signer: new Wallet(
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", // Hardhat account #1
    new ethers.providers.JsonRpcProvider("http://localhost:8545")
  ),
  setProvider: (provider) => set(() => ({ provider: provider })),
}));
