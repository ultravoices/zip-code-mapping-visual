export interface ZipCodeEntry {
  zip: string;
  label?: string;
  state: 'MO' | 'IL';
  enabled: boolean;
  source: 'official' | 'custom';
}

export interface ZipCodeBoundary {
  zip: string;
  geojson: GeoJSON.Feature | null;
  fetchedAt: number;
}

export type BoundaryCache = Record<string, ZipCodeBoundary>;

// ── County / Municipality types ───────────────────────────────────────────────

export interface CountyDef {
  id: string;           // unique key e.g. '29-189'
  name: string;
  stateFips: string;    // '29' MO | '17' IL
  countyFips: string;   // 3-digit FIPS e.g. '189'
  stateName: 'MO' | 'IL';
  /** true = part of the core 8-county STL metro; false = reserved for adjacent county expansion */
  included: boolean;
}

export type MunicipalityType = 'incorporated' | 'cdp';

export interface MunicipalBoundary {
  id: string;             // STATE+PLACE e.g. '29-62030'
  name: string;
  type: MunicipalityType;
  lsadc: string;          // TIGER place type code
  geojson: GeoJSON.Feature;
}

export interface CountyData {
  countyId: string;
  boundary: GeoJSON.Feature | null;
  municipalities: MunicipalBoundary[];
  fetchedAt: number;
}

export type CountyCache = Record<string, CountyData>;
