import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { FaSatellite } from "react-icons/fa6";

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
  const SHOW_ACTIONS = false;

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
              <span className="text-sm text-destructive" title={error}>
                Error al cargar
              </span>
            )}
          </div>

          {/* REPLACED TABLE WITH CARDS
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
                  <TableCell colSpan={6} className="text-center text-destructive">
                    {error}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={`skeleton-${i}`} className="h-20 w-full animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay modelos aún.</p>
          ) : (
            <div className="space-y-3">
              {rows.map((row, i) => (
                <div
                  key={row.id}
                  className={`rounded-xl p-4 border border-white/5 bg-gradient-to-br ${[
                    "from-primary/15",
                    "from-secondary/15",
                    "from-accent/15",
                    "from-chart-4/15",
                  ][i % 4]} via-background to-background`}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <FaSatellite className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-base font-semibold leading-tight">{row.nombre}</h3>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="px-2 py-0.5 rounded bg-input/30 text-foreground/80">Algoritmo: {row.algoritmo}</span>
                        <span>{row.fecha}</span>
                        <span className="ml-auto font-medium text-primary">Accuracy: {row.exactitud}%</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs sm:text-sm">
                          <span className="text-muted-foreground">Estatus:</span>
                          {renderStatus(row.estatus)}
                        </div>
                        {SHOW_ACTIONS && (
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={() => onCargar(row)}>Cargar</Button>
                            <Button size="sm" variant="secondary" onClick={() => onActualizar(row)}>Actualizar</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                  <input
                    type="file"
                    accept=".csv"
                    onChange={onFileChange}
                    className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground disabled:opacity-60 dark:border-input dark:bg-input/30"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Algoritmo</label>
                  <select
                    value={option}
                    onChange={(e) => setOption(e.target.value)}
                    className="border rounded px-2 py-1 bg-background text-foreground dark:bg-input/30 dark:border-input"
                  >
                    <option value="gradient_boosting">Gradient Boosting</option>
                    <option value="xgboost">XGBoost</option>
                    <option value="random_forest">Random Forest</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Nombre</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border rounded px-2 py-1 bg-background text-foreground dark:bg-input/30 dark:border-input"
                  />
                </div>


                <button
                  type="submit"
                  disabled={loading || !file}
                  className="rounded bg-primary px-4 py-2 text-white disabled:opacity-60"
                >
                  {loading ? "Enviando…" : "Entrenar modelo"}
                </button>

                {error && <p className="text-destructive text-sm mt-2">{error}</p>}
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
