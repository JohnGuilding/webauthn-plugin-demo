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
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    new ethers.providers.JsonRpcProvider("http://localhost:8545")
  ),
  setProvider: (provider) => set(() => ({ provider: provider })),
}));
