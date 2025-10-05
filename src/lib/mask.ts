// src/lib/mask.ts
export let X_MASK: number[] = [1, 1, 1, 0, 1]; // valor inicial de ejemplo
export const setMask = (arr: number[]) => {
  X_MASK = Array.isArray(arr) ? arr.map((v) => (v ? 1 : 0)) : [];
};
