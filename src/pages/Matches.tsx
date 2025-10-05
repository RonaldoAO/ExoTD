import { useEffect, useState } from "react";
import MatchItem from "@/components/matches/MatchItem";
import { PROFILES } from "@/lib/data";
import type { Profile } from "@/lib/types";

const API_URL = "https://us-central1-cedar-catfish-473700-s6.cloudfunctions.net/get-exoplanets"; // TODO: reemplaza por tu endpoint real


export default function Matches() {
  const [items, setItems] = useState<Profile[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(API_URL, {
          method: "GET",
          signal: ac.signal,
          headers: { Accept: "application/json" },
        });

        

        const raw = await res.text();
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${raw.slice(0, 400)}`);
        }

        let data = JSON.parse(raw) as any[];

        console.log("Datos recibidos:", data);

        data = data.map((p) => {if (p.name != "NO ES UN EXOPLANETA") { return p; } });



        // Filtrar SOLO los que NO tengan label_raw = "NO ES UNA EXOPLANETA"
        const filtered = (Array.isArray(data) ? data : [])
          // Normalizar fotos y tipar a Profile
          .map((p) => ({
            ...p,
            photos: Array.isArray(p?.photos)
              ? p.photos.map((ph: string) => String(ph))
              : [],
          })) as Profile[];

        // Si la API devolvió vacío, usamos PROFILES como fallback visual
        setItems(filtered.length ? filtered : PROFILES);
      } catch (e: any) {
       // setError(e?.message || "No se pudo cargar la lista");
        setItems(PROFILES); // fallback a ejemplos
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-48 w-full animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-500">Error: {error}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {(items ?? PROFILES).map((p) => (
            <MatchItem key={p.id} p={p} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(items ?? PROFILES).map((p) => (
        <MatchItem key={p.id} p={p} />
      ))}
    </div>
  );
}
