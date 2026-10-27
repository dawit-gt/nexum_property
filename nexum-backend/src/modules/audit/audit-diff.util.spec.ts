import { diffFields } from './audit-diff.util';

describe('diffFields', () => {
  it('returns only the fields that changed, old and new side by side', () => {
    expect(
      diffFields(
        { name: 'North', code: 'N1', isActive: true },
        { name: 'North Tower', code: 'N1', isActive: true },
      ),
    ).toEqual({ oldValue: { name: 'North' }, newValue: { name: 'North Tower' } });
  });

  it('returns null when nothing changed', () => {
    expect(diffFields({ name: 'North' }, { name: 'North' })).toBeNull();
  });

  it('ignores fields that were not submitted', () => {
    expect(diffFields({ name: 'North', address: 'Bole' }, { name: 'North', address: undefined })).toBeNull();
  });

  it('records a cleared field as null', () => {
    expect(diffFields({ address: 'Bole' }, { address: null })).toEqual({
      oldValue: { address: 'Bole' },
      newValue: { address: null },
    });
  });

  it('records a new value for a field that was empty before', () => {
    expect(diffFields({ address: null }, { address: 'Bole' })).toEqual({
      oldValue: { address: null },
      newValue: { address: 'Bole' },
    });
  });

  it('treats a Decimal-like number and a plain number as equal', () => {
    const decimal = { toFixed: () => '1500.00', toString: () => '1500' };
    expect(diffFields({ monthlyRent: decimal }, { monthlyRent: 1500 })).toBeNull();
    expect(diffFields({ monthlyRent: decimal }, { monthlyRent: 1600 })).not.toBeNull();
  });

  it('compares dates by value', () => {
    const same = diffFields(
      { endDate: new Date('2026-03-01T00:00:00.000Z') },
      { endDate: new Date('2026-03-01T00:00:00.000Z') },
    );
    expect(same).toBeNull();
  });
});