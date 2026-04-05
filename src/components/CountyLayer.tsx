import { GeoJSON, Tooltip } from 'react-leaflet';
import type { CountyDef, CountyCache } from '../types';
import type { StyleFunction } from 'leaflet';

// Visual hierarchy (renders beneath zip code fills):
//   1. County fill — very faint tint; visually marks the unincorporated remainder
//   2. CDP fills — muted rose, dashed border (unincorporated communities)
//   3. Incorporated place fills — teal
//   4. County outline — drawn last so it's always crisp on top

const COUNTY_FILL_MO   = '#a78bfa'; // violet-400
const COUNTY_FILL_IL   = '#fb923c'; // orange-400
const MUNIC_COLOR      = '#0d9488'; // teal-600
const CDP_COLOR        = '#be185d'; // pink-700

interface Props {
  counties: CountyDef[];
  cache: CountyCache;
  /** municipalities visibility per county id */
  municipVis: Record<string, boolean>;
  /** county outline visibility per county id */
  outlineVis: Record<string, boolean>;
}

export function CountyLayer({ counties, cache, municipVis, outlineVis }: Props) {
  return (
    <>
      {counties.map(county => {
        const data = cache[county.id];
        if (!data) return null;

        const countyFill = county.stateName === 'MO' ? COUNTY_FILL_MO : COUNTY_FILL_IL;
        const showMunic   = municipVis[county.id] ?? false;
        const showOutline = outlineVis[county.id] ?? false;

        return (
          <span key={county.id}>
            {/* ── County background fill (unincorporated remainder) ── */}
            {showMunic && data.boundary && (
              <GeoJSON
                key={`${county.id}-fill`}
                data={data.boundary}
                style={() => ({
                  color: 'transparent',
                  weight: 0,
                  fillColor: countyFill,
                  fillOpacity: 0.06,
                })}
              />
            )}

            {/* ── CDPs (unincorporated named communities) ── */}
            {showMunic &&
              data.municipalities
                .filter(m => m.type === 'cdp')
                .map(m => (
                  <GeoJSON
                    key={`${m.id}-cdp`}
                    data={m.geojson}
                    style={(): ReturnType<StyleFunction> => ({
                      color: CDP_COLOR,
                      weight: 1,
                      dashArray: '3 3',
                      fillColor: CDP_COLOR,
                      fillOpacity: 0.12,
                      opacity: 0.7,
                    })}
                  >
                    <Tooltip sticky>
                      <strong>{cleanName(m.name)}</strong>
                      <br />
                      <span style={{ color: CDP_COLOR, fontSize: 11 }}>
                        Unincorporated (CDP)
                      </span>
                    </Tooltip>
                  </GeoJSON>
                ))}

            {/* ── Incorporated places (cities, villages, towns) ── */}
            {showMunic &&
              data.municipalities
                .filter(m => m.type === 'incorporated')
                .map(m => (
                  <GeoJSON
                    key={`${m.id}-inc`}
                    data={m.geojson}
                    style={(): ReturnType<StyleFunction> => ({
                      color: MUNIC_COLOR,
                      weight: 1,
                      fillColor: MUNIC_COLOR,
                      fillOpacity: 0.14,
                      opacity: 0.8,
                    })}
                  >
                    <Tooltip sticky>
                      <strong>{cleanName(m.name)}</strong>
                      <br />
                      <span style={{ color: MUNIC_COLOR, fontSize: 11 }}>
                        {lsadcLabel(m.lsadc)}
                      </span>
                    </Tooltip>
                  </GeoJSON>
                ))}

            {/* ── County outline — always crisp on top ── */}
            {showOutline && data.boundary && (
              <GeoJSON
                key={`${county.id}-outline`}
                data={data.boundary}
                style={() => ({
                  color: countyFill,
                  weight: 2.5,
                  fillOpacity: 0,
                  opacity: 0.9,
                  dashArray: undefined,
                })}
              >
                <Tooltip sticky>
                  <strong>{county.name}</strong>
                  <br />
                  <span style={{ fontSize: 11, color: '#6b7280' }}>{county.stateName}</span>
                  {data.municipalities.length > 0 && (
                    <>
                      <br />
                      <span style={{ fontSize: 11, color: '#6b7280' }}>
                        {data.municipalities.filter(m => m.type === 'incorporated').length} incorporated
                        {' · '}
                        {data.municipalities.filter(m => m.type === 'cdp').length} CDPs
                      </span>
                    </>
                  )}
                </Tooltip>
              </GeoJSON>
            )}
          </span>
        );
      })}
    </>
  );
}

// Strip the TIGER type suffix from place names (e.g. "Granite City city" → "Granite City")
function cleanName(name: string): string {
  return name.replace(/ (city|village|town|township|borough|municipality|CDP)$/i, '').trim();
}

// LSADC codes → human-readable place type labels
function lsadcLabel(code: string): string {
  const map: Record<string, string> = {
    '25': 'City',
    '43': 'Town',
    '47': 'Village',
    '53': 'Township',
    '57': 'Borough',
    '61': 'Independent city',
    '25U': 'City (urban)',
    'M2': 'Municipality',
  };
  return map[code] ?? 'Incorporated place';
}
