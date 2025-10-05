import { AnimatePresence } from "framer-motion";
import SwipeCard from "./SwipeCard";
import type { Profile } from "@/lib/types";

type Props = {
  profiles: Profile[];
  onSwiped: (profile: Profile, dir: "left" | "right" | "up" | "down") => void;
};

export default function SwipeDeck({ profiles, onSwiped }: Props) {
  return (
    <div className="relative mx-auto h-[72dvh] max-w-md sm:h-[70vh]  w-full" >
      <AnimatePresence>
        {profiles.slice(0, 3).map((p, i) => (
          <SwipeCard
            key={p.id}
            profile={p}
            index={i}
            onSwipe={(dir) => onSwiped(p, dir)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
