import { create } from "zustand";
import type { Profile } from "@/lib/types";

type ProfilesUpdater = Profile[] | ((prev: Profile[]) => Profile[]);

type ProfilesState = {
  profiles: Profile[];
  setProfiles: (updater: ProfilesUpdater) => void;
  reset: () => void;
};

export const useProfilesStore = create<ProfilesState>((set) => ({
  profiles: [],
  setProfiles: (updater) =>
    set((state) => ({
      profiles:
        typeof updater === "function"
          ? (updater as (p: Profile[]) => Profile[])(state.profiles)
          : updater,
    })),
  reset: () => set({ profiles: [] }),
}));
