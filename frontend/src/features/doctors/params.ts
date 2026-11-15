import {
  CHAMBER_DAY_FILTERS,
  CHAMBER_SHIFTS,
  DOCTOR_STATUSES,
  SPECIALIZATIONS,
  type ChamberDayFilter,
  type ChamberShift,
  type DoctorStatus,
  type Specialization,
} from "@/lib/constants";
import { DEFAULT_PAGE_SIZE, orderedRange, readDate, readEnum, readInt, readPaging, readString, type RawSearchParams } from "@/lib/list-params";
import { toQueryString, type QueryParams } from "@/lib/utils";
import { DEFAULT_DOCTOR_SORT, DOCTOR_SORTS, type DoctorSort } from "./types";

/** `/doctors?…` → the list query, already valid for `GET /api/doctors`. */
export type DoctorListParams = {
  page: number;
  limit: number;
  search?: string;
  specialization?: Specialization;
  hospital?: string;
  status?: DoctorStatus;
  /** Chamber schedule: sits on this day, starting in this part of the day. */
  day?: ChamberDayFilter;
  shift?: ChamberShift;
  joinedFrom?: string;
  joinedTo?: string;
  expMin?: number;
  expMax?: number;
  sort: DoctorSort;
};

export type DoctorFilters = Pick<DoctorListParams, "specialization" | "hospital" | "status" | "day" | "shift" | "joinedFrom" | "joinedTo" | "expMin" | "expMax">;

export function parseDoctorParams(raw: RawSearchParams): DoctorListParams {
  const [joinedFrom, joinedTo] = orderedRange(readDate(raw, "joinedFrom"), readDate(raw, "joinedTo"));
  const [expMin, expMax] = orderedRange(readInt(raw, "expMin", 0, 60), readInt(raw, "expMax", 0, 60));
  return {
    ...readPaging(raw),
    search: readString(raw, "search", 100),
    specialization: readEnum(raw, "specialization", SPECIALIZATIONS),
    hospital: readString(raw, "hospital", 120),
    status: readEnum(raw, "status", DOCTOR_STATUSES),
    day: readEnum(raw, "day", CHAMBER_DAY_FILTERS),
    shift: readEnum(raw, "shift", CHAMBER_SHIFTS),
    joinedFrom,
    joinedTo,
    expMin,
    expMax,
    sort: readEnum(raw, "sort", DOCTOR_SORTS) ?? DEFAULT_DOCTOR_SORT,
  };
}

/** Query for the API and the URL; defaults are left out so URLs stay short. */
export function doctorQuery(params: DoctorListParams): QueryParams {
  return {
    ...params,
    page: params.page > 1 ? params.page : undefined,
    limit: params.limit !== DEFAULT_PAGE_SIZE ? params.limit : undefined,
    sort: params.sort !== DEFAULT_DOCTOR_SORT ? params.sort : undefined,
  };
}

/**
 * The list URL after a change. Anything that changes the result set (search, filters, sort, page size)
 * goes back to page 1, so you never land on a page that no longer exists.
 */
export function doctorsHref(params: DoctorListParams, patch: Partial<DoctorListParams>): string {
  const keepPage = Object.keys(patch).every((key) => key === "page");
  return `/doctors${toQueryString(doctorQuery({ ...params, ...(keepPage ? {} : { page: 1 }), ...patch }))}`;
}

export const activeFilterCount = (params: DoctorListParams) =>
  [params.specialization, params.hospital, params.status, params.day, params.shift, params.joinedFrom || params.joinedTo, params.expMin !== undefined || params.expMax !== undefined].filter(
    Boolean,
  ).length;
