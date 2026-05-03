import type { Race, Gender } from '../types/demographics';

export interface VenireRow {
  name: string;
  jurorNumber?: string;
  age?: number;
  address?: string;
  zip?: string;
  race?: Race;
  gender?: Gender;
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

// ── Column Mapping Wizard support ──

/** Fields a CSV column can be mapped to. 'skip' means ignore. */
export type MappableField =
  | 'name'
  | 'jurorNumber'
  | 'age'
  | 'address'
  | 'zip'
  | 'race'
  | 'gender'
  | 'skip';

export const MAPPABLE_FIELD_LABELS: Record<MappableField, string> = {
  name: 'Name',
  jurorNumber: 'Juror #',
  age: 'Age',
  address: 'Address',
  zip: 'Zip',
  race: 'Race',
  gender: 'Gender',
  skip: '(skip)',
};

/** Parse CSV headers + first N preview rows without mapping. */
export function parseCsvPreview(
  input: string,
  previewRows = 5
): { headers: string[]; rows: string[][]; totalRows: number } {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [], totalRows: 0 };
  const headers = splitCsvLine(lines[0]);
  const rows: string[][] = [];
  for (let i = 1; i < Math.min(lines.length, 1 + previewRows); i++) {
    rows.push(splitCsvLine(lines[i]));
  }
  return { headers, rows, totalRows: lines.length - 1 };
}

/** Suggest a MappableField for a given raw CSV header. */
export function suggestMapping(header: string): MappableField {
  const h = header.toLowerCase().trim();
  if (/^name$|^full.?name$|^juror.?name$/i.test(h)) return 'name';
  if (/juror.?#|juror.?num|juror.?number|juror.?no/i.test(h)) return 'jurorNumber';
  if (/^age$|^dob$/i.test(h)) return 'age';
  if (/^address$|^street$/i.test(h)) return 'address';
  if (/^zip$|^zip.?code$|^postal$/i.test(h)) return 'zip';
  if (/^race$|^ethnicity$/i.test(h)) return 'race';
  if (/^gender$|^sex$/i.test(h)) return 'gender';
  return 'skip';
}

const RACE_PARSE: Record<string, Race> = {
  black: 'black', b: 'black', 'african american': 'black', 'african-american': 'black',
  white: 'white', w: 'white', caucasian: 'white',
  hispanic: 'hispanic', h: 'hispanic', latino: 'hispanic', latina: 'hispanic',
  asian: 'asian', a: 'asian',
  'native american': 'native-american', 'native-american': 'native-american',
  'pacific islander': 'pacific-islander', 'pacific-islander': 'pacific-islander',
  other: 'other', o: 'other',
};

const GENDER_PARSE: Record<string, Gender> = {
  male: 'male', m: 'male', man: 'male',
  female: 'female', f: 'female', woman: 'female',
  nonbinary: 'nonbinary', 'non-binary': 'nonbinary', nb: 'nonbinary',
};

/** Parse CSV using an explicit column mapping. */
export function parseVenireWithMapping(
  input: string,
  columnMap: MappableField[]
): ParseResult {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return { rows: [], errors: ['No data rows'] };

  const nameCol = columnMap.indexOf('name');
  if (nameCol === -1) return { rows: [], errors: ['No column mapped to Name'] };

  const rows: VenireRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const name = (cells[nameCol] ?? '').trim();
    if (!name) continue;

    const row: VenireRow = { name };

    const numCol = columnMap.indexOf('jurorNumber');
    if (numCol >= 0) row.jurorNumber = cells[numCol]?.trim() || undefined;

    const ageCol = columnMap.indexOf('age');
    if (ageCol >= 0) row.age = parseInt(cells[ageCol]) || undefined;

    const addrCol = columnMap.indexOf('address');
    if (addrCol >= 0) row.address = cells[addrCol]?.trim() || undefined;

    const zipCol = columnMap.indexOf('zip');
    if (zipCol >= 0) row.zip = cells[zipCol]?.trim() || undefined;

    const raceCol = columnMap.indexOf('race');
    if (raceCol >= 0) {
      const raw = (cells[raceCol] ?? '').trim().toLowerCase();
      row.race = RACE_PARSE[raw] ?? 'unknown';
    }

    const genderCol = columnMap.indexOf('gender');
    if (genderCol >= 0) {
      const raw = (cells[genderCol] ?? '').trim().toLowerCase();
      row.gender = GENDER_PARSE[raw] ?? 'unknown';
    }

    rows.push(row);
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
