import { paginate } from './paginate.util';

describe('paginate', () => {
  it('computes total pages', () => {
    expect(paginate([1, 2], 45, 1, 20).meta).toEqual({
      page: 1,
      limit: 20,
      total: 45,
      totalPages: 3,
    });
  });

  it('reports at least one page when there are no results', () => {
    expect(paginate([], 0, 1, 20).meta.totalPages).toBe(1);
  });

  it('fits exactly on full pages', () => {
    expect(paginate([], 40, 2, 20).meta.totalPages).toBe(2);
  });
});
