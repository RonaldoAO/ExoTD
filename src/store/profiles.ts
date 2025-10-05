// src/store/profiles.ts
import { create } from "zustand";
import type { Profile } from "@/lib/types";

type ProfilesState = {
  profiles: Profile[];
  setProfiles: (p: Profile[]) => void;
  reset: () => void;
};

export const useProfilesStore = create<ProfilesState>((set) => ({
  profiles: [],
  setProfiles: (p) => set({ profiles: p }),
  reset: () => set({ profiles: [] }),
}));
