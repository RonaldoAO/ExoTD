// Adaptación del script exoplanet_prompt_builder.js para el BROWSER/FRONTEND.
// - Sin fs ni csv-parse; aquí trabajamos con "rows" (objetos) que ya vienen del parser
//   (usa tu parseFileToRows(file) con PapaParse/XLSX).
// - Mantiene detección DS1/DS2/DS3, normalización, derivación, prompts visuales.
// - Integra la MÁSCARA binaria (1 procesa, 0 ignora) para generar perfiles del SwipeDeck.

// TIPOS BÁSICOS ---------------------------------------------------------------

export type CanonicalRow = {
  planet_name?: string;
  host_name?: string;
  period_days: number;
  depth_ppm: number;
  radius_rearth: number;
  sma_au: number;
  teq_k: number;
  insol_earth: number;
  ecc: number;
  st_teff_k: number;
  st_rad_rsun: number;
  st_mass_msun: number;
  mass_mearth: number;
  label_raw?: string;
  // campos agregados por derivePhysical:
  class_radius?: string | null;
  label_binary?: 1 | 0 | null;
};

export type VisualParams = {
  palette: string;
  texture: string;
  dayNightContrast: number; // 0..1
  tidallyLockedLikely: boolean;
};

export type PromptOutput = {
  planet_name: string | null;
  period_days: number | null;
  radius_rearth: number | null;
  sma_au: number | null;
  teq_k: number | null;
  insol_earth: number | null;
  class_radius: string | null;
  label_binary: 1 | 0 | null;
  visual_params: VisualParams;
  gemini_prompt: string;
  negative_prompt: string;
};

export type Profile = {
  id: string;
  name: string;
  age: number;
  bio: string;
  photos: string[];
  location?: string;
  tags?: string[];
  // acceso al canónico (útil para stats/UX secundaria)
  canonical?: CanonicalRow;
};

// CONSTANTES FÍSICAS ---------------------------------------------------------

const RSUN_AU = 0.00465047;
const REARTH_PER_RSUN = 109.1;

// UTILS NUMÉRICAS ------------------------------------------------------------

const toNum = (x: any) => {
  const n = Number(x);
  return Number.isFinite(n) ? n : NaN;
};

const estimateRadiusFromDepth = (depth_ppm: any, st_rad_rsun: any) => {
  const d = toNum(depth_ppm);
  const Rstar = toNum(st_rad_rsun);
  if (!Number.isFinite(d) || d <= 0 || !Number.isFinite(Rstar) || Rstar <= 0) return NaN;
  const delta = d / 1e6;
  const Rp_Rsun = Rstar * Math.sqrt(delta);
  return Rp_Rsun * REARTH_PER_RSUN;
};

const estimateSmaFromPeriod = (period_days: any, st_mass_msun: any) => {
  const P = toNum(period_days);
  const M = toNum(st_mass_msun);
  if (!Number.isFinite(P) || P <= 0 || !Number.isFinite(M) || M <= 0) return NaN;
  return Math.cbrt(M) * Math.pow(P / 365.25, 2 / 3);
};

const estimateTeq = (Teff_K: any, st_rad_rsun: any, a_au: any, albedo = 0.3) => {
  const Teff = toNum(Teff_K);
  const Rstar = toNum(st_rad_rsun);
  const a = toNum(a_au);
  if (![Teff, Rstar, a].every(Number.isFinite) || a <= 0 || Rstar <= 0) return NaN;
  const Rstar_AU = Rstar * RSUN_AU;
  return Teff * Math.sqrt(Rstar_AU / (2 * a)) * Math.pow(1 - albedo, 0.25);
};

const estimateInsolation = (Teff_K: any, st_rad_rsun: any, a_au: any) => {
  const Teff = toNum(Teff_K);
  const Rstar = toNum(st_rad_rsun);
  const a = toNum(a_au);
  if (![Teff, Rstar, a].every(Number.isFinite) || a <= 0 || Rstar <= 0) return NaN;
  const Rstar_AU = Rstar * RSUN_AU;
  return Math.pow(Rstar_AU / a, 2) * Math.pow(Teff / 5777.0, 4);
};

const classifyByRadius = (R: any) => {
  const r = toNum(R);
  if (!Number.isFinite(r)) return null;
  if (r < 1.5) return 'Terrestre/Super-Tierra pequeña';
  if (r < 2.5) return 'Super-Tierra/mini-Neptuno';
  if (r < 4.0) return 'Mini-Neptuno';
  if (r < 8.0) return 'Neptuno/Sub-Júpiter';
  return 'Júpiter-like';
};

