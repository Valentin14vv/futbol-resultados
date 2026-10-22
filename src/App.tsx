import { useCallback, useEffect, useState } from "react";
import {
  RefreshCw,
  AlertCircle,
  Flame,
  TrendingUp,
  Calendar,
  Radio,
  Gift,
} from "lucide-react";
import Header from "@/components/Header";
import Navigation from "@/components/Navigation";
import MatchCard from "@/components/MatchCard";
import { MatchGridSkeleton } from "@/components/Skeletons";
import BetModal from "@/components/BetModal";
import BetsPanel from "@/components/BetsPanel";
import StandingsTable from "@/components/StandingsTable";
import {
  leagues,
  getMatchCategory,
  DAILY_BONUS,
  type Match,
  type ViewId,
  type LeagueId,
  type PlayerProfile,
  type StandingRow,
} from "@/types";
import {
  fetchAllMatches,
  fetchLast7Days,
  fetchLiveMatches,
  fetchUpcomingMatches,
  fetchLeagueMatches,
  fetchStandings,
  fetchRecentFinished,
  buildFormFromMatches,
} from "@/services/footballService";
import {
  getOrCreateProfile,
  claimDailyBonus,
  settleBets,
  updateNickname,
  canClaimDaily,
} from "@/services/bettingService";

type LoadingState = "loading" | "refreshing" | "done" | "error";

const VIEW_TITLES: Record<ViewId, string> = {
  all: "Todos los partidos",
  last7: "Últimos 5 días",
  live: "En vivo",
  next: "Próximos partidos",
  bets: "Apuestas",
  table: "Tablas de posiciones",
  premier: "Premier League",
  laliga: "La Liga",
  seriea: "Serie A",
  bundesliga: "Bundesliga",
  ligue1: "Ligue 1",
  champions: "Champions League",
};

const VIEW_SUBTITLES: Record<ViewId, string> = {
  all: "5 grandes ligas + Champions · finalizados y próximos",
  last7: "Partidos finalizados en los últimos 5 días",
  live: "Partidos en curso (plan gratuito puede tener demora)",
  next: "Próximos 5 días",
  bets: "Bonus diario, partidos para apostar e historial",
  table: "Elegí una liga abajo para ver la tabla actual",
  premier: "Partidos de la Premier League",
  laliga: "Partidos de La Liga",
  seriea: "Partidos de la Serie A",
  bundesliga: "Partidos del Bundesliga",
  ligue1: "Partidos de la Ligue 1",
  champions: "Partidos de la UEFA Champions League",
};

function sortMatches(matches: Match[], view: ViewId): Match[] {
  const sorted = [...matches];
  if (view === "last7") {
    sorted.sort((a, b) => b.timestamp - a.timestamp);
  } else if (view === "next") {
    sorted.sort((a, b) => a.timestamp - b.timestamp);
  } else if (view === "live") {
    sorted.sort((a, b) => (b.minute ?? 0) - (a.minute ?? 0));
  } else {
    const order = { live: 0, scheduled: 1, finished: 2 };
    sorted.sort((a, b) => {
      const ca = getMatchCategory(a);
      const cb = getMatchCategory(b);
      if (ca !== cb) return order[ca] - order[cb];
      return a.timestamp - b.timestamp;
    });
  }
  return sorted;
}

function filterByLeague(matches: Match[], league: LeagueId): Match[] {
  return matches.filter((m) => m.league === league);
}

function groupByDate(matches: Match[]): { date: string; matches: Match[] }[] {
  const groups: Record<string, Match[]> = {};
  for (const m of matches) {
    if (!groups[m.date]) groups[m.date] = [];
    groups[m.date].push(m);
  }
  return Object.entries(groups)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, ms]) => ({ date, matches: ms }));
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

