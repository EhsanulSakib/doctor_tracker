import { CONDITIONS, GENDERS, PATIENT_STATUSES, type Condition, type Gender, type PatientStatus } from "@/lib/constants";
import { DEFAULT_PAGE_SIZE, orderedRange, readDate, readEnum, readObjectId, readPaging, readString, type RawSearchParams } from "@/lib/list-params";
import { toQueryString, type QueryParams } from "@/lib/utils";
import { DEFAULT_PATIENT_SORT, PATIENT_SORTS, type PatientSort } from "./types";

/** Patient list filters (shared by `/patients` and the doctor profile's patient table). */
export type PatientListParams = {
  page: number;
  limit: number;
  search?: string;
  condition?: Condition;
  status?: PatientStatus;
  gender?: Gender;
  /** /patients only (the doctor profile takes the doctor from its path). */
  doctorId?: string;
  admittedFrom?: string;
  admittedTo?: string;
  sort: PatientSort;
};

export function parsePatientParams(raw: RawSearchParams): PatientListParams {
  const [admittedFrom, admittedTo] = orderedRange(readDate(raw, "admittedFrom"), readDate(raw, "admittedTo"));
  return {
    ...readPaging(raw),
    search: readString(raw, "search", 100),
    condition: readEnum(raw, "condition", CONDITIONS),
    status: readEnum(raw, "status", PATIENT_STATUSES),
    gender: readEnum(raw, "gender", GENDERS),
    doctorId: readObjectId(raw, "doctorId"),
    admittedFrom,
    admittedTo,
    sort: readEnum(raw, "sort", PATIENT_SORTS) ?? DEFAULT_PATIENT_SORT,
  };
}

export function patientQuery(params: PatientListParams): QueryParams {
  return {
    ...params,
    page: params.page > 1 ? params.page : undefined,
    limit: params.limit !== DEFAULT_PAGE_SIZE ? params.limit : undefined,
    sort: params.sort !== DEFAULT_PATIENT_SORT ? params.sort : undefined,
  };
}

/** Same rule as the doctors list: any change but the page number goes back to page 1. */
export function patientsHref(basePath: string, params: PatientListParams, patch: Partial<PatientListParams>): string {
  const keepPage = Object.keys(patch).every((key) => key === "page");
  return `${basePath}${toQueryString(patientQuery({ ...params, ...(keepPage ? {} : { page: 1 }), ...patch }))}`;
}
