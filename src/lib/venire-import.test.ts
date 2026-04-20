import { describe, it, expect } from 'vitest';
import { parseVenire } from './venire-import';

describe('parseVenire', () => {
  it('parses CSV with headers: name, juror_number', () => {
    const csv = 'name,juror_number\nAlice Jones,101\nBob Smith,102';
    const { rows, errors } = parseVenire(csv);
    expect(errors).toEqual([]);
    expect(rows.map((r) => r.name)).toEqual(['Alice Jones', 'Bob Smith']);
    expect(rows[0].jurorNumber).toBe('101');
  });

  it('parses JSON array', () => {
    const json = JSON.stringify([
      { name: 'Alice', juror_number: '1' },
      { name: 'Bob', jurorNumber: '2' },
    ]);
    const { rows, errors } = parseVenire(json);
    expect(errors).toEqual([]);
    expect(rows.length).toBe(2);
    expect(rows[0].jurorNumber).toBe('1');
    expect(rows[1].jurorNumber).toBe('2');
  });

  it('reports a clear error on malformed input', () => {
    const { rows, errors } = parseVenire('this is not csv or json!');
    expect(rows).toEqual([]);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('skips empty rows silently', () => {
    const csv = 'name\nAlice\n\n\nBob\n';
    const { rows, errors } = parseVenire(csv);
    expect(errors).toEqual([]);
    expect(rows.map((r) => r.name)).toEqual(['Alice', 'Bob']);
  });
});
