import { DashboardIcon, StethoscopeIcon, UsersIcon } from "@/components/ui/icons";

/** The three sections of the portal, in navigation order. */
export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/doctors", label: "Doctors", icon: StethoscopeIcon },
  { href: "/patients", label: "Patients", icon: UsersIcon },
] as const;

/** `/doctors/abc` keeps "Doctors" highlighted. */
export const isActivePath = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);
