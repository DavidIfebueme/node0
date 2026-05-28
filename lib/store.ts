import { create } from "zustand";

interface NodeStore {
  scanProgress: number;
  isScanning: boolean;
  setScanning: (status: boolean) => void;
  setScanProgress: (progress: number) => void;
}

export const useStore = create<NodeStore>((set) => ({
  scanProgress: 0,
  isScanning: false,
  setScanning: (status) => set({ isScanning: status }),
  setScanProgress: (progress) => set({ scanProgress: progress }),
}));
