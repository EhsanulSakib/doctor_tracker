import "server-only";
import { serverFetch } from "@/lib/api/server-fetch";
import type { ApiData } from "@/lib/api/types";
import type { DashboardRange, DashboardStats } from "./types";

/** One request for the whole dashboard; the API caches it for 60 s and clears it on any write. */
export const getDashboardStats = async (range: DashboardRange) =>
  (await serverFetch<ApiData<DashboardStats>>("/dashboard/stats", { searchParams: { range } })).data;
