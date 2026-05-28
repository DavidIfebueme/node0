import { create } from "zustand";
import type { Breach, Prospect } from "./types";

interface NodeStore {
  scanProgress: number;
  isScanning: boolean;
  breaches: Breach[];
  prospects: Prospect[];
  lastScanAt: string | null;
  savedOutreach: Record<string, { subject: string; body: string }>;
  setScanning: (status: boolean) => void;
  setScanProgress: (progress: number) => void;
  setBreaches: (breaches: Breach[]) => void;
  setProspects: (prospects: Prospect[]) => void;
  setLastScanAt: (time: string) => void;
  addBreach: (breach: Breach) => void;
  addProspects: (prospects: Prospect[]) => void;
  saveOutreach: (key: string, content: { subject: string; body: string }) => void;
}

export const useStore = create<NodeStore>((set) => ({
  scanProgress: 0,
  isScanning: false,
  breaches: [],
  prospects: [],
  lastScanAt: null,
  savedOutreach: {},
  setScanning: (status) => set({ isScanning: status }),
  setScanProgress: (progress) => set({ scanProgress: progress }),
  setBreaches: (breaches) => set({ breaches }),
  setProspects: (prospects) => set({ prospects }),
  setLastScanAt: (time) => set({ lastScanAt: time }),
  addBreach: (breach) => set((state) => ({ breaches: [...state.breaches, breach] })),
  addProspects: (newProspects) => set((state) => {
    const existingIds = new Set(state.prospects.map(p => p.id));
    const unique = newProspects.filter(p => !existingIds.has(p.id));
    return { prospects: [...state.prospects, ...unique] };
  }),
  saveOutreach: (key, content) => set((state) => ({
    savedOutreach: { ...state.savedOutreach, [key]: content },
  })),
}));
