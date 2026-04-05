import { useState, useEffect, useCallback } from 'react';
import type { BoundaryCache } from '../types';

const CACHE_KEY = 'zipBoundaryCache';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Census Bureau TIGER Web REST API — 2020 Census ZCTA layer
// Only fetches the specific zip codes requested, no bulk download
const TIGER_URL =
  'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Current/MapServer/2/query';

function loadCache(): BoundaryCache {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed: BoundaryCache = JSON.parse(raw);
    const now = Date.now();
    // Evict stale entries
    return Object.fromEntries(
      Object.entries(parsed).filter(([, v]) => now - v.fetchedAt < CACHE_TTL_MS)
    );
  } catch {
    return {};
  }
}

function saveCache(cache: BoundaryCache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage full — ignore
  }
}

export function useZipBoundaries(zips: string[]) {
  const [cache, setCache] = useState<BoundaryCache>(() => loadCache());
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchBatch = useCallback(
    async (toFetch: string[]) => {
      if (toFetch.length === 0) return;

      setLoading(prev => {
        const next = { ...prev };
        toFetch.forEach(z => (next[z] = true));
        return next;
      });

      // Batch request: fetch all missing zips in a single API call
      const inClause = toFetch.map(z => `'${z}'`).join(',');
      const params = new URLSearchParams({
        where: `ZCTA5 IN (${inClause})`,
        outFields: 'ZCTA5',
        f: 'geojson',
        outSR: '4326',
      });

      try {
        const res = await fetch(`${TIGER_URL}?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const now = Date.now();
        const newEntries: BoundaryCache = {};

        // Map returned features back to zip codes
        const featsByZip: Record<string, GeoJSON.Feature> = {};
        if (data.features) {
          for (const feature of data.features) {
            const z: string = feature.properties?.ZCTA5;
            if (z) featsByZip[z] = feature;
          }
        }

        for (const zip of toFetch) {
          newEntries[zip] = {
            zip,
            geojson: featsByZip[zip] ?? null,
            fetchedAt: now,
          };
        }

        setCache(prev => {
          const updated = { ...prev, ...newEntries };
          saveCache(updated);
          return updated;
        });

        setErrors(prev => {
          const next = { ...prev };
          toFetch.forEach(z => delete next[z]);
          return next;
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'fetch failed';
        setErrors(prev => {
          const next = { ...prev };
          toFetch.forEach(z => (next[z] = msg));
          return next;
        });
      } finally {
        setLoading(prev => {
          const next = { ...prev };
          toFetch.forEach(z => delete next[z]);
          return next;
        });
      }
    },
    []
  );

  useEffect(() => {
    const missing = zips.filter(z => !(z in cache) && !loading[z]);
    if (missing.length > 0) {
      fetchBatch(missing);
    }
  }, [zips, cache, loading, fetchBatch]);

  const retry = useCallback(
    (zip: string) => {
      setErrors(prev => {
        const next = { ...prev };
        delete next[zip];
        return next;
      });
      setCache(prev => {
        const next = { ...prev };
        delete next[zip];
        return next;
      });
    },
    []
  );

  const clearCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    setCache({});
  }, []);

  return { cache, loading, errors, retry, clearCache };
}
