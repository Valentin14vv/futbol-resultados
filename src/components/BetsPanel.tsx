import { Coins, Trophy, XCircle, Clock, Percent } from "lucide-react";
import type { PlayerProfile } from "@/types";
import { outcomeLabel, statusLabel, winRate } from "@/services/bettingService";

interface BetsPanelProps {
  profile: PlayerProfile;
}

export default function BetsPanel({ profile }: BetsPanelProps) {
  const pending = profile.bets.filter((b) => b.status === "pending");
  const settled = profile.bets.filter((b) => b.status !== "pending");
  const rate = winRate(profile);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
          <Coins className="mb-2 h-5 w-5 text-amber-400" />
          <p className="text-2xl font-extrabold tabular-nums text-amber-300">
            {profile.points.toLocaleString("es-AR")}
          </p>
          <p className="text-xs text-amber-200/70">Puntos</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <Clock className="mb-2 h-5 w-5 text-slate-400" />
          <p className="text-2xl font-extrabold tabular-nums text-white">{pending.length}</p>
          <p className="text-xs text-slate-400">Pendientes</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <Trophy className="mb-2 h-5 w-5 text-emerald-400" />
          <p className="text-2xl font-extrabold tabular-nums text-emerald-300">
            {settled.filter((b) => b.status === "won").length}
          </p>
          <p className="text-xs text-emerald-200/70">Ganadas</p>
        </div>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
          <XCircle className="mb-2 h-5 w-5 text-red-400" />
          <p className="text-2xl font-extrabold tabular-nums text-red-300">
            {settled.filter((b) => b.status === "lost").length}
          </p>
          <p className="text-xs text-red-200/70">Perdidas</p>
        </div>
        <div className="col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4 sm:col-span-1">
          <Percent className="mb-2 h-5 w-5 text-slate-400" />
          <p className="text-2xl font-extrabold tabular-nums text-white">{rate}%</p>
          <p className="text-xs text-slate-400">Aciertos</p>
        </div>
      </div>

      <section>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
          Apuestas pendientes
        </h3>
        {pending.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/5 py-10 text-center text-sm text-slate-500">
            No tenés apuestas abiertas. Apostá a un partido próximo más arriba.
          </p>
        ) : (
          <div className="space-y-3">
            {pending.map((bet) => (
              <div
                key={bet.id}
                className="rounded-2xl border border-amber-500/20 bg-gradient-to-b from-slate-800/50 to-slate-900/50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">
                      {bet.homeTeam} vs {bet.awayTeam}
                    </p>
                    <p className="text-xs text-slate-400">
                      {bet.leagueName} · {bet.matchDate} {bet.matchTime}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-400">
                    Pendiente
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3 text-sm">
                  <span className="text-slate-300">
                    Apostaste a <strong className="text-white">{outcomeLabel(bet.outcome)}</strong>
                  </span>
                  <span className="font-bold tabular-nums text-amber-300">
                    {bet.amount} → {bet.amount * 2} si acertás
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">Historial</h3>
        {settled.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/5 py-10 text-center text-sm text-slate-500">
            Todavía no se liquidó ninguna apuesta.
          </p>
        ) : (
          <div className="space-y-3">
            {settled.map((bet) => (
              <div
                key={bet.id}
                className={`rounded-2xl border p-4 ${
                  bet.status === "won"
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : "border-red-500/20 bg-red-500/5"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">
                      {bet.homeTeam} vs {bet.awayTeam}
                    </p>
                    <p className="text-xs text-slate-400">
                      {bet.leagueName} · {outcomeLabel(bet.outcome)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      bet.status === "won"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-red-500/15 text-red-400"
                    }`}
                  >
                    {statusLabel(bet.status)}
                  </span>
                </div>
                <div className="mt-2 text-sm font-bold tabular-nums">
                  {bet.status === "won" ? (
                    <span className="text-emerald-400">+{bet.amount * 2} pts</span>
                  ) : (
                    <span className="text-red-400">−{bet.amount} pts</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
