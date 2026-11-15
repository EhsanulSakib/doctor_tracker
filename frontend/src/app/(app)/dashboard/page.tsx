import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { DashboardView } from "@/features/dashboard/components/dashboard-view";
import { getDashboardStats } from "@/features/dashboard/server";
import { DASHBOARD_RANGES, DEFAULT_RANGE } from "@/features/dashboard/types";
import { readEnum } from "@/lib/list-params";

export const metadata: Metadata = { title: "Dashboard" };

/** Server Component: `?range=30d|90d|12m` (anything else → 30 days), one stats request, streamed behind loading.tsx. */
export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const range = readEnum(await searchParams, "range", DASHBOARD_RANGES) ?? DEFAULT_RANGE;
  const stats = await getDashboardStats(range);

  return (
    <>
      <PageHeader title="Dashboard" />
      <DashboardView stats={stats} />
    </>
  );
}
