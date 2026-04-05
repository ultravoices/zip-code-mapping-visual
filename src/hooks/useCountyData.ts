import { useState, useEffect, useCallback } from 'react';
import type { CountyDef, CountyCache, CountyData, MunicipalBoundary } from '../types';

const CACHE_KEY = 'countyDataCache';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const TIGER = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Current/MapServer';

// ── Cache helpers ─────────────────────────────────────────────────────────────

function loadCache(): CountyCache {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed: CountyCache = JSON.parse(raw);
    const now = Date.now();
    return Object.fromEntries(
      Object.entries(parsed).filter(([, v]) => now - v.fetchedAt < CACHE_TTL_MS)
    );
  } catch {
    return {};
  }
}

function saveCache(cache: CountyCache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // quota full — ignore
  }
}

// ── Geometry helpers ──────────────────────────────────────────────────────────

/**
 * Convert a GeoJSON Polygon or MultiPolygon feature to an Esri polygon JSON
 * string for use as the `geometry` parameter in TIGER REST queries.
 */
function geojsonToEsriPolygon(feature: GeoJSON.Feature): string | null {
  const geom = feature.geometry;
  if (!geom) return null;

  let rings: number[][][] = [];

  if (geom.type === 'Polygon') {
    rings = geom.coordinates as number[][][];
  } else if (geom.type === 'MultiPolygon') {
    for (const poly of geom.coordinates as number[][][][]) {
      rings.push(...poly);
    }
  } else {
    return null;
  }

  return JSON.stringify({ rings, spatialReference: { wkid: 4326 } });
}

/**
 * Ray-casting point-in-polygon test against a GeoJSON Polygon or MultiPolygon.
 * Used to post-filter municipalities: esriSpatialRelIntersects with the county
 * polygon catches everything that overlaps the boundary, then this confirms the
 * municipality's interior point actually sits inside the county.
 *
 * esriSpatialRelContains is too strict — it excludes features whose boundary
 * merely touches the county edge (e.g. Florissant, Lemay on the county perimeter).
 */
function pointInFeature(lon: number, lat: number, feature: GeoJSON.Feature): boolean {
  const geom = feature.geometry;
  if (!geom) return false;

  const polygons: number[][][][] =
    geom.type === 'Polygon'
      ? [geom.coordinates as number[][][]]
      : geom.type === 'MultiPolygon'
      ? (geom.coordinates as number[][][][])
      : [];

  for (const poly of polygons) {
    // Check exterior ring; ignore holes (conservative — keeps more rather than fewer)
    const ring = poly[0];
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];
      if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    if (inside) return true;
  }
  return false;
}

// ── TIGER fetch helpers ───────────────────────────────────────────────────────

async function fetchCountyBoundary(county: CountyDef): Promise<GeoJSON.Feature | null> {
  const params = new URLSearchParams({
    where: `STATE='${county.stateFips}' AND COUNTY='${county.countyFips}'`,
    outFields: 'NAME,STATE,COUNTY',
    f: 'geojson',
    outSR: '4326',
  });
  const res = await fetch(`${TIGER}/82/query?${params}`);
  if (!res.ok) throw new Error(`County fetch HTTP ${res.status}`);
  const data = await res.json();
  return data.features?.[0] ?? null;
}

