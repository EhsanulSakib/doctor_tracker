"use client";

import { m, type Variants } from "motion/react";
import { DashboardIcon, SearchIcon, StethoscopeIcon, UserPlusIcon } from "@/components/ui/icons";
import { EASE_OUT } from "@/lib/motion";

const FEATURES = [
  { icon: StethoscopeIcon, label: "Add and update doctor profiles" },
  { icon: UserPlusIcon, label: "Assign patients to doctors" },
  { icon: SearchIcon, label: "Search, filter and sort records" },
  { icon: DashboardIcon, label: "See patient statistics on the dashboard" },
] as const;

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
};

const title: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.6, ease: EASE_OUT } },
};

const row: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE_OUT } },
};

const iconPop: Variants = {
  hidden: { scale: 0.6, rotate: -12 },
  visible: { scale: 1, rotate: 0, transition: { type: "spring", stiffness: 420, damping: 18 } },
};

/** The headline and feature list over the login photo. */
export function LoginShowcase() {
  return (
    <m.div variants={container} initial="hidden" animate="visible" className="max-w-xl pb-2">
      <m.h2 variants={title} className="text-5xl leading-[1.05] font-semibold tracking-tight text-balance xl:text-6xl">
        Doctor and patient management
      </m.h2>

      <ul className="mt-9 grid gap-3">
        {FEATURES.map(({ icon: Icon, label }) => (
          <m.li
            key={label}
            variants={row}
            whileHover={{ x: 6 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="group flex items-center gap-3.5"
          >
            <m.span
              variants={iconPop}
              className="grid size-10 shrink-0 place-items-center rounded-xl border border-on-photo/20 bg-on-photo/10 backdrop-blur-sm transition-colors duration-200 group-hover:border-on-photo/40 group-hover:bg-on-photo/20"
            >
              <Icon size={20} />
            </m.span>
            <span className="text-lead font-medium text-on-photo/90 transition-colors group-hover:text-on-photo">{label}</span>
          </m.li>
        ))}
      </ul>
    </m.div>
  );
}
