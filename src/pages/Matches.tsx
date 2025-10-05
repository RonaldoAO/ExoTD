import MatchItem from "@/components/matches/MatchItem";
import { PROFILES } from "@/lib/data";

export default function Matches() {
  // Muestra todos como “matches” de ejemplo
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {PROFILES.map((p) => (
        <MatchItem key={p.id} p={p} />
      ))}
    </div>
  );
}
