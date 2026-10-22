import type { LeagueId, Match, StandingRow } from "@/types";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/football-api`;

const headers = {
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

const PAST_DAYS = 5;
const FUTURE_DAYS = 5;

/** Caché en memoria para no quemar el límite de 10 req/min de football-data.org */
const CACHE_TTL_MS = 60_000; // 1 minuto
const cache = new Map<string, { at: number; data: unknown }>();

function cacheGet<T>(key: string): T | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.data as T;
}

function cacheSet(key: string, data: unknown) {
  cache.set(key, { at: Date.now(), data });
}

interface ApiResponse {
  matches: Match[];
  error?: string;
}

async function fetchMatches(params: Record<string, string>): Promise<Match[]> {
  const key = `m:${JSON.stringify(params)}`;
  const cached = cacheGet<Match[]>(key);
  if (cached) return cached;

  const url = new URL(FUNCTION_URL);
  for (const [k, value] of Object.entries(params)) {
    url.searchParams.set(k, value);
  }

  const response = await fetch(url.toString(), { headers });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const msg = body.error ?? `Error del servidor (${response.status})`;
    // Mensaje más claro si es rate limit
    if (String(msg).includes("429") || String(msg).toLowerCase().includes("request limit")) {
      throw new Error(
        "Límite de la API gratis (10 pedidos/min). Esperá ~1 minuto y volvé a intentar."
      );
    }
    throw new Error(msg);
  }

  const data: ApiResponse = await response.json();
  if (data.error) {
    if (String(data.error).includes("429") || String(data.error).toLowerCase().includes("request limit")) {
      throw new Error(
        "Límite de la API gratis (10 pedidos/min). Esperá ~1 minuto y volvé a intentar."
      );
    }
    throw new Error(data.error);
  }
  if (!Array.isArray(data.matches)) throw new Error("Respuesta inválida de la API");

  cacheSet(key, data.matches);
  return data.matches;
}

function dateStr(daysFromNow: number): string {
  const d = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function dedup(matches: Match[]): Match[] {
  const seen = new Set<number>();
  return matches.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}

/** Un solo pedido: últimos 5 + próximos 5 (máx. 10 días del plan gratis) */
export async function fetchAllMatches(): Promise<Match[]> {
  return dedup(
    await fetchMatches({
      league: "all",
      from: dateStr(-PAST_DAYS),
      to: dateStr(FUTURE_DAYS),
    })
  );
}

export async function fetchLast7Days(league?: LeagueId): Promise<Match[]> {
  return fetchMatches({
    league: league ?? "all",
    from: dateStr(-PAST_DAYS),
    to: dateStr(0),
    status: "FINISHED",
  });
}

/** Finalizados de los últimos ~10 días (tope del plan gratis) para calcular G/E/P */
export async function fetchRecentFinished(league: LeagueId): Promise<Match[]> {
  return fetchMatches({
    league,
    from: dateStr(-9),
    to: dateStr(0),
    status: "FINISHED",
  });
}

/** Racha W/D/L por equipo (más reciente al final) */
export function buildFormFromMatches(matches: Match[]): Map<number, string> {
  const byTeam = new Map<number, { ts: number; result: "W" | "D" | "L" }[]>();

  const finished = matches
    .filter((m) => m.homeScore != null && m.awayScore != null)
    .sort((a, b) => a.timestamp - b.timestamp);

  for (const m of finished) {
    const hs = m.homeScore as number;
    const as = m.awayScore as number;
    const homeResult: "W" | "D" | "L" = hs > as ? "W" : hs < as ? "L" : "D";
    const awayResult: "W" | "D" | "L" = as > hs ? "W" : as < hs ? "L" : "D";

    if (!byTeam.has(m.homeTeam.id)) byTeam.set(m.homeTeam.id, []);
    if (!byTeam.has(m.awayTeam.id)) byTeam.set(m.awayTeam.id, []);
    byTeam.get(m.homeTeam.id)!.push({ ts: m.timestamp, result: homeResult });
    byTeam.get(m.awayTeam.id)!.push({ ts: m.timestamp, result: awayResult });
  }

  const forms = new Map<number, string>();
  for (const [teamId, list] of byTeam) {
    forms.set(teamId, list.slice(-5).map((x) => x.result).join(","));
  }
  return forms;
}

export async function fetchLiveMatches(league?: LeagueId): Promise<Match[]> {
  return fetchMatches({
    league: league ?? "all",
    from: dateStr(0),
    to: dateStr(1),
    status: "LIVE",
  });
}

export async function fetchUpcomingMatches(league?: LeagueId): Promise<Match[]> {
  return fetchMatches({
    league: league ?? "all",
    from: dateStr(0),
    to: dateStr(FUTURE_DAYS),
    status: "SCHEDULED,TIMED",
  });
}

export async function fetchLeagueMatches(league: LeagueId): Promise<Match[]> {
  return dedup(
    await fetchMatches({
      league,
      from: dateStr(-PAST_DAYS),
      to: dateStr(FUTURE_DAYS),
    })
  );
}

export async function fetchStandings(
  league: LeagueId
): Promise<{ table: StandingRow[]; competitionName: string }> {
  const key = `s:${league}`;
  const cached = cacheGet<{ table: StandingRow[]; competitionName: string }>(key);
  if (cached) return cached;

  const url = new URL(FUNCTION_URL);
  url.searchParams.set("action", "standings");
  url.searchParams.set("league", league);

  const response = await fetch(url.toString(), { headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const msg = body.error ?? `Error del servidor (${response.status})`;
    if (String(msg).includes("429") || String(msg).toLowerCase().includes("request limit")) {
      throw new Error(
        "Límite de la API gratis (10 pedidos/min). Esperá ~1 minuto y volvé a intentar."
      );
    }
    throw new Error(msg);
  }

  const data = await response.json();
  if (data.error) {
    if (String(data.error).includes("429") || String(data.error).toLowerCase().includes("request limit")) {
      throw new Error(
        "Límite de la API gratis (10 pedidos/min). Esperá ~1 minuto y volvé a intentar."
      );
    }
    throw new Error(data.error);
  }
  if (!Array.isArray(data.table)) {
    throw new Error(
      "No se recibió la tabla. Revisá que la función football-api en Supabase tenga action=standings."
    );
  }

  const result = {
    table: data.table as StandingRow[],
    competitionName: (data.competitionName as string) ?? league,
  };
  cacheSet(key, result);
  return result;
}
