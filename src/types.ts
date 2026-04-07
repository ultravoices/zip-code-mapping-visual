export type StateCode = 'MO' | 'IL' | 'AZ';

export type LocationId = 'stl' | 'tempe';

export interface ZipCodeEntry {
  zip: string;
  label?: string;
  state: StateCode;
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
  stateFips: string;
  countyFips: string;   // 3-digit FIPS e.g. '189'
  stateName: StateCode;
  included: boolean;
}

export type MunicipalityType = 'incorporated' | 'cdp';

export interface MunicipalBoundary {
  id: string;
  name: string;
  type: MunicipalityType;
  lsadc: string;
  geojson: GeoJSON.Feature;
}

export interface CountyData {
  countyId: string;
  boundary: GeoJSON.Feature | null;
  municipalities: MunicipalBoundary[];
  fetchedAt: number;
}

export type CountyCache = Record<string, CountyData>;

// ── Location config ───────────────────────────────────────────────────────────

export interface LocationConfig {
  id: LocationId;
  label: string;
  center: [number, number]; // [lat, lng]
  zoom: number;
  states: StateCode[];
  zipStorageKey: string;
}
