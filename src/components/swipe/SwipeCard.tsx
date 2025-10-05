import { motion } from "framer-motion";
import type { PanInfo } from "framer-motion";
import { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

type Props = {
  profile: Profile;
  onSwipe: (dir: "left" | "right" | "up" | "down") => void;
  index: number; // para stacking
};

const SWIPE_CONFIDENCE = 120; // px

export default function SwipeCard({ profile, onSwipe, index }: Props) {
  const [imgIdx, setImgIdx] = useState(0);
  const draggingRef = useRef(false);

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
      >
        <Card className="relative h-[72dvh] w-full overflow-hidden rounded-3xl sm:h-[70vh]">
          {/* Foto principal */}
          <img
            src={profile.photos[imgIdx]}
            alt={profile.name}
            className="h-full w-full object-cover"
          />

          {/* Gradiente y texto */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 text-white bg-red">
            <div className="flex items-end justify-between">
              <div>
                <h1>HOLA MUNDO</h1>
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
                <span
                  key={t}
                  className="rounded-full bg-white/15 px-2 py-0.5 text-xs"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Tap para cambiar foto (izq/der) */}
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
