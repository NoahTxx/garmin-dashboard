import React from "react";
import {
  CalendarDays,
  Dumbbell,
  BarChart2,
  Sparkles,
  User,
  RefreshCw,
} from "lucide-react";

export type ApexTab = "today" | "training" | "analytics" | "coach" | "profile";

interface ApexNavigationProps {
  currentTab: ApexTab;
  onSelectTab: (tab: ApexTab) => void;
  syncStatus?: {
    isSyncing: boolean;
    lastSyncText?: string;
    onSync?: () => void;
  };
}

export function ApexSidebar({ currentTab, onSelectTab, syncStatus }: ApexNavigationProps) {
  const navItems: Array<{ id: ApexTab; label: string; icon: React.ReactNode }> = [
    { id: "today", label: "Today", icon: <CalendarDays className="w-4 h-4" /> },
    { id: "training", label: "Training", icon: <Dumbbell className="w-4 h-4" /> },
    { id: "analytics", label: "Analytics", icon: <BarChart2 className="w-4 h-4" /> },
    { id: "coach", label: "Coach", icon: <Sparkles className="w-4 h-4" /> },
    { id: "profile", label: "Profile", icon: <User className="w-4 h-4" /> },
  ];

  return (
    <aside className="hidden md:flex flex-col justify-between w-64 border-r border-white/[0.06] bg-[#0B0F14] p-5 shrink-0 select-none">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xl tracking-tight text-[#F8FAFC]">GRMN</span>
            <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Connect</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[#121821] text-[#F8FAFC] border border-white/[0.08] shadow-sm shadow-black/40"
                    : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.02]"
                }`}
              >
                <span className={isActive ? "text-[#3B82F6]" : "text-[#64748B]"}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sync Status / Footer */}
      <div className="pt-4 border-t border-white/[0.06] space-y-3">
        <div className="flex items-center justify-between text-xs px-2">
          <div className="flex items-center gap-1.5 text-[#34D399]">
            <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
            <span className="font-medium">Garmin Connected</span>
          </div>
          {syncStatus?.onSync && (
            <button
              onClick={syncStatus.onSync}
              disabled={syncStatus.isSyncing}
              title="Garmin Sync starten"
              className="p-1 rounded hover:bg-white/[0.06] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${syncStatus.isSyncing ? "animate-spin text-[#3B82F6]" : ""}`}
              />
            </button>
          )}
        </div>
        <div className="text-[11px] text-[#64748B] px-2">
          {syncStatus?.lastSyncText || "Letzter Sync: heute"}
        </div>
      </div>
    </aside>
  );
}

export function ApexMobileNav({ currentTab, onSelectTab }: ApexNavigationProps) {
  const navItems: Array<{ id: ApexTab; label: string; icon: React.ReactNode }> = [
    { id: "today", label: "Today", icon: <CalendarDays className="w-5 h-5" /> },
    { id: "training", label: "Training", icon: <Dumbbell className="w-5 h-5" /> },
    { id: "analytics", label: "Analytics", icon: <BarChart2 className="w-5 h-5" /> },
    { id: "coach", label: "Coach", icon: <Sparkles className="w-5 h-5" /> },
    { id: "profile", label: "Profile", icon: <User className="w-5 h-5" /> },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0B0F14]/90 backdrop-blur-md border-t border-white/[0.06] px-2 py-1.5 flex items-center justify-around">
      {navItems.map((item) => {
        const isActive = currentTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-lg text-[10px] font-medium transition-colors ${
              isActive ? "text-[#3B82F6]" : "text-[#94A3B8]"
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
