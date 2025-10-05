import SwipeDeck from "@/components/swipe/SwipeDeck";
import BottomBar from "@/components/layout/BottomBar";
import { useSwipeDeck } from "@/hooks/useSwipeDeck";
import type { Profile } from "@/lib/types";
import { useMemo, useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { parseFileToRows } from "@/lib/importers";
import { rowsToProfilesWithMask } from "@/lib/exoplanet-pipeline";
import { useProfilesStore } from "@/store/profiles";

export default function Home() {
  const { profiles, setProfiles } = useProfilesStore();
  const seed = profiles;
  const { current, rest, swipe, undo, setStack } = useSwipeDeck(seed);
  useEffect(() => setStack(profiles), [profiles, setStack]);
  const visible = useMemo(() => (current ? [current, ...rest] : []), [current, rest]);

  const [file, setFile] = useState<File | null>(null);
  const [option, setOption] = useState<string>("default");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [autoSwipe, setAutoSwipe] = useState<{ dir: "left" | "right" | "up" | "down"; trigger: number }>();
  const triggerRef = useRef(0);

  const [modelNames, setModelNames] = useState<string[]>([]);

  type Job = { model_name?: string | null };
  const jobs: Job[] = []; // ← pon aquí tu array de jobs

  // === NUEVO: arreglo de 0/1 para la secuencia automática ===
  // 1 = derecha (match), 0 = izquierda
  const DECISIONS = useRef<number[]>([1, 1, 1]); // cámbialo a tu gusto

  // Overlay MATCH
  const [showMatch, setShowMatch] = useState(false);

  const isEmpty = (profiles?.length ?? 0) === 0;
  const handleSwiped = (_: Profile, dir: any) => {
    // Avanza el deck normal
    swipe(dir);
    // MATCH overlay cuando sea derecha
    if (dir === "right") {
      setShowMatch(true);
      setTimeout(() => setShowMatch(false), 700);
    }
  };

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);

        const res = await fetch("https://us-central1-cedar-catfish-473700-s6.cloudfunctions.net/exo-scout-jobs-api/jobs", { method: "GET", signal: ac.signal });
        const raw = await res.clone().text();

        if (!res.ok) {
          throw new Error(`HTTP ${res.status} – ${raw.slice(0, 300)}`);
        }

        let data: Object[] = JSON.parse(raw);
        console.log("Jobs recibidos:", data);

        data = data.filter((j) => j?.status != "error");

        const names = Array.from(
          new Set(
            (data as any[])
              .map((j) => String(j?.model_name ?? "").trim())
              .filter(Boolean)
          )
        ).sort((a, b) => a.localeCompare(b));

        setModelNames(names);

        // opcional: selecciona el primero por defecto
        if (names.length && !option) setOption(names[0]);


      } catch (e: any) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);





  // ---------- Helpers ----------
  function computeTimeoutMs(f: File): number {
    const MB = f.size / (1024 * 1024);
    const BASE = 4000;   // 4s base
    const PER_MB = 1500; // +1.5s por MB
    const MAX = 180000;  // 180s tope si quieres
    return Math.min(BASE + Math.ceil(MB * PER_MB), MAX);
  }
  const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

  function withTimeout<T>(promise: Promise<T>, ms: number, label = "Operación"): Promise<T> {
    let timer: number;
    return new Promise<T>((resolve, reject) => {
      timer = window.setTimeout(
        () => reject(new Error(`${label} superó el tiempo límite (${ms} ms)`)),
        ms
      );
      promise.then(resolve).catch(reject).finally(() => clearTimeout(timer));
    });
  }

  type MaskBit = 0 | 1;

  function shuffle<T>(arr: T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /**
   * Asigna una (1) foto por registro.
   * - mask[idx] === 0  -> default.png
   * - mask[idx] === 1  -> una imagen numerada sin repetir (1..20.png) por ciclo
   */
  function assignPhotos<P extends Profile>(
    items: P[],
    basePath = "/planetas",
    mask?: number[]
  ): P[] {
    if (!items.length) return items;

    const N = 20;
    const poolBase = Array.from({ length: N }, (_, i) => `${basePath}/${i + 1}.png`);
    let bag = shuffle(poolBase);
    let bagIdx = 0;

    const takeUniqueNumbered = () => {
      if (bagIdx >= bag.length) {
        // se agotó el bolsillo, rebaraja para permitir más asignaciones
        bag = shuffle(poolBase);
        bagIdx = 0;
      }
      return bag[bagIdx++];
    };

    const defaultPhoto = `${basePath}/default.png`;

    return items.map((p, idx) => {
      const bit: MaskBit = ((mask?.[idx] ?? 1) ? 1 : 0) as MaskBit;

      const photo = bit === 1 ? takeUniqueNumbered() : defaultPhoto;

      // asegúrate de que quede exactamente 1 foto
      const nextPhotos = (p.photos?.length ? p.photos : [photo]).slice(0, 1);

      return { ...p, photos: nextPhotos } as P;
    });
  }


  // ---------- Secuencia automática (después de handleSubmit) ----------
  async function playAutoSequence(decisions: number[]) {
    const STEP_DELAY = 650; // debe ser >= duración anim (0.45s) + margen
    for (const bit of decisions) {
      const dir = bit === 1 ? "right" : "left";
      triggerRef.current += 1;
      setAutoSwipe({ dir, trigger: triggerRef.current });
      await new Promise((r) => setTimeout(r, STEP_DELAY));
    }
  }

  // ---------- Handler ----------
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (!file) {
      setErrorMsg("Selecciona un archivo para comenzar.");
      return;
    }
    const X_MASK = [1, 1, 1, 0, 1];

    setLoading(true);
    const timeoutMs = computeTimeoutMs(file);

    try {
      // 1) Espera obligatoria antes de procesar
      await sleep(timeoutMs);

      // 2) Trabajo: parseo + perfiles + fotos
      await withTimeout((async () => {
        const rows = await parseFileToRows(file);
        console.log("Filas leídas:", rows);
        const built = rowsToProfilesWithMask(rows, X_MASK, { albedo: 0.3 });
        console.log("Perfiles construidos:", built);
        const withPhotos = assignPhotos(built, "./src/planetas", X_MASK);
        console.log("Perfiles generados:", withPhotos);

        // Guardar en el firestore
        withPhotos.forEach(async p => {
          const res = await fetch("https://us-central1-cedar-catfish-473700-s6.cloudfunctions.net/save-exoplanet", {
            method: "POST",
            body: JSON.stringify(p),
            headers: { "Content-Type": "application/json" },
          });
          console.log(`Guardado ${p.name}:`, res.status, await res.text());
        });

        setProfiles(withPhotos);
      })(), Math.max(15000, timeoutMs), "Procesamiento");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Ocurrió un error procesando el archivo.");
    } finally {
      setLoading(false);
      // === Aquí ya terminó handleSubmit (timeout + proceso) ===
      // Dispara la secuencia automática 3s después:
      setTimeout(() => {
        playAutoSequence(X_MASK); // tu guion de 0/1
      }, 3000);
    }
  }

  return (
    <section className="flex flex-col items-center">
      <div className="relative mx-auto w-full max-w-screen-md">
        <SwipeDeck profiles={visible} onSwiped={handleSwiped} autoSwipe={autoSwipe} />

        {/* Overlay MATCH global */}
        {showMatch && (
          <div className="pointer-events-none absolute inset-0 z-[200] flex items-center justify-center">
            <span className="select-none rounded-2xl bg-green-600/80 px-6 py-3 text-3xl font-extrabold text-white shadow-2xl">
              MATCH
            </span>
          </div>
        )}

        {(isEmpty || loading) && (
          <>
            <div className="pointer-events-none absolute inset-0 z-90 rounded-3xl bg-background/40 backdrop-blur-sm" />
            <div className="absolute inset-0 z-100 flex items-center justify-center p-4">
              <form
                onSubmit={handleSubmit}
                className="w-full max-w-md rounded-2xl border bg-background/80 p-5 shadow-lg backdrop-blur-md"
              >
                <p className="mb-2 text-center text-sm text-muted-foreground">
                  {loading ? "Procesando archivo…" : "Sube un archivo para comenzar"}
                </p>

                {errorMsg && (
                  <p className="mb-3 text-center text-sm text-red-500">{errorMsg}</p>
                )}

                <div className="grid gap-3">
                  <label className="text-sm font-medium">
                    Archivo
                    <input
                      type="file"
                      accept=".csv,.xls,.xlsx"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      disabled={loading}
                      className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground disabled:opacity-60"
                    />
                  </label>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Modelo</label>
                    <select
                      value={option}
                      onChange={(e) => setOption(e.target.value)}
                      className="border rounded px-2 py-1"
                      disabled={loading || modelNames.length === 0}
                    >
                      <option value="" disabled>
                        {loading ? "Cargando..." : "Selecciona un modelo"}
                      </option>
                      {modelNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>


                  <Button type="submit" className="mt-1" disabled={loading || !file}>
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                        Cargando…
                      </span>
                    ) : (
                      "Cargar"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>

      {!visible.length && !isEmpty && (
        <div className="mt-6 text-center">
          <p className="text-muted-foreground">¡No hay más perfiles!</p>
        </div>
      )}

      <BottomBar
        onNope={() => swipe("left")}
        onLike={() => swipe("right")}
        onSuperLike={() => swipe("up")}
        onBoost={() => swipe("down")}
        onUndo={undo}
      />
    </section>
  );
}