async function fetchMunicipalities(
  stateFips: string,
  countyFeature: GeoJSON.Feature,
  layerId: 28 | 30,
  type: 'incorporated' | 'cdp'
): Promise<MunicipalBoundary[]> {
  const esriGeom = geojsonToEsriPolygon(countyFeature);
  if (!esriGeom) throw new Error('Could not convert county geometry for spatial query');
  const params = new URLSearchParams({
    where: `STATE='${stateFips}'`,
    geometry: esriGeom,
    geometryType: 'esriGeometryPolygon',
    // Intersects catches everything overlapping the county polygon (including edge-sharers).
    // We post-filter by centroid below to exclude true outsiders.
    spatialRel: 'esriSpatialRelIntersects',
    inSR: '4326',
    outFields: 'NAME,STATE,PLACE,LSADC,INTPTLAT,INTPTLON',
    f: 'geojson',
    outSR: '4326',
  });
  // POST avoids URL length limits for large county polygons (e.g. St. Louis County)
  const res = await fetch(`${TIGER}/${layerId}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!res.ok) throw new Error(`Municipality fetch HTTP ${res.status}`);
  const data = await res.json();

  const results: MunicipalBoundary[] = (data.features ?? []).map(
    (feature: GeoJSON.Feature & { properties: Record<string, string> }): MunicipalBoundary => ({
      id: `${feature.properties.STATE}-${feature.properties.PLACE}`,
      name: feature.properties.NAME ?? 'Unknown',
      type,
      lsadc: feature.properties.LSADC ?? '',
      geojson: feature,
    })
  );

  // Post-filter: only keep municipalities whose TIGER interior point is inside
  // the county polygon. This cleanly excludes adjacent-county places that merely
  // share a border segment without needing the overly-strict esriSpatialRelContains.
  const filtered = results.filter(m => {
    const props = (m.geojson as GeoJSON.Feature & { properties: Record<string, string> }).properties;
    const lat = parseFloat(props.INTPTLAT);
    const lon = parseFloat(props.INTPTLON);
    if (isNaN(lat) || isNaN(lon)) return true; // no centroid data — keep
    return pointInFeature(lon, lat, countyFeature);
  });

  return filtered;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCountyData(enabledCounties: CountyDef[]) {
  const [cache, setCache] = useState<CountyCache>(() => loadCache());
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchCounty = useCallback(async (county: CountyDef) => {
    setLoading(prev => ({ ...prev, [county.id]: true }));

    try {
      // Phase 1: county boundary
      const boundary = await fetchCountyBoundary(county);
      if (!boundary) throw new Error('No boundary returned');

      // Phase 2: fetch incorporated places + CDPs within the actual county polygon
      const [incorporated, cdps] = await Promise.all([
        fetchMunicipalities(county.stateFips, boundary, 28, 'incorporated'),
        fetchMunicipalities(county.stateFips, boundary, 30, 'cdp'),
      ]);

      // Exclude any place whose name matches the county itself — this happens with
      // independent cities (e.g. St. Louis City) where the city IS the jurisdiction
      // and TIGER returns it as an incorporated place within its own boundary.
      const countyNameNorm = county.name.toLowerCase().replace(/\s+/g, ' ').trim();
      const isSelfReferential = (name: string) =>
        name.toLowerCase().replace(/\s+/g, ' ').trim() === countyNameNorm;

      const filteredIncorporated = incorporated.filter(m => !isSelfReferential(m.name));

      // Deduplicate by id (a place appearing in two county bboxes is fine — same geometry)
      const seen = new Set<string>();
      const municipalities: MunicipalBoundary[] = [];
      for (const m of [...filteredIncorporated, ...cdps]) {
        if (!seen.has(m.id)) {
          seen.add(m.id);
          municipalities.push(m);
        }
      }

      const entry: CountyData = {
        countyId: county.id,
        boundary,
        municipalities,
        fetchedAt: Date.now(),
      };

      setCache(prev => {
        const updated = { ...prev, [county.id]: entry };
        saveCache(updated);
        return updated;
      });

      setErrors(prev => {
        const next = { ...prev };
        delete next[county.id];
        return next;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'fetch failed';
      setErrors(prev => ({ ...prev, [county.id]: msg }));
    } finally {
      setLoading(prev => {
        const next = { ...prev };
        delete next[county.id];
        return next;
      });
    }
  }, []);

  useEffect(() => {
    const missing = enabledCounties.filter(
      c => !(c.id in cache) && !loading[c.id] && !errors[c.id]
    );
    missing.forEach(fetchCounty);
  }, [enabledCounties, cache, loading, errors, fetchCounty]);

  const clearCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    setCache({});
  }, []);

  const retryCounty = useCallback(
    (countyId: string) => {
      setErrors(prev => { const n = { ...prev }; delete n[countyId]; return n; });
      setCache(prev => { const n = { ...prev }; delete n[countyId]; return n; });
    },
    []
  );

  return { cache, loading, errors, clearCache, retryCounty };
}