const mapLabel = (labelRaw: any) => {
  if (typeof labelRaw !== 'string') return null;
  const s = labelRaw.trim().toUpperCase();
  if (s === 'CONFIRMED' || s === 'CP' || s === 'PC') return 1;
  if (s === 'FALSE POSITIVE' || s === 'FP') return 0;
  return null;
};

// DETECCIÓN / NORMALIZACIÓN --------------------------------------------------

export const detectSource = (row: any) => {
  if (!row) return 'UNKNOWN';
  const keys = new Set(Object.keys(row));
  if (keys.has('pl_name') || keys.has('st_mass')) return 'DS1';
  if (keys.has('toi') || keys.has('pl_trandep')) return 'DS2';
  if (keys.has('koi_period') || keys.has('koi_prad') || keys.has('kepid')) return 'DS3';
  return 'UNKNOWN';
};

export const harmonizeRow = (row: any, source = detectSource(row)): CanonicalRow => {
  const r = row || {};
  const out: CanonicalRow = {
    planet_name: undefined,
    host_name: undefined,
    period_days: NaN,
    depth_ppm: NaN,
    radius_rearth: NaN,
    sma_au: NaN,
    teq_k: NaN,
    insol_earth: NaN,
    ecc: NaN,
    st_teff_k: NaN,
    st_rad_rsun: NaN,
    st_mass_msun: NaN,
    mass_mearth: NaN,
    label_raw: undefined
  };

  if (source === 'DS1') {
    out.planet_name   = (r as any).pl_name;
    out.host_name     = (r as any).hostname;
    out.period_days   = toNum((r as any).pl_orbper);
    out.depth_ppm     = NaN;
    out.radius_rearth = toNum((r as any).pl_rade);
    out.sma_au        = toNum((r as any).pl_orbsmax);
    out.teq_k         = toNum((r as any).pl_eqt);
    out.insol_earth   = toNum((r as any).pl_insol);
    out.ecc           = toNum((r as any).pl_orbeccen);
    out.st_teff_k     = toNum((r as any).st_teff);
    out.st_rad_rsun   = toNum((r as any).st_rad);
    out.st_mass_msun  = toNum((r as any).st_mass);
    out.mass_mearth   = toNum((r as any).pl_bmasse);
    out.label_raw     = (r as any).disposition;
  } else if (source === 'DS2') {
    out.planet_name   = (r as any).toi;
    out.host_name     = undefined;
    out.period_days   = toNum((r as any).pl_orbper);
    out.depth_ppm     = toNum((r as any).pl_trandep);
    out.radius_rearth = toNum((r as any).pl_rade);
    out.sma_au        = NaN;
    out.teq_k         = toNum((r as any).pl_eqt);
    out.insol_earth   = toNum((r as any).pl_insol);
    out.ecc           = NaN;
    out.st_teff_k     = toNum((r as any).st_teff);
    out.st_rad_rsun   = toNum((r as any).st_rad);
    out.st_mass_msun  = NaN;
    out.mass_mearth   = NaN;
    out.label_raw     = (r as any).tfopwg_disp;
  } else if (source === 'DS3') {
    const name = (r as any).kepler_name || (r as any).kepoi_name;
    out.planet_name   = name;
    out.host_name     = undefined;
    out.period_days   = toNum((r as any).koi_period);
    out.depth_ppm     = toNum((r as any).koi_depth);
    out.radius_rearth = toNum((r as any).koi_prad);
    out.sma_au        = NaN;
    out.teq_k         = toNum((r as any).koi_teq);
    out.insol_earth   = toNum((r as any).koi_insol);
    out.ecc           = NaN;
    out.st_teff_k     = toNum((r as any).koi_steff);
    out.st_rad_rsun   = toNum((r as any).koi_srad);
    out.st_mass_msun  = NaN;
    out.mass_mearth   = NaN;
    out.label_raw     = (r as any).koi_disposition;
  } else {
    // genérico/mixto
    out.planet_name   = (r as any).pl_name || (r as any).toi || (r as any).kepler_name || (r as any).kepoi_name;
    out.period_days   = toNum((r as any).pl_orbper ?? (r as any).koi_period);
    out.depth_ppm     = toNum((r as any).pl_trandep ?? (r as any).koi_depth);
    out.radius_rearth = toNum((r as any).pl_rade ?? (r as any).koi_prad);
    out.sma_au        = toNum((r as any).pl_orbsmax);
    out.teq_k         = toNum((r as any).pl_eqt ?? (r as any).koi_teq);
    out.insol_earth   = toNum((r as any).pl_insol ?? (r as any).koi_insol);
    out.st_teff_k     = toNum((r as any).st_teff ?? (r as any).koi_steff);
    out.st_rad_rsun   = toNum((r as any).st_rad ?? (r as any).koi_srad);
    out.label_raw     = (r as any).disposition ?? (r as any).tfopwg_disp ?? (r as any).koi_disposition;
  }
  return out;
};

