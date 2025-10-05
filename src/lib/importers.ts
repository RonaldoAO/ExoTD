// src/lib/importers.ts
import Papa from "papaparse";
import * as XLSX from "xlsx";

export async function parseFileToRows(file: File): Promise<any[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => resolve(res.data as any[]),
        error: reject,
      });
    });
  }
  // xls / xlsx
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const wsName = wb.SheetNames[0];
  const ws = wb.Sheets[wsName];
  return XLSX.utils.sheet_to_json(ws, { defval: null });
}
