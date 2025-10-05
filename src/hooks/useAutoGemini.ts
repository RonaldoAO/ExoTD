// src/hooks/useAutoGemini.ts
import { useEffect, useRef, useState } from "react";
import { useProfilesStore } from "@/store/profiles";
import { buildGeminiPrompt } from "@/lib/exoplanet-pipeline";
import { generatePlanetImage } from "@/lib/gemini-client";

export function useAutoGemini(
  enabled: boolean,
  {
    placeholder = "/assets/placeholder-planet.jpg",
    forceSquare = true, // añade “1:1” al prompt si quieres
  } = {}
) {
  const { profiles, setProfiles } = useProfilesStore();
  const [running, setRunning] = useState(false);
  const startedRef = useRef(false);
  const abortRef = useRef(new AbortController());

  useEffect(() => () => abortRef.current.abort(), []);

  useEffect(() => {
    if (!enabled || running || startedRef.current) return;
    if (!profiles?.length) return;

    // candidatos: tienen canonical y foto vacía/placeholder
    const jobs = profiles
      .map((p, idx) => ({ p, idx }))
      .filter(({ p }) => !!p.canonical && (!p.photos?.length || p.photos[0] === placeholder));

    if (!jobs.length) return;

    // reinicia controller para esta corrida
    abortRef.current.abort();
    abortRef.current = new AbortController();
    startedRef.current = true;
    setRunning(true);

    (async () => {
      try {
        for (const { p, idx } of jobs) {
          if (abortRef.current.signal.aborted) break;

          // Prompt siempre string
          const base = (p as any).gemini_prompt ?? buildGeminiPrompt(p.canonical!);
          const prompt = forceSquare ? `${base} Genera una imagen cuadrada (1:1).` : base;

          // ⇨ Espera a que termine esta antes de pasar a la siguiente
          const img = await generatePlanetImage(prompt, { signal: abortRef.current.signal });

          // Pega la foto en el perfil correspondiente
          setProfiles(prev => {
            const next = [...prev];
            const old = next[idx];
            if (!old) return prev;
            next[idx] = { ...old, photos: [img, ...(old.photos ?? [])] };
            return next;
          });
        }
      } finally {
        setRunning(false);
        startedRef.current = false;
      }
    })();
  }, [enabled, profiles, running, placeholder, setProfiles, forceSquare]);
}
