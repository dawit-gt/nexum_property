/** Query parameters shared by the paginated admin lists. */
export interface ListParams<S extends string = string> {
  page?: number;
  limit?: number;
  search?: string;
  status?: S | 'ALL';
  /** YYYY-MM-DD, inclusive. */
  dateFrom?: string;
  /** YYYY-MM-DD, inclusive. */
  dateTo?: string;
}