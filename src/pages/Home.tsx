import SwipeDeck from "@/components/swipe/SwipeDeck";
import BottomBar from "@/components/layout/BottomBar";
import { useSwipeDeck } from "@/hooks/useSwipeDeck";
import { PROFILES } from "@/lib/data";
import type { Profile } from "@/lib/types";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { current, rest, swipe, undo, setStack } = useSwipeDeck(PROFILES);
  const [file, setFile] = useState<File | null>(null);
  const [option, setOption] = useState<string>("default");

  const visible = useMemo(
    () => (current ? [current, ...rest] : []),
    [current, rest]
  );

  const handleSwiped = (_: Profile, dir: any) => {
    swipe(dir);
  };

  const isEmpty = PROFILES.length === 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: aquí conectas tu lógica de carga
    // file -> archivo seleccionado
    // option -> valor del select
    console.log("Cargar con:", { file, option });
  };

  return (
    <section className="flex flex-col items-center">
      {/* Contenedor del deck para poder superponer el blur y el formulario */}
      <div className="relative mx-auto w-full max-w-screen-md">
        <SwipeDeck profiles={visible} onSwiped={handleSwiped} />

        {isEmpty && (
          <>
            {/* Capa de blur sobre el deck */}
            <div className="pointer-events-none absolute inset-0 z-90 h-screen bg-background/40 backdrop-blur-sm rounded-3xl " />

            {/* Panel de carga */}
            <div className="absolute inset-0 z-100 flex items-center justify-center p-4">
              <form
                onSubmit={handleSubmit}
                className="w-full max-w-md rounded-2xl border bg-background/80 p-5 shadow-lg backdrop-blur-md"
              >
                <p className="mb-4 text-center text-sm text-muted-foreground">
                  Suba un archivo para comenzar la experiencia
                </p>

                <div className="grid gap-3">
                  {/* Archivo */}
                  <label className="text-sm font-medium">
                    Archivo
                    <input
                      type="file"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground"
                    />
                  </label>

                  {/* Select simple */}
                  <label className="text-sm font-medium">
                    Opción
                    <select
                      value={option}
                      onChange={(e) => setOption(e.target.value)}
                      className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      <option value="default">Selecciona una opción</option>
                      <option value="a">Opción A</option>
                      <option value="b">Opción B</option>
                    </select>
                  </label>

                  <Button type="submit" className="mt-1">
                    Cargar
                  </Button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>

      {/* Estado sin perfiles (fallback de recarga de mocks) */}
      {!visible.length && !isEmpty && (
        <div className="mt-6 text-center">
          <p className="text-muted-foreground">¡No hay más perfiles!</p>
          <button
            className="mt-4 text-sm underline"
            onClick={() => setStack(PROFILES)}
          >
            Recargar ejemplos
          </button>
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
