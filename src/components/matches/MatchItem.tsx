import type { Profile } from "@/lib/types";

export default function MatchItem({ p }: { p: Profile }) {
  const src = p.photos[0];
  return (
    <div className="flex items-center gap-3 rounded-xl border p-3">
      <img src={src} alt={p.name} className="h-12 w-12 rounded-full object-cover" />
      <div>
        <p className="font-medium">{p.name}</p>
        <p className="text-xs text-muted-foreground">{p.bio}</p>
      </div>
    </div>
  );
}
