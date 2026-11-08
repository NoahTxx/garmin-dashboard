import { Suspense } from "react";
import { DashboardApp } from "@/components/dashboard";

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">Lade Dashboard...</div>}>
      <DashboardApp />
    </Suspense>
  );
}


