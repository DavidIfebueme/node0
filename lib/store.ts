import { create } from "zustand";
import type { Breach, Prospect } from "./types";

interface NodeStore {
  scanProgress: number;
  isScanning: boolean;
  breaches: Breach[];
  prospects: Prospect[];
  lastScanAt: string | null;
  setScanning: (status: boolean) => void;
  setScanProgress: (progress: number) => void;
  setBreaches: (breaches: Breach[]) => void;
  setProspects: (prospects: Prospect[]) => void;
  setLastScanAt: (time: string) => void;
}

export const useStore = create<NodeStore>((set) => ({
  scanProgress: 0,
  isScanning: false,
  breaches: [],
  prospects: [],
  lastScanAt: null,
  setScanning: (status) => set({ isScanning: status }),
  setScanProgress: (progress) => set({ scanProgress: progress }),
  setBreaches: (breaches) => set({ breaches }),
  setProspects: (prospects) => set({ prospects }),
  setLastScanAt: (time) => set({ lastScanAt: time }),
}));
