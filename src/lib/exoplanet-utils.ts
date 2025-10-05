// src/lib/exoplanet-utils.ts
const RSUN_AU = 0.00465047;
const REARTH_PER_RSUN = 109.1;

export function toNum(x: any) {
  const n = Number(x);
  return Number.isFinite(n) ? n : NaN;
}
export function estimateRadiusFromDepth(depth_ppm: any, st_rad_rsun: any) {
  const d = toNum(depth_ppm);
  const Rstar = toNum(st_rad_rsun);
  if (!Number.isFinite(d) || d <= 0 || !Number.isFinite(Rstar) || Rstar <= 0) return NaN;
  const delta = d / 1e6;
  const Rp_Rsun = Rstar * Math.sqrt(delta);
  return Rp_Rsun * REARTH_PER_RSUN;
}
export function estimateSmaFromPeriod(period_days: any, st_mass_msun: any) {
  const P = toNum(period_days);
  const M = toNum(st_mass_msun);
  if (!Number.isFinite(P) || P <= 0 || !Number.isFinite(M) || M <= 0) return NaN;
  return Math.cbrt(M) * Math.pow(P / 365.25, 2 / 3);
}
export function estimateTeq(Teff_K: any, st_rad_rsun: any, a_au: any, albedo = 0.3) {
  const Teff = toNum(Teff_K);
  const Rstar = toNum(st_rad_rsun);
  const a = toNum(a_au);
  if (![Teff, Rstar, a].every(Number.isFinite) || a <= 0 || Rstar <= 0) return NaN;
  const Rstar_AU = Rstar * RSUN_AU;
  return Teff * Math.sqrt(Rstar_AU / (2 * a)) * Math.pow(1 - albedo, 0.25);
}
export function estimateInsolation(Teff_K: any, st_rad_rsun: any, a_au: any) {
  const Teff = toNum(Teff_K);
  const Rstar = toNum(st_rad_rsun);
  const a = toNum(a_au);
  if (![Teff, Rstar, a].every(Number.isFinite) || a <= 0 || Rstar <= 0) return NaN;
  const Rstar_AU = Rstar * RSUN_AU;
  return Math.pow(Rstar_AU / a, 2) * Math.pow(Teff / 5777.0, 4);
}
export function classifyByRadius(R: any) {
  const r = toNum(R);
  if (!Number.isFinite(r)) return null;
  if (r < 1.5) return "Terrestre/Super-Tierra pequeña";
  if (r < 2.5) return "Super-Tierra/mini-Neptuno";
  if (r < 4.0) return "Mini-Neptuno";
  if (r < 8.0) return "Neptuno/Sub-Júpiter";
  return "Júpiter-like";
}
export function mapLabel(labelRaw: any) {
  if (typeof labelRaw !== "string") return null;
  const s = labelRaw.trim().toUpperCase();
  if (s === "CONFIRMED" || s === "CP" || s === "PC") return 1;
  if (s === "FALSE POSITIVE" || s === "FP") return 0;
  return null;
}
export function detectSource(row: any) {
  const keys = new Set(Object.keys(row || {}));
  if (keys.has("pl_name") || keys.has("st_mass")) return "DS1";
  if (keys.has("toi") || keys.has("pl_trandep")) return "DS2";
  if (keys.has("koi_period") || keys.has("koi_prad") || keys.has("kepid")) return "DS3";
  return "UNKNOWN";
}
export function harmonizeRow(row: any, source = detectSource(row)) {
  const r = row || {};
  const out: any = {
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
  if (source === "DS1") {
    out.planet_name   = r.pl_name;
    out.host_name     = r.hostname;
    out.period_days   = toNum(r.pl_orbper);
    out.depth_ppm     = NaN;
    out.radius_rearth = toNum(r.pl_rade);
    out.sma_au        = toNum(r.pl_orbsmax);
    out.teq_k         = toNum(r.pl_eqt);
    out.insol_earth   = toNum(r.pl_insol);
    out.ecc           = toNum(r.pl_orbeccen);
    out.st_teff_k     = toNum(r.st_teff);
    out.st_rad_rsun   = toNum(r.st_rad);
    out.st_mass_msun  = toNum(r.st_mass);
    out.mass_mearth   = toNum(r.pl_bmasse);
    out.label_raw     = r.disposition;
  } else if (source === "DS2") {
    out.planet_name   = r.toi;
    out.host_name     = undefined;
    out.period_days   = toNum(r.pl_orbper);
    out.depth_ppm     = toNum(r.pl_trandep);
    out.radius_rearth = toNum(r.pl_rade);
    out.sma_au        = NaN;
    out.teq_k         = toNum(r.pl_eqt);
    out.insol_earth   = toNum(r.pl_insol);
    out.ecc           = NaN;
    out.st_teff_k     = toNum(r.st_teff);
    out.st_rad_rsun   = toNum(r.st_rad);
    out.st_mass_msun  = NaN;
    out.mass_mearth   = NaN;
    out.label_raw     = r.tfopwg_disp;
  } else if (source === "DS3") {
    const name = r.kepler_name || r.kepoi_name;
    out.planet_name   = name;
    out.host_name     = undefined;
    out.period_days   = toNum(r.koi_period);
    out.depth_ppm     = toNum(r.koi_depth);
    out.radius_rearth = toNum(r.koi_prad);
    out.sma_au        = NaN;
    out.teq_k         = toNum(r.koi_teq);
    out.insol_earth   = toNum(r.koi_insol);
    out.ecc           = NaN;
    out.st_teff_k     = toNum(r.koi_steff);
    out.st_rad_rsun   = toNum(r.koi_srad);
    out.st_mass_msun  = NaN;
    out.mass_mearth   = NaN;
    out.label_raw     = r.koi_disposition;
  } else {
    out.planet_name   = r.pl_name || r.toi || r.kepler_name || r.kepoi_name;
    out.period_days   = toNum(r.pl_orbper ?? r.koi_period);
    out.depth_ppm     = toNum(r.pl_trandep ?? r.koi_depth);
    out.radius_rearth = toNum(r.pl_rade ?? r.koi_prad);
    out.st_teff_k     = toNum(r.st_teff ?? r.koi_steff);
    out.st_rad_rsun   = toNum(r.st_rad ?? r.koi_srad);
    out.sma_au        = toNum(r.pl_orbsmax);
    out.teq_k         = toNum(r.pl_eqt ?? r.koi_teq);
    out.insol_earth   = toNum(r.pl_insol ?? r.koi_insol);
    out.label_raw     = r.disposition ?? r.tfopwg_disp ?? r.koi_disposition;
  }
  return out;
}
export function derivePhysical(canRow: any, { albedo = 0.3 } = {}) {
  const row: any = { ...canRow };
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
}
export function processDataset(rows: any[], source?: string) {
  return (rows || []).map((r) => derivePhysical(harmonizeRow(r, source)));
}
export function suggestVisualParams(row: any) {
  const teq = toNum(row.teq_k);
  const R = toNum(row.radius_rearth);
  let palette = "neutral";
  if (Number.isFinite(teq)) {
    if (teq >= 1500) palette = "hot-gray-red";
    else if (teq >= 800) palette = "warm-gray";
    else if (teq >= 250) palette = "blue-white";
    else palette = "ice-white-blue";
  }
  const cls = classifyByRadius(R);
  let texture = "smooth";
  if (cls?.includes("Júpiter") || cls?.includes("Neptuno")) texture = "banded";
  if (cls?.includes("Terrestre")) texture = "clouds-or-rocky";
  return { palette, texture, dayNightContrast: Number.isFinite(row.insol_earth) ? Math.tanh(row.insol_earth / 10) : 0.5 };
}
