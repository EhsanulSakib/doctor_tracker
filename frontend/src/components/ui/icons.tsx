import type { ReactNode, SVGProps } from "react";

export type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number };

/**
 * Hand-drawn 24×24 stroke icons (no icon library). Decorative by default (`aria-hidden`): the
 * button or label next to an icon carries the accessible name.
 */
function createIcon(name: string, paths: ReactNode) {
  function Icon({ size = 16, strokeWidth = 1.75, ...props }: IconProps) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        focusable={false}
        {...props}
      >
        {paths}
      </svg>
    );
  }
  Icon.displayName = `${name}Icon`;
  return Icon;
}

export const ChevronDownIcon = createIcon("ChevronDown", <path d="M6 9l6 6 6-6" />);
export const ChevronUpIcon = createIcon("ChevronUp", <path d="M6 15l6-6 6 6" />);
export const ChevronLeftIcon = createIcon("ChevronLeft", <path d="M15 6l-6 6 6 6" />);
export const ChevronRightIcon = createIcon("ChevronRight", <path d="M9 6l6 6-6 6" />);
export const ArrowUpIcon = createIcon("ArrowUp", <path d="M12 19V5M6 11l6-6 6 6" />);
export const ArrowDownIcon = createIcon("ArrowDown", <path d="M12 5v14M6 13l6 6 6-6" />);
export const SortIcon = createIcon("Sort", <path d="M8 5v14M4.5 8.5L8 5l3.5 3.5M16 19V5M12.5 15.5L16 19l3.5-3.5" />);
export const CheckIcon = createIcon("Check", <path d="M5 12.5l4.5 4.5L19 7.5" />);
export const XIcon = createIcon("X", <path d="M6 6l12 12M18 6L6 18" />);
export const PlusIcon = createIcon("Plus", <path d="M12 5v14M5 12h14" />);
export const SearchIcon = createIcon(
  "Search",
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </>,
);
export const CalendarIcon = createIcon(
  "Calendar",
  <>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </>,
);
export const FilterIcon = createIcon("Filter", <path d="M4 5h16l-6.2 7.6V19l-3.6-1.8v-4.6z" />);
export const SunIcon = createIcon(
  "Sun",
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.6 4.6L6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" />
  </>,
);
export const MoonIcon = createIcon("Moon", <path d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.3 6.3 0 0 0 10 10z" />);
export const MenuIcon = createIcon("Menu", <path d="M4 7h16M4 12h16M4 17h16" />);
export const PanelLeftIcon = createIcon(
  "PanelLeft",
  <>
    <rect x="3.5" y="4" width="17" height="16" rx="2" />
    <path d="M9.5 4v16" />
  </>,
);
export const InboxIcon = createIcon(
  "Inbox",
  <path d="M3.5 13.5L6 5.5h12l2.5 8v5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5zM3.5 13.5h5l1.5 2.5h4l1.5-2.5h5" />,
);
export const InfoIcon = createIcon(
  "Info",
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 7.6v.01" />
  </>,
);
export const CheckCircleIcon = createIcon(
  "CheckCircle",
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.5l2.8 2.8L16.5 9.5" />
  </>,
);
export const AlertCircleIcon = createIcon(
  "AlertCircle",
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5V13M12 16.4v.01" />
  </>,
);
export const AlertTriangleIcon = createIcon("AlertTriangle", <path d="M12 4l9 15.5H3zM12 10v4M12 16.9v.01" />);
export const TrashIcon = createIcon("Trash", <path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5" />);
export const PencilIcon = createIcon("Pencil", <path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5zM13.5 7l3 3" />);
export const MoreIcon = createIcon(
  "More",
  <>
    <circle cx="6" cy="12" r="1" fill="currentColor" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
    <circle cx="18" cy="12" r="1" fill="currentColor" />
  </>,
);
export const DashboardIcon = createIcon(
  "Dashboard",
  <>
    <rect x="3.5" y="3.5" width="7" height="9" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" />
    <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" />
    <rect x="3.5" y="15.5" width="7" height="5" rx="1.5" />
  </>,
);
export const StethoscopeIcon = createIcon(
  "Stethoscope",
  <>
    <path d="M5.5 3.5H4v5a4.5 4.5 0 0 0 9 0v-5h-1.5M8.5 13v1.5a5.5 5.5 0 0 0 11 0v-2" />
    <circle cx="19.5" cy="10.5" r="2" />
  </>,
);
export const UsersIcon = createIcon(
  "Users",
  <>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.7a3.5 3.5 0 0 1 0 6.6M21.5 20a6.5 6.5 0 0 0-4-6" />
  </>,
);
export const LogOutIcon = createIcon("LogOut", <path d="M9.5 4H6a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 6 20h3.5M14.5 8l4 4-4 4M18.5 12H9" />);
export const PhoneIcon = createIcon(
  "Phone",
  <path d="M6.5 3.5h3l1.5 4-2 1.2a10 10 0 0 0 5.3 5.3l1.2-2 4 1.5v3a2 2 0 0 1-2 2A15 15 0 0 1 4.5 5.5a2 2 0 0 1 2-2z" />,
);
export const MailIcon = createIcon(
  "Mail",
  <>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
    <path d="M4 7l8 6 8-6" />
  </>,
);
export const EyeIcon = createIcon(
  "Eye",
  <>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
  </>,
);
export const EyeOffIcon = createIcon(
  "EyeOff",
  <path d="M4 4l16 16M10.6 6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.8 3.6M6.7 7.2A16.5 16.5 0 0 0 2.5 12S6 18.5 12 18.5a9 9 0 0 0 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2" />,
);
export const BellIcon = createIcon(
  "Bell",
  <path d="M6 9.5a6 6 0 1 1 12 0c0 4.5 1.8 6.2 2.5 7H3.5c.7-.8 2.5-2.5 2.5-7zM10 20a2.2 2.2 0 0 0 4 0" />,
);
export const ClockIcon = createIcon(
  "Clock",
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </>,
);
export const GlobeIcon = createIcon(
  "Globe",
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.3 2.4 3.4 5.2 3.4 8.5s-1.1 6.1-3.4 8.5c-2.3-2.4-3.4-5.2-3.4-8.5S9.7 5.9 12 3.5z" />
  </>,
);
export const StarIcon = createIcon(
  "Star",
  <path d="M12 3.8l2.5 5.2 5.6.7-4.1 3.9 1 5.6-5-2.7-5 2.7 1-5.6-4.1-3.9 5.6-.7z" />,
);
export const UserPlusIcon = createIcon(
  "UserPlus",
  <>
    <circle cx="10" cy="8" r="3.5" />
    <path d="M3.5 19.5c.6-3.2 3.2-5.2 6.5-5.2 1.3 0 2.5.3 3.5.9M18 13v6M15 16h6" />
  </>,
);
export const SwapIcon = createIcon("Swap", <path d="M4 8h14M14.5 4.5L18 8l-3.5 3.5M20 16H6M9.5 12.5L6 16l3.5 3.5" />);
