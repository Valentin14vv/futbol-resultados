import type { NavItem, ViewId } from "@/types";
import { leagues } from "@/types";
import { Globe, CalendarDays, Radio, CalendarClock, Trophy, Coins, Table2 } from "lucide-react";

interface NavigationProps {
  selected: ViewId;
  onSelect: (id: ViewId) => void;
}

const sectionItems: { id: NavItem["id"]; label: string; icon: typeof Globe }[] = [
  { id: "all", label: "Todos", icon: Globe },
  { id: "last7", label: "Últimos 5 días", icon: CalendarDays },
  { id: "live", label: "En vivo", icon: Radio },
  { id: "next", label: "Próximos", icon: CalendarClock },
  { id: "table", label: "Tablas", icon: Table2 },
  { id: "bets", label: "Apuestas", icon: Coins },
];

export default function Navigation({ selected, onSelect }: NavigationProps) {
  return (
    <nav className="sticky top-[73px] z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex gap-2 overflow-x-auto py-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {sectionItems.map((item) => {
            const Icon = item.icon;
            const isActive = selected === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {leagues.map((league) => {
            const isActive = selected === league.id;
            return (
              <button
                key={league.id}
                onClick={() => onSelect(league.id)}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "text-slate-950 shadow-lg"
                    : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
                style={isActive ? { backgroundColor: league.color } : undefined}
              >
                <Trophy className="h-3.5 w-3.5" />
                {league.shortName}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
