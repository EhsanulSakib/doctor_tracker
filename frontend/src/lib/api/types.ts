// Response shapes shared by every endpoint. Resource types (Doctor, Patient, DashboardStats) live with
// their features.

export type PageMeta = { page: number; limit: number; total: number; totalPages: number };

/** List endpoints: `{ data: T[], meta }`. */
export type Paginated<T> = { data: T[]; meta: PageMeta };

/** Single-resource endpoints: `{ data: T }`. */
export type ApiData<T> = { data: T };

export type UserRole = "admin";

export type PublicUser = { id: string; name: string; email: string; role: UserRole };
