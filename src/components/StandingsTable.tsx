import type { StandingRow, LeagueId } from "@/types";
import { leagues } from "@/types";

interface StandingsTableProps {
  table: StandingRow[];
  competitionName: string;
  leagueId: LeagueId;
  loading?: boolean;
}

/** Últimos 5 resultados: verde = ganado, gris = empate, rojo = perdido, vacío = sin jugar */
function FormDots({ form }: { form: string | null }) {
  // API suele mandar "W,D,L,W,W" o "WDWLW"
  const raw = (form ?? "").replace(/\s/g, "");
  let parts: string[] = [];
  if (raw.includes(",") || raw.includes("|") || raw.includes("-")) {
    parts = raw.split(/[,|-]/).filter(Boolean);
  } else if (raw.length > 0) {
    parts = raw.split("");
  }
  parts = parts.map((p) => p.toUpperCase()).filter((p) => p === "W" || p === "D" || p === "L");
  // Más reciente a la derecha (como la mayoría de tablas)
  const last5 = parts.slice(-5);
  while (last5.length < 5) last5.unshift(""); // huecos a la izquierda = aún no jugados

  const label = (c: string) =>
    c === "W" ? "Ganó" : c === "D" ? "Empató" : c === "L" ? "Perdió" : "Sin jugar";

  return (
    <div className="flex items-center gap-1" title={last5.map(label).join(" · ")}>
      {last5.map((c, i) => {
        if (!c) {
          return (
            <span
              key={i}
              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-600 bg-slate-800/50"
              title="Sin jugar"
            />
          );
        }
        const bg =
          c === "W"
            ? "bg-emerald-500 text-slate-950"
            : c === "D"
              ? "bg-slate-500 text-white"
              : "bg-red-500 text-white";
        return (
          <span
            key={i}
            className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${bg}`}
            title={label(c)}
          >
            {c === "W" ? "G" : c === "D" ? "E" : "P"}
          </span>
        );
      })}
    </div>
  );
}

export default function StandingsTable({
  table,
  competitionName,
  leagueId,
  loading,
}: StandingsTableProps) {
  const league = leagues.find((l) => l.id === leagueId);
  const color = league?.color ?? "#10b981";

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-white/5" />
        ))}
      </div>
    );
  }

  if (table.length === 0) {
    return (
      <p className="rounded-2xl border border-white/10 bg-white/5 py-12 text-center text-sm text-slate-500">
        No hay tabla disponible para esta competición en este momento.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <div
        className="border-b border-white/10 px-4 py-3"
        style={{ background: `linear-gradient(90deg, ${color}33, transparent)` }}
      >
        <h3 className="font-bold text-white">{competitionName}</h3>
        <p className="text-xs text-slate-400">Tabla actual de la temporada</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-slate-400">
              <th className="px-3 py-2.5 font-semibold">#</th>
              <th className="px-3 py-2.5 font-semibold">Equipo</th>
              <th className="px-2 py-2.5 text-center font-semibold">PJ</th>
              <th className="px-2 py-2.5 text-center font-semibold">G</th>
              <th className="px-2 py-2.5 text-center font-semibold">E</th>
              <th className="px-2 py-2.5 text-center font-semibold">P</th>
              <th className="px-2 py-2.5 text-center font-semibold">GF</th>
              <th className="px-2 py-2.5 text-center font-semibold">GC</th>
              <th className="px-2 py-2.5 text-center font-semibold">DG</th>
              <th className="px-2 py-2.5 text-center font-semibold">Pts</th>
              <th className="px-3 py-2.5 font-semibold">Últimos 5</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row) => {
              const top3 = row.position <= 3;
              const bottom = row.position > table.length - 3;
              return (
                <tr
                  key={row.teamId}
                  className={`border-b border-white/5 transition hover:bg-white/5 ${
                    top3 ? "bg-emerald-500/5" : bottom ? "bg-red-500/5" : ""
                  }`}
                >
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${
                        top3
                          ? "bg-emerald-500 text-slate-950"
                          : bottom
                            ? "bg-red-500/80 text-white"
                            : "bg-white/10 text-slate-300"
                      }`}
                    >
                      {row.position}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {row.teamLogo ? (
                        <img
                          src={row.teamLogo}
                          alt=""
                          className="h-6 w-6 object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded bg-white/10" />
                      )}
                      <span className="font-semibold text-white">{row.teamName}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-center tabular-nums text-slate-300">{row.played}</td>
                  <td className="px-2 py-2.5 text-center tabular-nums text-slate-300">{row.won}</td>
                  <td className="px-2 py-2.5 text-center tabular-nums text-slate-300">{row.draw}</td>
                  <td className="px-2 py-2.5 text-center tabular-nums text-slate-300">{row.lost}</td>
                  <td className="px-2 py-2.5 text-center tabular-nums text-slate-300">{row.goalsFor}</td>
                  <td className="px-2 py-2.5 text-center tabular-nums text-slate-300">{row.goalsAgainst}</td>
                  <td
                    className={`px-2 py-2.5 text-center tabular-nums font-semibold ${
                      row.goalDifference > 0
                        ? "text-emerald-400"
                        : row.goalDifference < 0
                          ? "text-red-400"
                          : "text-slate-400"
                    }`}
                  >
                    {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                  </td>
                  <td className="px-2 py-2.5 text-center text-base font-extrabold tabular-nums text-white">
                    {row.points}
                  </td>
                  <td className="px-3 py-2.5">
                    <FormDots form={row.form} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
