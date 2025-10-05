import { motion, useAnimation } from "framer-motion";
import type { PanInfo } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

type AutoSwipe = { dir: "left" | "right" | "up" | "down"; trigger: number };

type Props = {
  profile: Profile;
  onSwipe: (dir: "left" | "right" | "up" | "down") => void;
  index: number; // stacking
  autoSwipe?: AutoSwipe; // <-- NUEVO
};

const SWIPE_CONFIDENCE = 120; // px

export default function SwipeCard({ profile, onSwipe, index, autoSwipe }: Props) {
  const [imgIdx, setImgIdx] = useState(0);
  const draggingRef = useRef(false);
  const controls = useAnimation(); // <-- NUEVO

  const handleDragEnd = (_: any, info: PanInfo) => {
    draggingRef.current = false;
    const { offset, velocity } = info;
    const power = Math.abs(offset.x) * velocity.x;

    if (offset.x < -SWIPE_CONFIDENCE || power < -1000) return onSwipe("left");
    if (offset.x > SWIPE_CONFIDENCE || power > 1000) return onSwipe("right");
    if (offset.y < -SWIPE_CONFIDENCE) return onSwipe("up");
    if (offset.y > SWIPE_CONFIDENCE) return onSwipe("down");
  };

  const handleDragStart = () => (draggingRef.current = true);

  // === Auto-swipe programado ===
  useEffect(() => {
    if (!autoSwipe) return;

    const OFF = window.innerWidth * 0.9; // distancia de salida
    const cfg: Record<NonNullable<AutoSwipe["dir"]>, any> = {
      right: { x: OFF, y: 40, rotate: 8 },
      left:  { x: -OFF, y: 40, rotate: -8 },
      up:    { x: 0, y: -OFF, rotate: 0 },
      down:  { x: 0, y: OFF, rotate: 0 },
    };

    const { dir } = autoSwipe;
    controls
      .start({
        ...cfg[dir],
        opacity: 0,
        transition: { duration: 1, ease: "easeIn" },
      })
      .then(() => onSwipe(dir)); // avanza el deck como si fuera swipe real
  // Dispara cuando cambie el trigger
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSwipe?.trigger]);

  return (
    <motion.div
      className={cn(
        "absolute inset-0",
        index > 0 && "scale-[0.98] translate-y-2 opacity-95 "
      )}
      style={{ zIndex: 20 - index }}
      initial={{ scale: 0.98, opacity: 0, y: 10 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        drag
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.8}
        whileDrag={{ cursor: "grabbing", rotate: 2 }}
        animate={controls} // <-- NUEVO: permite control programático
      >
        <Card className="relative h-[72dvh] w-full overflow-hidden rounded-3xl sm:h-[70vh]">
          <img
            src={profile.photos[imgIdx]}
            alt={profile.name}
            className="!h-[140%] w-full object-cover "
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 text-white">
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-2xl font-semibold">
                  {profile.name}, {profile.age}
                </h3>
                {profile.location && (
                  <p className="text-sm opacity-90">{profile.location}</p>
                )}
              </div>
              {profile.photos.length > 1 && (
                <div className="flex gap-1">
                  {profile.photos.map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1 w-6 rounded-full bg-white/50",
                        i === imgIdx && "bg-white"
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
            <p className="mt-2 line-clamp-2 text-sm opacity-95">{profile.bio}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(profile.tags ?? []).map((t) => (
                <span key={t} className="rounded-full bg-white/15 px-2 py-0.5 text-xs">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {profile.photos.length > 1 && (
            <>
              <button
                aria-label="prev photo"
                className="absolute inset-y-0 left-0 w-1/2"
                onClick={() => setImgIdx((i) => Math.max(0, i - 1))}
              />
              <button
                aria-label="next photo"
                className="absolute inset-y-0 right-0 w-1/2"
                onClick={() =>
                  setImgIdx((i) => Math.min(profile.photos.length - 1, i + 1))
                }
              />
            </>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}