export default function App() {
  const [view, setView] = useState<ViewId>("all");
  const [matches, setMatches] = useState<Match[]>([]);
  const [state, setState] = useState<LoadingState>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const [profile, setProfile] = useState<PlayerProfile>(() => getOrCreateProfile());
  const [betMatch, setBetMatch] = useState<Match | null>(null);
  const [showNickname, setShowNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  // Standings
  const [tableLeague, setTableLeague] = useState<LeagueId>("premier");
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [standingsName, setStandingsName] = useState("");
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const refreshProfile = useCallback(() => {
    setProfile(getOrCreateProfile());
  }, []);

  const loadStandings = useCallback(async (league: LeagueId) => {
    setTableLoading(true);
    setTableError("");
    try {
      // Tabla + partidos recientes para pintar G/E/P (el form de la API gratis suele venir vacío)
      const [data, recent] = await Promise.all([
        fetchStandings(league),
        fetchRecentFinished(league).catch(() => [] as Match[]),
      ]);
      const forms = buildFormFromMatches(recent);
      const table = data.table.map((row) => ({
        ...row,
        // Preferimos la forma calculada; si no hay partidos recientes, usamos la de la API
        form: forms.get(row.teamId) ?? row.form,
      }));
      setStandings(table);
      setStandingsName(data.competitionName);
    } catch (err) {
      setTableError(err instanceof Error ? err.message : "Error al cargar tabla");
      setStandings([]);
    } finally {
      setTableLoading(false);
    }
  }, []);

  const loadData = useCallback(
    async (viewId: ViewId, isRefresh: boolean) => {
      if (viewId === "table") {
        setState("done");
        loadStandings(tableLeague);
        return;
      }

      // En "bets" también cargamos próximos para poder apostar desde esa sección
      setState(isRefresh ? "refreshing" : "loading");
      setErrorMsg("");

      try {
        let data: Match[] = [];

        if (viewId === "all") {
          data = await fetchAllMatches();
        } else if (viewId === "last7") {
          data = await fetchLast7Days();
        } else if (viewId === "live") {
          data = await fetchLiveMatches();
        } else if (viewId === "next" || viewId === "bets") {
          data = await fetchUpcomingMatches();
        } else {
          data = await fetchLeagueMatches(viewId as LeagueId);
        }

        const finished = data.filter((m) => getMatchCategory(m) === "finished");
        if (finished.length > 0) {
          const result = settleBets(finished);
          setProfile({ ...result.profile });
          if (result.won > 0 || result.lost > 0) {
            const parts: string[] = [];
            if (result.won > 0) parts.push(`${result.won} ganada${result.won > 1 ? "s" : ""} (+${result.pointsGained})`);
            if (result.lost > 0) parts.push(`${result.lost} perdida${result.lost > 1 ? "s" : ""}`);
            showToast(`Apuestas liquidadas: ${parts.join(" · ")}`);
          }
        }

        // Si estamos en apuestas, también liquidamos con partidos recientes finalizados
        if (viewId === "bets") {
          try {
            const recent = await fetchLast7Days();
            const fin = recent.filter((m) => getMatchCategory(m) === "finished");
            if (fin.length > 0) {
              const result = settleBets(fin);
              setProfile({ ...result.profile });
              if (result.won > 0 || result.lost > 0) {
                const parts: string[] = [];
                if (result.won > 0) parts.push(`${result.won} ganada${result.won > 1 ? "s" : ""} (+${result.pointsGained})`);
                if (result.lost > 0) parts.push(`${result.lost} perdida${result.lost > 1 ? "s" : ""}`);
                showToast(`Apuestas liquidadas: ${parts.join(" · ")}`);
              }
            }
          } catch {
            /* ignore settle errors */
          }
        }

        setMatches(data);
        setState("done");
        setLastUpdate(new Date());
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Error desconocido");
        setState("error");
      }
    },
    [loadStandings, tableLeague]
  );

  useEffect(() => {
    loadData(view, false);
  }, [view, loadData]);

  useEffect(() => {
    if (view === "table") loadStandings(tableLeague);
  }, [tableLeague, view, loadStandings]);

  useEffect(() => {
    if (view !== "live") return;
    const interval = setInterval(() => loadData(view, true), 60000);
    return () => clearInterval(interval);
  }, [view, loadData]);

  const handleRefresh = () => {
    if (view === "table") loadStandings(tableLeague);
    else loadData(view, true);
  };

  const handleClaimDaily = () => {
    const result = claimDailyBonus();
    if (result) {
      setProfile({ ...result });
      showToast(`+${DAILY_BONUS} puntos diarios cobrados 🎉`);
    } else {
      showToast("Ya cobraste el bonus de hoy");
    }
  };

  const handleSaveNickname = () => {
    const updated = updateNickname(nicknameInput);
    setProfile({ ...updated });
    setShowNickname(false);
    showToast("Apodo actualizado");
  };

  let displayMatches = matches;
  if (view === "last7") {
    displayMatches = matches.filter((m) => getMatchCategory(m) === "finished");
  } else if (view === "live") {
    displayMatches = matches.filter((m) => getMatchCategory(m) === "live");
  } else if (view === "next") {
    displayMatches = matches.filter((m) => getMatchCategory(m) === "scheduled");
  } else if (!["all", "last7", "live", "next", "bets", "table"].includes(view)) {
    displayMatches = filterByLeague(matches, view as LeagueId);
  }

  const sortedDisplay = sortMatches(displayMatches, view);
  const liveCount = matches.filter((m) => getMatchCategory(m) === "live").length;
  const finishedCount = matches.filter((m) => getMatchCategory(m) === "finished").length;
  const scheduledCount = matches.filter((m) => getMatchCategory(m) === "scheduled").length;
  const isLeagueView = !["all", "last7", "live", "next", "bets", "table"].includes(view);
  const pendingMatchIds = new Set(
    profile.bets.filter((b) => b.status === "pending").map((b) => b.matchId)
  );
  const showDailyBanner = canClaimDaily(profile);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header />
      <Navigation selected={view} onSelect={setView} />

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 via-transparent to-transparent" />
        <div
          className="absolute -top-24 right-0 h-72 w-72 rounded-full opacity-10 blur-3xl"
          style={{ backgroundColor: "#10b981" }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-emerald-400">
                {view === "bets"
                  ? "Extra"
                  : view === "table"
                    ? "Clasificación"
                    : "Datos en tiempo real"}
              </p>
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                {VIEW_TITLES[view]}
              </h2>
              <p className="mt-1 max-w-lg text-sm text-slate-400">{VIEW_SUBTITLES[view]}</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={state === "refreshing" || state === "loading" || tableLoading}
              className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition-all hover:bg-emerald-500/20 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${state === "refreshing" || tableLoading ? "animate-spin" : ""}`}
              />
              Actualizar
            </button>
          </div>

          {view === "all" && state === "done" && (
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5">
                <Flame className="h-4 w-4 text-red-400" />
                <span className="text-sm font-bold text-red-300">{liveCount} en vivo</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5">
                <TrendingUp className="h-4 w-4 text-slate-300" />
                <span className="text-sm font-bold text-slate-200">{finishedCount} finalizados</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5">
                <Calendar className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-bold text-amber-300">{scheduledCount} próximos</span>
              </div>
            </div>
          )}

          {lastUpdate && state !== "loading" && view !== "table" && (
            <p className="mt-4 text-xs text-slate-500">
              Última actualización: {lastUpdate.toLocaleTimeString("es-AR")}
            </p>
          )}
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* ── Sección Apuestas (única donde se cobra y se apuesta) ── */}
        {view === "bets" && (
          <div className="space-y-10">
            {/* Perfil + bonus (solo en esta sección) */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setNicknameInput(profile.nickname);
                    setShowNickname(true);
                  }}
                  className="text-sm font-semibold text-slate-200 hover:text-white"
                >
                  {profile.nickname}
                </button>
                <span className="text-sm font-bold tabular-nums text-amber-300">
                  {profile.points.toLocaleString("es-AR")} pts
                </span>
              </div>
              {showDailyBanner ? (
                <button
                  onClick={handleClaimDaily}
                  className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-400"
                >
                  <Gift className="h-4 w-4" />
                  Cobrar +{DAILY_BONUS}
                </button>
              ) : (
                <span className="text-xs text-slate-500">Bonus diario cobrado</span>
              )}
            </div>

            {/* Partidos para apostar */}
            <section>
              <h3 className="mb-1 text-lg font-bold text-white">Partidos para apostar</h3>
              <p className="mb-4 text-sm text-slate-400">
                Partidos programados · si acertás, el doble de lo apostado
              </p>
              {state === "loading" && <MatchGridSkeleton count={3} />}
              {state === "error" && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {errorMsg}
                </div>
              )}
              {state === "done" && (
                (() => {
                  const upcoming = matches
                    .filter((m) => getMatchCategory(m) === "scheduled")
                    .sort((a, b) => a.timestamp - b.timestamp);
                  if (upcoming.length === 0) {
                    return (
                      <p className="rounded-2xl border border-white/10 bg-white/5 py-10 text-center text-sm text-slate-500">
                        No hay partidos próximos para apostar ahora.
                      </p>
                    );
                  }
                  return (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {upcoming.map((match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          showLeague
                          onBet={setBetMatch}
                          hasPendingBet={pendingMatchIds.has(match.id)}
                        />
                      ))}
                    </div>
                  );
                })()
              )}
            </section>

            {/* Historial / pendientes */}
            <BetsPanel profile={profile} />
          </div>
        )}

        {/* Standings */}
        {view === "table" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {leagues.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setTableLeague(l.id)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    tableLeague === l.id
                      ? "text-slate-950 shadow-lg"
                      : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                  style={tableLeague === l.id ? { backgroundColor: l.color } : undefined}
                >
                  {l.shortName}
                </button>
              ))}
            </div>
            {tableError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {tableError}
              </div>
            )}
            <StandingsTable
              table={standings}
              competitionName={standingsName || VIEW_TITLES[tableLeague]}
              leagueId={tableLeague}
              loading={tableLoading}
            />
          </div>
        )}

        {/* Matches loading / error / empty / grid — NO en Apuestas ni Tablas */}
        {view !== "bets" && view !== "table" && state === "loading" && (
          <MatchGridSkeleton count={6} />
        )}

        {view !== "bets" && view !== "table" && state === "error" && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 py-16 text-center">
            <AlertCircle className="mb-4 h-12 w-12 text-red-400" />
            <h3 className="text-lg font-bold text-white">No se pudieron cargar los partidos</h3>
            <p className="mt-2 max-w-md text-sm text-slate-400">{errorMsg}</p>
            <button
              onClick={handleRefresh}
              className="mt-6 flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </button>
          </div>
        )}

        {view !== "bets" && view !== "table" && state === "done" && sortedDisplay.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-16 text-center">
            {view === "live" ? (
              <>
                <Radio className="mb-4 h-12 w-12 text-slate-500" />
                <h3 className="text-lg font-bold text-white">No hay partidos en vivo</h3>
                <p className="mt-2 text-sm text-slate-400">
                  El plan gratuito puede tener demora. Probá más tarde o mirá Próximos.
                </p>
              </>
            ) : (
              <>
                <Calendar className="mb-4 h-12 w-12 text-slate-500" />
                <h3 className="text-lg font-bold text-white">No hay partidos para mostrar</h3>
                <p className="mt-2 text-sm text-slate-400">
                  No se encontraron partidos para esta sección ahora.
                </p>
              </>
            )}
          </div>
        )}

        {view !== "bets" && view !== "table" && state === "done" && sortedDisplay.length > 0 && (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-white">
                {sortedDisplay.length} {sortedDisplay.length === 1 ? "partido" : "partidos"}
              </h3>
            </div>

            {(view === "last7" || isLeagueView) ? (
              (() => {
                const finishedOnly = sortedDisplay.filter(
                  (m) => getMatchCategory(m) === "finished"
                );
                const otherMatches = sortedDisplay.filter(
                  (m) => getMatchCategory(m) !== "finished"
                );
                return (
                  <>
                    {finishedOnly.length > 0 && (
                      <div className="mb-6">
                        <h4 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-400">
                          <TrendingUp className="h-4 w-4" />
                          Finalizados
                        </h4>
                        {groupByDate(finishedOnly).map((group) => (
                          <div key={group.date} className="mb-6">
                            <h5 className="mb-3 text-sm font-semibold text-slate-500">
                              {formatDateHeader(group.date)}
                            </h5>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                              {group.matches.map((match) => (
                                <MatchCard
                                  key={match.id}
                                  match={match}
                                  showLeague={view === "last7" || isLeagueView}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {otherMatches.length > 0 && (
                      <div className="mb-6">
                        <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
                          {otherMatches.some((m) => getMatchCategory(m) === "live")
                            ? "En vivo / Próximos"
                            : "Próximos"}
                        </h4>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {otherMatches.map((match) => (
                            <MatchCard
                              key={match.id}
                              match={match}
                              showLeague={view === "last7" || isLeagueView}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sortedDisplay.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    showLeague={view === "all" || view === "live" || view === "next"}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {state === "refreshing" && view !== "bets" && view !== "table" && (
          <div className="mt-6">
            <MatchGridSkeleton count={3} />
          </div>
        )}
      </main>

      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-slate-500 sm:px-6">
          <p className="font-semibold text-slate-400">Fútbol Resultados</p>
          <p className="mt-1">
            Datos vía football-data.org · Proyecto académico 2026
          </p>
        </div>
      </footer>

      {betMatch && (
        <BetModal
          match={betMatch}
          currentPoints={profile.points}
          onClose={() => setBetMatch(null)}
          onPlaced={() => {
            refreshProfile();
            showToast("Apuesta colocada ✓");
          }}
        />
      )}

      {showNickname && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Tu apodo</h3>
            <p className="mt-1 text-sm text-slate-400">Se guarda solo en este navegador.</p>
            <input
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              maxLength={20}
              className="mt-4 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
              placeholder="Tu nombre"
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setShowNickname(false)}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveNickname}
                className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[110] -translate-x-1/2 rounded-xl border border-emerald-500/30 bg-slate-900 px-5 py-3 text-sm font-semibold text-emerald-300 shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}
