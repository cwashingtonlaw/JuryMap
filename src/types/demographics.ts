export type Race =
  | 'black'
  | 'white'
  | 'hispanic'
  | 'asian'
  | 'native-american'
  | 'pacific-islander'
  | 'other'
  | 'unknown';

export const RACE_LABELS: Record<Race, string> = {
  black: 'Black',
  white: 'White',
  hispanic: 'Hispanic',
  asian: 'Asian',
  'native-american': 'Native American',
  'pacific-islander': 'Pacific Islander',
  other: 'Other',
  unknown: 'Unknown',
};

export type Gender = 'male' | 'female' | 'nonbinary' | 'unknown';

export const GENDER_LABELS: Record<Gender, string> = {
  male: 'Male',
  female: 'Female',
  nonbinary: 'Nonbinary',
  unknown: 'Unknown',
};

export type MaritalStatus = 'M' | 'S' | 'D' | 'W' | 'unknown';

export const MARITAL_LABELS: Record<MaritalStatus, string> = {
  M: 'Married',
  S: 'Single',
  D: 'Divorced',
  W: 'Widowed',
  unknown: 'Unknown',
};
