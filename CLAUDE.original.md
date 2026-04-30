# CLAUDE.md

## Project

RTO commute zone zip code mapping visualizer. Interactive map showing zip code + county/municipality boundaries per metro area. No backend — Census TIGER API direct, localStorage cache.

## Stack

- React 19 + TypeScript (strict) + Vite
- react-leaflet 5 / Leaflet 1.9 (OpenStreetMap tiles)
- No state management lib — local React state only
- No tests

## Commands

```bash
npm run dev       # dev server
npm run build     # tsc -b && vite build
npm run lint      # eslint
npm run preview   # preview build
```

## Architecture

```
App.tsx           — owns all state (location, zipMap, visibility flags)
├── Sidebar.tsx   — zip list, filters, add form, location switcher
├── ZipMap.tsx    — Leaflet map, GeoJSON layers per zip
│   └── CountyLayer.tsx — county fill + municipality layers
└── CountyPanel.tsx — county/municipality toggle UI

hooks/
  useZipBoundaries.ts  — batch-fetch zip GeoJSON from TIGER, localStorage cache
  useCountyData.ts     — multi-phase county + municipality fetch, point-in-polygon filter

data/
  locations.ts              — LocationConfig array (stl, tempe)
  defaultZipCodes.ts        — STL metro zips (~120)
  defaultZipCodesTempe.ts   — Tempe/Phoenix zips (~95)
  counties.ts               — STL metro counties (8, MO + IL)
  countiesTempe.ts          — Tempe counties (2, AZ)
```

## Key Patterns

**TIGER API** — all boundary data from Census Bureau REST API:
- Layer 2: ZCTA (zip boundaries)
- Layer 82: County boundaries
- Layer 28: Incorporated places
- Layer 30: CDPs (unincorporated communities)

**Caching** — localStorage, 7-day TTL:
- `zipBoundaryCache` — zip GeoJSON features
- `countyDataCache` — county + municipality GeoJSON
- `zipCodes_stl` / `zipCodes_tempe` — user zip lists

**Zip batching** — `useZipBoundaries` collects all cache-missing zips, issues single TIGER `IN (zip1, zip2, ...)` query. No batch size limit (safe at current scale ~120 zips, fragile beyond ~300).

**Municipality spatial filter** — `useCountyData` uses ray-cast point-in-polygon on TIGER interior points (INTPTLAT/INTPTLON) to exclude adjacent-county bleed. Missing centroid = include (conservative).

## Types (`src/types.ts`)

```ts
StateCode = 'MO' | 'IL' | 'AZ'
LocationId = 'stl' | 'tempe'
ZipCodeEntry    { zip, label?, state, enabled, source: 'official'|'custom' }
ZipCodeBoundary { zip, geojson, fetchedAt }
CountyDef       { id, stateFips, countyFips, stateName, included }
MunicipalBoundary { id, name, type: 'incorporated'|'cdp', lsadc, geojson }
LocationConfig  { id, label, center, zoom, states, zipStorageKey }
```

## Colors

- MO zips: `#3b82f6` (blue)
- IL zips: `#f59e0b` (amber)
- AZ zips: `#a855f7` (purple)
- Incorporated places: teal fill
- CDPs: pink fill, dashed border

Colors hardcoded inline in `ZipMap.tsx` and `CountyLayer.tsx` — no shared constants file.

## Adding a New Location

1. Add `LocationConfig` entry to `src/data/locations.ts`
2. Create `src/data/defaultZipCodes<Name>.ts`
3. Create `src/data/counties<Name>.ts` with `CountyDef[]`
4. Wire into `App.tsx` zip/county loading logic

## Known Limitations

- No per-zip retry (only global cache clear)
- No batch size cap on TIGER zip queries
- No tests
- LSADC code map incomplete — unknown place types fall back to "Incorporated place"
- Colors not centralized
