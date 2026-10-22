import type { Bet, BetOutcome, BetStatus, Match, PlayerProfile } from "@/types";
import { DAILY_BONUS, STARTING_POINTS, getMatchCategory } from "@/types";

const STORAGE_KEY = "futbol-resultados-player";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadRaw(): PlayerProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PlayerProfile;
  } catch {
    return null;
  }
}

function save(profile: PlayerProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function getOrCreateProfile(nickname?: string): PlayerProfile {
  const existing = loadRaw();
  if (existing) return existing;

  const profile: PlayerProfile = {
    nickname: nickname?.trim() || "Jugador",
    points: STARTING_POINTS,
    lastDailyClaim: null,
    bets: [],
    createdAt: Date.now(),
  };
  save(profile);
  return profile;
}

export function updateNickname(nickname: string): PlayerProfile {
  const profile = getOrCreateProfile();
  profile.nickname = nickname.trim() || "Jugador";
  save(profile);
  return profile;
}

export function canClaimDaily(profile: PlayerProfile): boolean {
  return profile.lastDailyClaim !== todayStr();
}

export function claimDailyBonus(): PlayerProfile | null {
  const profile = getOrCreateProfile();
  if (!canClaimDaily(profile)) return null;

  profile.points += DAILY_BONUS;
  profile.lastDailyClaim = todayStr();
  save(profile);
  return profile;
}

export function placeBet(
  match: Match,
  outcome: BetOutcome,
  amount: number
): { ok: true; profile: PlayerProfile } | { ok: false; error: string } {
  const profile = getOrCreateProfile();

  if (getMatchCategory(match) !== "scheduled") {
    return { ok: false, error: "Solo se puede apostar a partidos próximos" };
  }

  const already = profile.bets.some(
    (b) => b.matchId === match.id && b.status === "pending"
  );
  if (already) {
    return { ok: false, error: "Ya tenés una apuesta pendiente en este partido" };
  }

  const betAmount = Math.min(Math.floor(amount), profile.points);
  if (betAmount <= 0) {
    return { ok: false, error: "No tenés puntos suficientes" };
  }

  const bet: Bet = {
    id: `${match.id}-${Date.now()}`,
    matchId: match.id,
    homeTeam: match.homeTeam.name,
    awayTeam: match.awayTeam.name,
    leagueName: match.leagueName,
    matchDate: match.date,
    matchTime: match.time,
    outcome,
    amount: betAmount,
    status: "pending",
    createdAt: Date.now(),
  };

  profile.points -= betAmount;
  profile.bets.unshift(bet);
  save(profile);
  return { ok: true, profile };
}

function actualOutcome(match: Match): BetOutcome | null {
  if (match.homeScore == null || match.awayScore == null) return null;
  if (match.homeScore > match.awayScore) return "1";
  if (match.homeScore < match.awayScore) return "2";
  return "X";
}

export interface SettleResult {
  profile: PlayerProfile;
  won: number;
  lost: number;
  pointsGained: number;
}

export function settleBets(finishedMatches: Match[]): SettleResult {
  const profile = getOrCreateProfile();
  const byId = new Map(finishedMatches.map((m) => [m.id, m]));
  let won = 0;
  let lost = 0;
  let pointsGained = 0;

  for (const bet of profile.bets) {
    if (bet.status !== "pending") continue;
    const match = byId.get(bet.matchId);
    if (!match || getMatchCategory(match) !== "finished") continue;

    const actual = actualOutcome(match);
    if (!actual) continue;

    if (actual === bet.outcome) {
      bet.status = "won";
      profile.points += bet.amount * 2;
      pointsGained += bet.amount * 2;
      won += 1;
    } else {
      bet.status = "lost";
      lost += 1;
    }
    bet.settledAt = Date.now();
  }

  if (won > 0 || lost > 0) save(profile);
  return { profile, won, lost, pointsGained };
}

export function getPendingBets(profile: PlayerProfile): Bet[] {
  return profile.bets.filter((b) => b.status === "pending");
}

export function getSettledBets(profile: PlayerProfile): Bet[] {
  return profile.bets.filter((b) => b.status !== "pending");
}

export function outcomeLabel(o: BetOutcome): string {
  if (o === "1") return "Local";
  if (o === "2") return "Visitante";
  return "Empate";
}

export function statusLabel(s: BetStatus): string {
  if (s === "won") return "Ganada";
  if (s === "lost") return "Perdida";
  return "Pendiente";
}

export function winRate(profile: PlayerProfile): number {
  const settled = profile.bets.filter((b) => b.status !== "pending");
  if (settled.length === 0) return 0;
  const wins = settled.filter((b) => b.status === "won").length;
  return Math.round((wins / settled.length) * 100);
}