// DERIVACIÓN FÍSICA / VISUAL / PROMPT ---------------------------------------

export const derivePhysical = (canRow: CanonicalRow, { albedo = 0.3 } = {}): CanonicalRow => {
  const row = { ...canRow };

  if (!Number.isFinite(row.radius_rearth) && Number.isFinite(row.depth_ppm) && Number.isFinite(row.st_rad_rsun)) {
    row.radius_rearth = estimateRadiusFromDepth(row.depth_ppm, row.st_rad_rsun);
  }
  if (!Number.isFinite(row.sma_au) && Number.isFinite(row.period_days) && Number.isFinite(row.st_mass_msun)) {
    row.sma_au = estimateSmaFromPeriod(row.period_days, row.st_mass_msun);
  }
  if (!Number.isFinite(row.teq_k) && [row.st_teff_k, row.st_rad_rsun, row.sma_au].every(Number.isFinite)) {
    row.teq_k = estimateTeq(row.st_teff_k, row.st_rad_rsun, row.sma_au, albedo);
  }
  if (!Number.isFinite(row.insol_earth) && [row.st_teff_k, row.st_rad_rsun, row.sma_au].every(Number.isFinite)) {
    row.insol_earth = estimateInsolation(row.st_teff_k, row.st_rad_rsun, row.sma_au);
  }

  row.class_radius = classifyByRadius(row.radius_rearth);
  row.label_binary = mapLabel(row.label_raw);
  return row;
};

export const suggestVisualParams = (row: CanonicalRow): VisualParams => {
  const teq = toNum(row.teq_k);
  const R = toNum(row.radius_rearth);
  const P = toNum(row.period_days);

  let palette = 'neutral';
  if (Number.isFinite(teq)) {
    if (teq >= 1500) palette = 'hot-gray-red';
    else if (teq >= 800) palette = 'warm-gray';
    else if (teq >= 250) palette = 'blue-white';
    else palette = 'ice-white-blue';
  }

  const cls = classifyByRadius(R);
  let texture = 'smooth';
  if (cls?.includes('Júpiter') || cls?.includes('Neptuno')) texture = 'banded-clouds';
  if (cls?.includes('Terrestre')) texture = 'clouds-or-rocky';

  const dayNightContrast = Number.isFinite(row.insol_earth) ? Math.tanh(row.insol_earth / 10) : 0.5;
  const tidallyLockedLikely = Number.isFinite(P) && P > 0 && P < 10;

  return { palette, texture, dayNightContrast, tidallyLockedLikely };
};

export const buildGeminiPrompt = (row: CanonicalRow): string => {

  console.log("Building Gemini prompt for row:", row);

  const r = row.radius_rearth;
  const a = row.sma_au;
  const teq = row.teq_k;
  const s = row.insol_earth;
  const cls = row.class_radius;
  const vis = suggestVisualParams(row);

  const hints: string[] = [];
  if (vis.palette === 'hot-gray-red') hints.push('tonos grises oscuros con matices rojizos en el limbo diurno');
  if (vis.palette === 'warm-gray') hints.push('paleta gris cálida con nubes dispersas');
  if (vis.palette === 'blue-white') hints.push('paleta azul cian y blancos por nubes de metano/agua');
  if (vis.palette === 'ice-white-blue') hints.push('paleta muy fría: blancos y azules pálidos');
  if (vis.texture === 'banded-clouds') hints.push('bandas zonales visibles y nubosidad estratificada');
  if (vis.texture === 'clouds-or-rocky') hints.push('textura de nubes rotas o superficie rocosa oscura');
  if (vis.tidallyLockedLikely) hints.push('hemisferio diurno brillante y hemisferio nocturno oscuro (bloqueo por marea probable)');

  const parts = [
    `Renderiza un exoplaneta de tipo "${cls ?? 'desconocido'}" en primer plano, 3D, realista.`,
    `Radio ~ ${Number.isFinite(r) ? r.toFixed(2) + ' R_⊕' : 'N/A'}, semieje mayor ${Number.isFinite(a) ? a.toFixed(3) + ' UA' : 'N/A'}, T_eq ${Number.isFinite(teq) ? Math.round(teq) + ' K' : 'N/A'}, insolación ${Number.isFinite(s) ? s.toFixed(2) + ' S_⊕' : 'N/A'}.`,
    `Usa ${vis.palette.replace(/-/g,' ')} y ${vis.texture.replace(/-/g,' ')}; contraste día/noche ${vis.dayNightContrast.toFixed(2)}.`,
  ];
  if (hints.length) parts.push('Detalles sugeridos: ' + hints.join('; ') + '.');

  console.log("Generated prompt parts:", parts);
  return parts.join(' ');
};

