import { useState } from "react";
import { X, Coins, Flame, AlertTriangle } from "lucide-react";
import type { BetOutcome, Match } from "@/types";
import { placeBet } from "@/services/bettingService";

interface BetModalProps {
  match: Match;
  currentPoints: number;
  onClose: () => void;
  onPlaced: () => void;
}

const OUTCOMES: { value: BetOutcome; label: string }[] = [
  { value: "1", label: "Local" },
  { value: "X", label: "Empate" },
  { value: "2", label: "Visitante" },
];

export default function BetModal({ match, currentPoints, onClose, onPlaced }: BetModalProps) {
  const [outcome, setOutcome] = useState<BetOutcome>("1");
  const [amount, setAmount] = useState(Math.min(50, currentPoints));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmAllIn, setConfirmAllIn] = useState(false);

  const isAllIn = amount >= currentPoints && currentPoints > 0;

  const handleSubmit = () => {
    if (isAllIn && !confirmAllIn) {
      setConfirmAllIn(true);
      return;
    }

    setError("");
    setSubmitting(true);
    const result = placeBet(match, outcome, amount);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      setConfirmAllIn(false);
      return;
    }
    onPlaced();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
              Apostar puntos
            </p>
            <h3 className="mt-1 text-lg font-bold text-white">
              {match.homeTeam.name} vs {match.awayTeam.name}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              {match.leagueName} · {match.date} {match.time}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm">
          <Coins className="h-4 w-4 text-amber-400" />
          <span className="text-amber-200">
            Tenés <strong className="tabular-nums">{currentPoints}</strong> puntos
          </span>
        </div>

        <p className="mb-2 text-sm font-semibold text-slate-300">¿Quién gana?</p>
        <div className="mb-4 grid grid-cols-3 gap-2">
          {OUTCOMES.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                setOutcome(o.value);
                setConfirmAllIn(false);
              }}
              className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${
                outcome === o.value
                  ? "border-emerald-500 bg-emerald-500 text-slate-950"
                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {o.value === "1" && (
                <span className="block truncate text-[10px] font-medium opacity-80">
                  {match.homeTeam.name}
                </span>
              )}
              {o.value === "2" && (
                <span className="block truncate text-[10px] font-medium opacity-80">
                  {match.awayTeam.name}
                </span>
              )}
              {o.label}
            </button>
          ))}
        </div>

        <p className="mb-2 text-sm font-semibold text-slate-300">¿Cuánto apostás?</p>
        <div className="mb-3 flex gap-2">
          <input
            type="number"
            min={1}
            max={currentPoints}
            value={amount}
            onChange={(e) => {
              setAmount(Math.max(0, Number(e.target.value) || 0));
              setConfirmAllIn(false);
            }}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-lg font-bold tabular-nums text-white outline-none focus:border-emerald-500"
          />
          <button
            onClick={() => {
              setAmount(currentPoints);
              setConfirmAllIn(false);
            }}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/15 px-4 py-3 text-sm font-bold text-red-300 transition hover:bg-red-500/25"
          >
            <Flame className="h-4 w-4" />
            Todo
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {[25, 50, 100].map((n) => (
            <button
              key={n}
              disabled={n > currentPoints}
              onClick={() => {
                setAmount(n);
                setConfirmAllIn(false);
              }}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 disabled:opacity-40 hover:bg-white/10"
            >
              {n}
            </button>
          ))}
        </div>

        {isAllIn && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-3 text-sm text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-bold">All-in de {currentPoints} pts</p>
              <p className="text-xs opacity-90">
                Si acertás → {currentPoints * 2} pts. Si fallás → quedás en 0.
                {confirmAllIn && " Tocá de nuevo para confirmar."}
              </p>
            </div>
          </div>
        )}

        {!isAllIn && amount > 0 && (
          <p className="mb-4 text-center text-xs text-slate-400">
            Si acertás → <strong className="text-emerald-400">+{amount * 2} pts</strong>.
            Si fallás → perdés {amount} pts.
          </p>
        )}

        {error && (
          <p className="mb-3 rounded-lg bg-red-500/15 px-3 py-2 text-center text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting || amount <= 0 || amount > currentPoints}
          className={`w-full rounded-xl py-3.5 text-sm font-bold transition disabled:opacity-50 ${
            isAllIn && confirmAllIn
              ? "bg-red-500 text-white hover:bg-red-400"
              : isAllIn
                ? "bg-red-500/80 text-white hover:bg-red-500"
                : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
          }`}
        >
          {isAllIn
            ? confirmAllIn
              ? "Confirmar ALL-IN"
              : "Apostar TODO (requiere confirmación)"
            : `Apostar ${amount} pts`}
        </button>
      </div>
    </div>
  );
}
