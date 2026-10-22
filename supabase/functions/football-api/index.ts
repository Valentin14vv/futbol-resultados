const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const API_BASE = "https://api.football-data.org/v4";

/** Solo competiciones del plan gratuito */
const FREE_LEAGUE_CODES: Record<string, string> = {
  premier: "PL",
  laliga: "PD",
  seriea: "SA",
  bundesliga: "BL1",
  ligue1: "FL1",
  champions: "CL",
};

interface FdMatch {
  id: number;
  status: string;
  minute: number | null;
  utcDate: string;
  competition: {
    id: number;
    name: string;
    code: string;
    emblem: string | null;
    area: { name: string };
  };
  homeTeam: { id: number; name: string; crest: string | null; tla: string | null };
  awayTeam: { id: number; name: string; crest: string | null; tla: string | null };
  score: {
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
  matchday: number | null;
  stage: string | null;
  group: string | null;
  venue: string | null;
}

interface NormalizedMatch {
  id: number;
  league: string;
  leagueName: string;
  leagueLogo: string;
  country: string;
  date: string;
  time: string;
  timestamp: number;
  status: string;
  statusLong: string;
  minute: number | null;
  homeTeam: { id: number; name: string; logo: string };
  awayTeam: { id: number; name: string; logo: string };
  homeScore: number | null;
  awayScore: number | null;
  venue: string;
}

function normalizeMatch(m: FdMatch): NormalizedMatch {
  const leagueKey =
    Object.entries(FREE_LEAGUE_CODES).find(([_, code]) => code === m.competition.code)?.[0] ??
    "unknown";

  const dateObj = new Date(m.utcDate);
  return {
    id: m.id,
    league: leagueKey,
    leagueName: m.competition.name,
    leagueLogo: m.competition.emblem ?? "",
    country: m.competition.area?.name ?? "",
    date: dateObj.toISOString().slice(0, 10),
    time: dateObj.toISOString().slice(11, 16),
    timestamp: Math.floor(dateObj.getTime() / 1000),
    status: m.status,
    statusLong: m.status,
    minute: m.minute,
    homeTeam: {
      id: m.homeTeam.id,
      name: m.homeTeam.name,
      logo: m.homeTeam.crest ?? "",
    },
    awayTeam: {
      id: m.awayTeam.id,
      name: m.awayTeam.name,
      logo: m.awayTeam.crest ?? "",
    },
    homeScore: m.score?.fullTime?.home ?? null,
    awayScore: m.score?.fullTime?.away ?? null,
    venue: m.venue ?? "",
  };
}

async function fetchMatchesFromApi(
  token: string,
  params: Record<string, string>
): Promise<FdMatch[]> {
  const url = new URL(`${API_BASE}/matches`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    headers: { "X-Auth-Token": token },
  });

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 400 && body.toLowerCase().includes("date")) {
      throw new Error(`Rango de fechas inválido (máx. 10 días). ${body}`);
    }
    throw new Error(`football-data.org respondió ${response.status}: ${body}`);
  }

  const data = await response.json();
  return (data.matches ?? []) as FdMatch[];
}

interface StandingRow {
  position: number;
  teamId: number;
  teamName: string;
  teamLogo: string;
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: string | null;
}

async function fetchStandings(
  token: string,
  competitionCode: string
): Promise<{ table: StandingRow[]; competitionName: string }> {
  const url = `${API_BASE}/competitions/${competitionCode}/standings`;
  const response = await fetch(url, {
    headers: { "X-Auth-Token": token },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Standings error ${response.status}: ${body}`);
  }

  const data = await response.json();
  // Prefer TOTAL table
  const standing =
    (data.standings ?? []).find((s: { type: string }) => s.type === "TOTAL") ??
    (data.standings ?? [])[0];

  const table: StandingRow[] = (standing?.table ?? []).map(
    (row: {
      position: number;
      team: { id: number; name: string; crest: string | null };
      playedGames: number;
      won: number;
      draw: number;
      lost: number;
      goalsFor: number;
      goalsAgainst: number;
      goalDifference: number;
      points: number;
      form: string | null;
    }) => ({
      position: row.position,
      teamId: row.team.id,
      teamName: row.team.name,
      teamLogo: row.team.crest ?? "",
      played: row.playedGames,
      won: row.won,
      draw: row.draw,
      lost: row.lost,
      goalsFor: row.goalsFor,
      goalsAgainst: row.goalsAgainst,
      goalDifference: row.goalDifference,
      points: row.points,
      form: row.form ?? null,
    })
  );

  return {
    table,
    competitionName: data.competition?.name ?? competitionCode,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const token = Deno.env.get("FOOTBALL_DATA_API_TOKEN");
    if (!token) {
      return new Response(
        JSON.stringify({
          error:
            "Falta el token FOOTBALL_DATA_API_TOKEN en los secretos de Supabase.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "matches";
    const leagueParam = url.searchParams.get("league") ?? "all";

    // ── Standings ──────────────────────────────────────────────────────────
    if (action === "standings") {
      const code = FREE_LEAGUE_CODES[leagueParam];
      if (!code) {
        return new Response(
          JSON.stringify({ error: "Liga no disponible para tabla de posiciones" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const result = await fetchStandings(token, code);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Matches (default) ──────────────────────────────────────────────────
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");
    const statusParam = url.searchParams.get("status");

    let leaguesToFetch: string[];
    if (leagueParam === "all") {
      leaguesToFetch = Object.values(FREE_LEAGUE_CODES);
    } else if (FREE_LEAGUE_CODES[leagueParam]) {
      leaguesToFetch = [FREE_LEAGUE_CODES[leagueParam]];
    } else {
      return new Response(JSON.stringify({ error: "Liga no reconocida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const params: Record<string, string> = {
      competitions: leaguesToFetch.join(","),
    };
    if (fromParam) params.dateFrom = fromParam;
    if (toParam) params.dateTo = toParam;
    if (statusParam) params.status = statusParam;

    const rawMatches = await fetchMatchesFromApi(token, params);
    const matches = rawMatches.map(normalizeMatch);

    return new Response(JSON.stringify({ matches }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