// PIPELINE (BROWSER): rows -> derivados/prompt/perfiles con MÁSCARA -----------

export const processDataset = (rows: any[], source?: string, opts?: { albedo?: number }) =>
  (rows || []).map((r) => derivePhysical(harmonizeRow(r, source), opts));

export const buildPromptOutputs = (derived: CanonicalRow[]): PromptOutput[] =>
  derived.map((row) => ({
    planet_name: row.planet_name ?? null,
    period_days: Number.isFinite(row.period_days) ? row.period_days : null,
    radius_rearth: Number.isFinite(row.radius_rearth) ? row.radius_rearth : null,
    sma_au: Number.isFinite(row.sma_au) ? row.sma_au : null,
    teq_k: Number.isFinite(row.teq_k) ? row.teq_k : null,
    insol_earth: Number.isFinite(row.insol_earth) ? row.insol_earth : null,
    class_radius: row.class_radius ?? null,
    label_binary: row.label_binary ?? null,
    visual_params: suggestVisualParams(row),
    gemini_prompt: buildGeminiPrompt(row),
    negative_prompt: 'no continents visibles, no letras, no marcas de agua, sin anillos salvo que se especifique, estilo fotorrealista astronómico'
  }));

// MASK: 1 = procesar, 0 = ignorar (si la máscara es más corta, por defecto ignorar)
export const applyMask = <T,>(items: T[], mask: number[]) =>
  items.filter((_, i) => (mask[i] ?? 0) === 1);

// MAPEO a Profile para el SwipeDeck
export const rowsToProfilesWithMask = (
  rawRows: any[],
  mask: number[],
  { albedo = 0.3, } = {}
): Profile[] => {
  if (!rawRows?.length) return [];

  const source = detectSource(rawRows[0]);
  // Ojo: algunos pipelines "limpian" y pueden quitar filas.
  // Aún así seguimos indexando por posición y hacemos fallback a rawRows[idx].
  const derivedAll = processDataset(rawRows, source, { albedo });

  return rawRows.map((raw, idx) => {
    // Toma el bit de la máscara para ESTA fila
    const bit = Number(mask?.[idx] ?? 1); // por defecto 1 si no viene
    const isExoplanet = bit === 1;

    // Toma la fila derivada si existe, si no, usa la raw
    const row = derivedAll?.[idx] ?? raw;

    const nameFromRow = row?.planet_name ?? `OBJ-${idx + 1}`;
    const name = isExoplanet ? nameFromRow : "NO ES UN EXOPLANETA";

    const R = toNum(row?.radius_rearth);
    const teq = toNum(row?.teq_k);

    const parts = [
      row?.class_radius && `Clase: ${row.class_radius}`,
      Number.isFinite(teq) && `T_eq≈${Math.round(teq)} K`,
      Number.isFinite(R) && `Radio≈${R.toFixed(1)} R⊕`,
    ].filter(Boolean) as string[];

    // Si quieres “vaciar” bio/tags cuando no es exoplaneta, puedes condicionar aquí.
    // En este ejemplo mantenemos bio/tags informativos aunque sea 0.
    const tags = (() => {
      const v = suggestVisualParams(row);
      return [v.palette, v.texture];
    })();

    return {
      id: `${nameFromRow}-${idx}`, // ID estable incluso si name cambia
      name,
      age: Number.isFinite(R) ? Math.max(18, Math.round(18 + Math.min(R * 2, 50))) : 25,
      bio: parts.length ? parts.join(" · ") : "",
      photos: [], // mantén vacío; luego asignas PNG aleatoria en tu assignPhotos()
      tags,
      canonical: row,
      // opcional: etiqueta útil para tu UI/lógica
      // isExoplanet,
    };
  });
};

