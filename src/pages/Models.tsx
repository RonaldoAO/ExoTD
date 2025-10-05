import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type ApiJob = {
  job_id: string;
  model_name: string;
  status: "completed" | "error" | "running" | "pending" | string;
  params?: { algorithm?: string;[k: string]: any };
  results?: {
    f1_score?: number; // 0..1
    classification_report?: { accuracy?: number;[k: string]: any }; // 0..1
    [k: string]: any;
  };
  completed_at?: string;
  failed_at?: string;
  created_at?: string;
  error_message?: string;
};

type ModelRow = {
  id: string;
  nombre: string;
  algoritmo: string;
  fecha: string;      // formateada
  exactitud: number;  // 0..100
  estatus: "Entrenado" | "Analizando" | "Error";
  _raw?: ApiJob;      // por si quieres usarlo luego (tooltip, modal, etc.)
};

const API_URL =
  "https://us-central1-cedar-catfish-473700-s6.cloudfunctions.net/exo-scout-jobs-api/jobs";

export default function Models() {
  const [rows, setRows] = useState<ModelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [option, setOption] = useState<string>("gradient_boosting");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [dataSource] = useState<string>("kepler"); // opcional
  const ORCHESTRATOR_URL =
  "https://us-central1-cedar-catfish-473700-s6.cloudfunctions.net/exo-scout-orchestrator";



  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
  };

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(API_URL, { method: "GET", signal: ac.signal });
        const raw = await res.clone().text();

        if (!res.ok) {
          throw new Error(`HTTP ${res.status} – ${raw.slice(0, 300)}`);
        }

        let data: ApiJob[] = JSON.parse(raw);
        console.log("Jobs recibidos:", data);


        data = data.filter(j => j.status != "error"); // filtra jobs inválidos

        const toPct = (n?: number | null) =>
          Number.isFinite(n) ? Math.round(Number(n) * 100) : 0;

        const fmtDate = (s?: string) => {
          if (!s) return "—";
          const d = new Date(s);
          if (isNaN(d.getTime())) return s; // usa tal cual si no parsea
          return d.toLocaleString(); // ajusta si prefieres solo fecha
        };

        const statusToLabel = (s?: string): ModelRow["estatus"] => {
          if (s === "completed") return "Entrenado";
          if (s === "error") return "Error";
          return "Analizando";
        };

        const mapped: ModelRow[] = (Array.isArray(data) ? data : [])
          .map((j) => {
            const metric =
              j.results?.f1_score ??
              j.results?.classification_report?.accuracy ??
              0;

            const fechaRef = j.completed_at || j.failed_at || j.created_at;

            return {
              id: j.job_id || crypto.randomUUID(),
              nombre: j.model_name || "—",
              algoritmo: j.params?.algorithm || "—",
              fecha: fmtDate(fechaRef),
              exactitud: toPct(metric),
              estatus: statusToLabel(j.status),
              _raw: j,
            };
          })
          // opcional: ordenar por fecha (desc)
          .sort((a, b) => {
            const da = new Date(a._raw?.completed_at || a._raw?.failed_at || a._raw?.created_at || 0).getTime();
            const db = new Date(b._raw?.completed_at || b._raw?.failed_at || b._raw?.created_at || 0).getTime();
            return db - da;
          });

        setRows(mapped);
      } catch (e: any) {
        if (e?.name !== "AbortError") setError(e?.message || "No se pudo cargar la información");
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);




  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Selecciona un archivo CSV.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const fd = new FormData();
    fd.append("file", file, file.name);

    // IMPORTANTE: 'params' debe ir como string JSON (igual que en tu curl)
    const params = {
      algorithm: option,
      data_source: dataSource, // opcional (kepler/k2/tess/unknown)
      model_name: name || `modelo_${Date.now()}`, // nombre del modelo
    };
    fd.append("params", JSON.stringify(params));

    const ac = new AbortController();
    try {
      const res = await fetch(ORCHESTRATOR_URL, {
        method: "POST",
        body: fd,
        signal: ac.signal,
        // NO pongas Content-Type; el navegador lo setea con el boundary
      });

      const raw = await res.clone().text();
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${raw.slice(0, 400)}`);
      }

      let json: unknown;
      try { json = JSON.parse(raw); } catch { json = raw; }
      console.log("Respuesta del job:", json);
      setResult(json);
    } catch (err: any) {
      if (err?.name !== "AbortError") setError(err.message || "Error enviando el job");
    } finally {
      setLoading(false);
    }

    return () => ac.abort();
  };


  const renderStatus = (s: ModelRow["estatus"]) => {
    const variant =
      s === "Entrenado" ? "secondary" :
        s === "Analizando" ? "outline" :
          "destructive";
    return <Badge variant={variant}>{s}</Badge>;
  };

  const onCargar = (row: ModelRow) => {
    alert(`Cargar ${row.nombre}`);
  };
  const onActualizar = (row: ModelRow) => {
    alert(`Actualizar ${row.nombre}`);
  };

  const [name, setName] = useState<string>("");

  return (
    <div className="mx-auto">

      <Dialog>

        <Card className="p-4 !w-full !max-w-4xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Mis modelos</h2>
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-muted-foreground" />
                Cargando…
              </div>
            )}
            {!loading && error && (
              <span className="text-sm text-red-500" title={error}>
                Error al cargar
              </span>
            )}
          </div>

          <Table >
            <TableCaption className="text-left">
              {!loading && !error && rows.length === 0 ? "No hay modelos aún." : " "}
            </TableCaption>

            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px] text-center">Nombre</TableHead>
                <TableHead className="text-center">Algoritmo</TableHead>
                <TableHead className="text-center">Fecha</TableHead>
                <TableHead className="text-center">Exactitud</TableHead>
                <TableHead className="text-center">Estatus</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading && Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`} className="text-center">
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <div className="mx-auto h-4 w-24 animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

              {!loading && !error && rows.map((row) => (
                <TableRow key={row.id} className="text-center">
                  <TableCell className="font-medium">{row.nombre}</TableCell>
                  <TableCell>{row.algoritmo}</TableCell>
                  <TableCell>{row.fecha}</TableCell>
                  <TableCell>{`${row.exactitud}%`}</TableCell>
                  <TableCell>{renderStatus(row.estatus)}</TableCell>
                  <TableCell className="text-center">
                    <Button className="mr-2" onClick={() => onCargar(row)}>Cargar</Button>
                    <Button variant="secondary" onClick={() => onActualizar(row)}>Actualizar</Button>
                  </TableCell>
                </TableRow>
              ))}

              {!loading && error && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-red-500">
                    {error}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <DialogTrigger><Button className="mt-4 w-full">Ingresar nueva información</Button></DialogTrigger>

        </Card>


        <DialogContent>
          <DialogHeader>
            <DialogTitle>Entrenamiento de modelo</DialogTitle>
            <DialogDescription>
              Sube un archivo con los datos para iniciar el entrenamiento de un nuevo modelo. Puedes subir archivos en formato CSV o Excel (.xls, .xlsx). Asegúrate de que el archivo contenga las columnas necesarias para el análisis.

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Archivo CSV</label>
                  <input type="file" accept=".csv" onChange={onFileChange} />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Algoritmo</label>
                  <select
                    value={option}
                    onChange={(e) => setOption(e.target.value)}
                    className="border rounded px-2 py-1"
                  >
                    <option value="gradient_boosting">Gradient Boosting</option>
                    <option value="xgboost">XGBoost</option>
                    <option value="random_forest">Random Forest</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Nombre</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="border rounded px-2 py-1" />
                </div>


                <button
                  type="submit"
                  disabled={loading || !file}
                  className="rounded bg-primary px-4 py-2 text-white disabled:opacity-60"
                >
                  {loading ? "Enviando…" : "Entrenar modelo"}
                </button>

                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                {result && (
                  <pre className="mt-3 whitespace-pre-wrap break-words text-xs border rounded p-2 bg-muted">
                    "Información subida correctamente."
                  </pre>
                )}
              </form>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
