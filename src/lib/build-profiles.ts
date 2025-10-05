// src/lib/build-profiles.ts
import type { Profile } from "@/lib/types";
import { detectSource, processDataset, suggestVisualParams, toNum } from "@/lib/exoplanet-utils";
import { X_MASK } from "@/lib/mask";

// types opcionales:
export type Canonical = ReturnType<typeof processDataset>[number];
export type ProfileEx = Profile & { canonical: Canonical };

function rowToProfile(row: Canonical, idx: number): ProfileEx {
  const name = row.planet_name ?? `OBJ-${idx + 1}`;
  const R = toNum(row.radius_rearth);
  const teq = toNum(row.teq_k);
  const vis = suggestVisualParams(row);

  const age = Number.isFinite(R) ? Math.max(18, Math.round(18 + Math.min(R * 2, 50))) : 25;

  return {
    id: `${name}-${idx}`,
    name,
    age,
    bio: [
      row.class_radius ? `Clase: ${row.class_radius}` : null,
      Number.isFinite(teq) ? `T_eq≈${Math.round(teq)} K` : null,
      Number.isFinite(R) ? `Radio≈${R.toFixed(1)} R⊕` : null,
    ].filter(Boolean).join(" · "),
    location: undefined,
    photos: ["/assets/placeholder-planet.jpg"],
    tags: [vis.palette, vis.texture],
    canonical: row,                    // <--- adjuntamos el objeto canónico completo
  };
}

export function rowsToProfilesWithMask(rows: any[]): ProfileEx[] {
  if (!rows?.length) return [];
  const source = detectSource(rows[0]);
  const derived = processDataset(rows, source);
  const out: ProfileEx[] = [];

  for (let i = 0; i < derived.length; i++) {
    if ((X_MASK[i] ?? 0) !== 1) continue;
    out.push(rowToProfile(derived[i], i));
  }
  return out;
}
