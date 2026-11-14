export const MAX_PAGE_SIZE = 50;

export type PageQuery = { page: number; limit: number };

export type Paginated<T> = {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export const toSkip = ({ page, limit }: PageQuery) => (page - 1) * limit;

export function paginate<T>(data: T[], total: number, { page, limit }: PageQuery): Paginated<T> {
  return {
    data,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}
