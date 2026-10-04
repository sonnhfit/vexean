import { reportPreset, reportRangeError } from '../src/utils/reportDates';

describe('report dates in Vietnam', () => {
  it('switches to the next day at midnight in Vietnam', () => {
    expect(reportPreset('today', new Date('2026-08-31T17:00:00Z'))).toEqual({ from: '2026-09-01', to: '2026-09-01' });
    expect(reportPreset('month', new Date('2026-08-31T17:00:00Z'))).toEqual({ from: '2026-09-01', to: '2026-09-01' });
  });
  it('includes seven days across a year boundary', () => {
    expect(reportPreset('week', new Date('2026-01-02T06:00:00Z'))).toEqual({ from: '2025-12-27', to: '2026-01-02' });
  });
  it('validates date order and the inclusive 366 day limit', () => {
    expect(reportRangeError({ from: '2026-08-15', to: '2026-08-15' })).toBeNull();
    expect(reportRangeError({ from: '2024-01-01', to: '2024-12-31' })).toBeNull();
    expect(reportRangeError({ from: '2024-01-01', to: '2025-01-01' })).not.toBeNull();
    expect(reportRangeError({ from: '2026-08-16', to: '2026-08-15' })).not.toBeNull();
  });
});
