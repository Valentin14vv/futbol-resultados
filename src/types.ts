export type LeagueId =
  | "premier"
  | "laliga"
  | "seriea"
  | "bundesliga"
  | "ligue1"
  | "champions";

export interface League {
  id: LeagueId;
  name: string;
  shortName: string;
  country: string;
  color: string;
}

export interface Team {
  id: number;
  name: string;
  logo: string;
}

export interface Match {
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
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number | null;
  awayScore: number | null;
  venue: string;
}

export interface StandingRow {
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

/** Solo ligas del plan gratuito de football-data.org */
export const leagues: League[] = [
  { id: "premier", name: "Premier League", shortName: "Premier", country: "Inglaterra", color: "#3D195B" },
  { id: "laliga", name: "La Liga", shortName: "La Liga", country: "España", color: "#E62634" },
  { id: "seriea", name: "Serie A", shortName: "Serie A", country: "Italia", color: "#0B6FB8" },
  { id: "bundesliga", name: "Bundesliga", shortName: "Bundesliga", country: "Alemania", color: "#D20515" },
  { id: "ligue1", name: "Ligue 1", shortName: "Ligue 1", country: "Francia", color: "#0C1C3C" },
  { id: "champions", name: "Champions League", shortName: "Champions", country: "Europa", color: "#0E1E5B" },
];

export type MatchCategory = "finished" | "live" | "scheduled";

export function getMatchCategory(match: Match): MatchCategory {
  const liveStatuses = ["LIVE", "IN_PLAY", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT"];
  if (liveStatuses.includes(match.status)) return "live";
  if (match.status === "SCHEDULED" || match.status === "TIMED") return "scheduled";
  return "finished";
}

export type ViewId = "all" | "last7" | "live" | "next" | "bets" | "table" | LeagueId;

export interface NavItem {
  id: ViewId;
  label: string;
  type: "section" | "league";
}

// ─── Sistema de puntos / apuestas ───────────────────────────────────────────

export type BetOutcome = "1" | "X" | "2";
export type BetStatus = "pending" | "won" | "lost";

export interface Bet {
  id: string;
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  leagueName: string;
  matchDate: string;
  matchTime: string;
  outcome: BetOutcome;
  amount: number;
  status: BetStatus;
  createdAt: number;
  settledAt?: number;
}

export interface PlayerProfile {
  nickname: string;
  points: number;
  lastDailyClaim: string | null;
  bets: Bet[];
  createdAt: number;
}

export const DAILY_BONUS = 100;
export const STARTING_POINTS = 100;
