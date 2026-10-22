import type { Match } from "@/types";
import { getMatchCategory } from "@/types";
import { MapPin, Clock, Coins } from "lucide-react";

interface MatchCardProps {
  match: Match;
  showLeague?: boolean;
  onBet?: (match: Match) => void;
  hasPendingBet?: boolean;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

function TeamCrest({ logo, name, fallbackColor }: { logo: string; name: string; fallbackColor: string }) {
  if (logo) {
    return (
      <img
        src={logo}
        alt={name}
        className="h-10 w-10 shrink-0 rounded-lg bg-white/5 object-contain p-1"
        loading="lazy"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
          const fallback = (e.currentTarget as HTMLImageElement).nextElementSibling;
          if (fallback) (fallback as HTMLElement).style.display = "flex";
        }}
      />
    );
  }
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
      style={{ backgroundColor: fallbackColor }}
    >
      {name.slice(0, 3).toUpperCase()}
    </div>
  );
}

export default function MatchCard({ match, showLeague = false, onBet, hasPendingBet }: MatchCardProps) {
  const category = getMatchCategory(match);
  const isLive = category === "live";
  const isFinished = category === "finished";
  const isScheduled = category === "scheduled";

  const leagueColor =
    {
      premier: "#3D195B",
      laliga: "#E62634",
      seriea: "#0B6FB8",
      bundesliga: "#D20515",
      ligue1: "#0C1C3C",
      champions: "#0E1E5B",
    }[match.league] ?? "#334155";

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-800/50 to-slate-900/50 p-5 transition-all duration-300 hover:border-white/20 hover:shadow-2xl hover:shadow-black/40">
      <div
        className="absolute inset-x-0 top-0 h-1 opacity-80"
        style={{ backgroundColor: leagueColor }}
      />

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showLeague && match.leagueLogo && (
            <img src={match.leagueLogo} alt="" className="h-4 w-4 object-contain" />
          )}
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {match.leagueName}
          </span>
        </div>
        {isLive && (
          <div className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            <span className="text-xs font-bold text-red-400">
              {match.minute ? `${match.minute}'` : "EN VIVO"}
            </span>
          </div>
        )}
        {isFinished && (
          <span className="rounded-full bg-slate-700/50 px-2.5 py-1 text-xs font-semibold text-slate-400">
            Finalizado
          </span>
        )}
        {isScheduled && (
          <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-400">
            Próximo
          </span>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TeamCrest logo={match.homeTeam.logo} name={match.homeTeam.name} fallbackColor={leagueColor} />
            <span className="text-sm font-semibold text-white sm:text-base">
              {match.homeTeam.name}
            </span>
          </div>
          {isScheduled ? (
            <span className="flex items-center gap-1 text-sm font-medium text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              {match.time}
            </span>
          ) : (
            <span
              className={`text-xl font-extrabold tabular-nums ${
                isLive ? "text-emerald-400" : "text-white"
              }`}
            >
              {match.homeScore ?? 0}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TeamCrest logo={match.awayTeam.logo} name={match.awayTeam.name} fallbackColor={leagueColor} />
            <span className="text-sm font-semibold text-white sm:text-base">
              {match.awayTeam.name}
            </span>
          </div>
          {isScheduled ? (
            <span className="text-sm font-medium text-slate-500">vs</span>
          ) : (
            <span
              className={`text-xl font-extrabold tabular-nums ${
                isLive ? "text-emerald-400" : "text-white"
              }`}
            >
              {match.awayScore ?? 0}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
        {match.venue ? (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{match.venue}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <MapPin className="h-3 w-3 shrink-0 opacity-50" />
            <span className="truncate">—</span>
          </div>
        )}
        <span className="shrink-0 text-xs font-medium text-slate-500">
          {formatDate(match.date)} · {match.time}
        </span>
      </div>

      {isScheduled && onBet && (
        <div className="mt-3">
          {hasPendingBet ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 py-2 text-center text-xs font-semibold text-amber-300">
              Apuesta pendiente
            </div>
          ) : (
            <button
              onClick={() => onBet(match)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-sm font-bold text-emerald-300 transition hover:bg-emerald-500/20"
            >
              <Coins className="h-4 w-4" />
              Apostar puntos
            </button>
          )}
        </div>
      )}
    </div>
  );
}
