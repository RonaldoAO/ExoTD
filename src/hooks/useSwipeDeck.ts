import { useCallback, useMemo, useState } from "react";
import type { Profile } from "@/lib/types";

export type SwipeDirection = "left" | "right" | "up" | "down";

export function useSwipeDeck(initial: Profile[]) {
  const [stack, setStack] = useState<Profile[]>(initial);
  const [history, setHistory] = useState<
    { profile: Profile; direction: SwipeDirection }[]
  >([]);

  const current = stack[0] ?? null;
  const rest = useMemo(() => stack.slice(1), [stack]);

  const swipe = useCallback(
    (direction: SwipeDirection) => {
      if (!current) return;
      setHistory((h) => [{ profile: current, direction }, ...h]);
      setStack((s) => s.slice(1));
    },
    [current]
  );

  const undo = useCallback(() => {
    const last = history[0];
    if (!last) return;
    setHistory((h) => h.slice(1));
    setStack((s) => [last.profile, ...s]);
  }, [history]);

  return { current, rest, swipe, undo, history, setStack };
}
