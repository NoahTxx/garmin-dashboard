import React from "react";
import { TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";
import { ApexMetric } from "@/lib/apex-types";

interface MetricCardProps {
  label: string;
  metric: ApexMetric<number>;
  icon?: React.ReactNode;
  format?: (val: number) => string;
  onClick?: () => void;
  accent?: "default" | "success" | "warning" | "critical" | "energy";
  subValue?: string;
}

export function MetricCard({
  label,
  metric,
  icon,
  format,
  onClick,
  accent = "default",
  subValue,
}: MetricCardProps) {
  const isMissing = metric.status === "MISSING" || metric.value === null;
  const isStale = metric.status === "STALE";

  const accentColor = {
    default: "text-[#F8FAFC]",
    success: "text-[#34D399]",
    warning: "text-[#F59E0B]",
    critical: "text-[#F87171]",
    energy: "text-[#8B5CF6]",
  }[accent];

  const renderValue = () => {
    if (isMissing) {
      return <span className="text-xl font-medium text-[#64748B]">No data</span>;
    }
    const displayVal = format ? format(metric.value!) : metric.value;
    return (
      <div className="flex flex-col">
        <div className="flex items-baseline gap-1.5">
          <span className={`text-3xl md:text-4xl font-semibold tracking-tight tabular-nums ${accentColor}`}>
            {displayVal}
          </span>
          {metric.unit && (
            <span className="text-xs font-medium text-[#94A3B8]">{metric.unit}</span>
          )}
        </div>
        {subValue && (
          <span className="text-xs text-[#94A3B8] font-mono mt-0.5">{subValue}</span>
        )}
      </div>
    );
  };

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col justify-between rounded-2xl bg-[#121821] p-5 border border-white/[0.06] transition-all duration-200 ${
        onClick ? "cursor-pointer hover:border-white/[0.14] hover:bg-[#17202C]" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-medium tracking-wide uppercase text-[#94A3B8]">
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          {isStale && (
            <span
              title="Daten veraltet"
              className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-[#F59E0B]"
            >
              <AlertCircle className="w-3 h-3" /> Stale
            </span>
          )}
          {icon && <div className="text-[#64748B] group-hover:text-[#94A3B8] transition-colors">{icon}</div>}
        </div>
      </div>

      <div className="my-1">{renderValue()}</div>

      <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs">
        {metric.baselineDiff ? (
          <div className="flex items-center gap-1">
            {metric.baselineDiff.trend === "up" && (
              <TrendingUp className="w-3.5 h-3.5 text-[#34D399]" />
            )}
            {metric.baselineDiff.trend === "down" && (
              <TrendingDown className="w-3.5 h-3.5 text-[#F87171]" />
            )}
            {metric.baselineDiff.trend === "flat" && (
              <Minus className="w-3.5 h-3.5 text-[#94A3B8]" />
            )}
            <span
              className={`font-medium tabular-nums ${
                metric.baselineDiff.trend === "up"
                  ? "text-[#34D399]"
                  : metric.baselineDiff.trend === "down"
                  ? "text-[#F87171]"
                  : "text-[#94A3B8]"
              }`}
            >
              {metric.baselineDiff.diffPercent > 0 ? "+" : ""}
              {metric.baselineDiff.diffPercent}%
            </span>
            <span className="text-[#64748B]">{metric.baselineDiff.reference}</span>
          </div>
        ) : (
          <span className="text-[#64748B] text-[11px] truncate">
            {metric.interpretation || (isMissing ? "Pending Garmin sync" : "Normal baseline")}
          </span>
        )}
      </div>
    </div>
  );
}
