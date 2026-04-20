export interface VenireRow {
  name: string;
  jurorNumber?: string;
  age?: number;
  address?: string;
  zip?: string;
}

export interface ParseResult {
  rows: VenireRow[];
  errors: string[];
}

export function parseVenire(input: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { rows: [], errors: ['Input is empty'] };

  // Try JSON first
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    return parseJson(trimmed);
  }
  return parseCsv(trimmed);
}

function parseJson(s: string): ParseResult {
  try {
    const parsed = JSON.parse(s);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    const rows: VenireRow[] = [];
    const errors: string[] = [];
    arr.forEach((entry, i) => {
      if (typeof entry !== 'object' || entry === null) {
        errors.push(`Row ${i + 1}: not an object`);
        return;
      }
      const name = (entry.name ?? entry.Name ?? '').toString().trim();
      if (!name) {
        errors.push(`Row ${i + 1}: missing name`);
        return;
      }
      rows.push({
        name,
        jurorNumber:
          entry.jurorNumber?.toString() ??
          entry.juror_number?.toString() ??
          undefined,
        age:
          typeof entry.age === 'number'
            ? entry.age
            : parseInt(entry.age) || undefined,
        address: entry.address ?? undefined,
        zip: entry.zip?.toString() ?? entry.zipcode?.toString() ?? undefined,
      });
    });
    return { rows, errors };
  } catch (e) {
    return {
      rows: [],
      errors: [`Invalid JSON: ${(e as Error).message}`],
    };
  }
}

function parseCsv(s: string): ParseResult {
  const lines = s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { rows: [], errors: ['No lines'] };

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  // Sanity: must contain a name-ish column
  const nameIdx = header.findIndex((h) => h === 'name');
  if (nameIdx === -1) {
    return {
      rows: [],
      errors: [
        'CSV header must include a "name" column. Got: ' + header.join(', '),
      ],
    };
  }
  const numIdx = header.findIndex(
    (h) => h === 'juror_number' || h === 'jurornumber' || h === 'juror#'
  );
  const ageIdx = header.findIndex((h) => h === 'age');
  const addrIdx = header.findIndex((h) => h === 'address');
  const zipIdx = header.findIndex((h) => h === 'zip' || h === 'zipcode');

  const rows: VenireRow[] = [];
  const errors: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const name = (cells[nameIdx] ?? '').trim();
    if (!name) continue;
    rows.push({
      name,
      jurorNumber: numIdx >= 0 ? cells[numIdx]?.trim() || undefined : undefined,
      age: ageIdx >= 0 ? parseInt(cells[ageIdx]) || undefined : undefined,
      address: addrIdx >= 0 ? cells[addrIdx]?.trim() || undefined : undefined,
      zip: zipIdx >= 0 ? cells[zipIdx]?.trim() || undefined : undefined,
    });
  }
  return { rows, errors };
}

function splitCsvLine(line: string): string[] {
  // Minimal CSV parser: supports quoted fields with embedded commas.
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === ',') {
        out.push(cur);
        cur = '';
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out;
}
