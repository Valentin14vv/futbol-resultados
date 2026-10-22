import { Trophy } from "lucide-react";
import type { ReactNode } from "react";

interface HeaderProps {
  rightSlot?: ReactNode;
}

export default function Header({ rightSlot }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/20">
            <Trophy className="h-6 w-6 text-slate-950" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold tracking-tight text-white sm:text-2xl">
              Fútbol <span className="text-emerald-400">Resultados</span>
            </h1>
            <p className="hidden text-xs font-medium text-slate-400 sm:block">
              Resultados en vivo y tablas
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {rightSlot}
        </div>
      </div>
    </header>
  );
}
