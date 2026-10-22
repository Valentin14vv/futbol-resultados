import { Coins, User } from "lucide-react";
import type { PlayerProfile } from "@/types";

interface PointsBarProps {
  profile: PlayerProfile;
  onOpenProfile: () => void;
  onGoToBets?: () => void;
}

/** Solo muestra puntos y apodo. El bonus diario y apostar están en la sección Apuestas. */
export default function PointsBar({ profile, onOpenProfile, onGoToBets }: PointsBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <button
        onClick={onOpenProfile}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
      >
        <User className="h-4 w-4 text-slate-400" />
        <span className="max-w-[100px] truncate">{profile.nickname}</span>
      </button>

      <button
        type="button"
        onClick={onGoToBets}
        className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 transition hover:bg-amber-500/20"
        title="Ir a Apuestas"
      >
        <Coins className="h-4 w-4 text-amber-400" />
        <span className="text-sm font-bold tabular-nums text-amber-300">
          {profile.points.toLocaleString("es-AR")} pts
        </span>
      </button>
    </div>
  );
}
