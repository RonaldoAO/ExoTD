import { AnimatePresence } from "framer-motion";
import SwipeCard from "./SwipeCard";
import type { Profile } from "@/lib/types";

// SwipeDeck.tsx (ejemplo)
type AutoSwipe = { dir: "left" | "right" | "up" | "down"; trigger: number };

export default function SwipeDeck({
  profiles,
  onSwiped,
  autoSwipe,              // <-- NUEVO
}: {
  profiles: Profile[];
  onSwiped: (p: Profile, dir: "left" | "right" | "up" | "down") => void;
  autoSwipe?: AutoSwipe;
}) {
  return (
    <div className="relative h-[72dvh] w-full">
      {profiles.map((p, i) => (
        <SwipeCard
          key={p.id}
          profile={p}
          index={i}
          onSwipe={(dir) => onSwiped(p, dir)}
          autoSwipe={i === 0 ? autoSwipe : undefined} // <-- sólo top card
        />
      ))}
    </div>
  );
}

