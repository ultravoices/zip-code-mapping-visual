import { useState, useMemo, useCallback } from 'react';
import { ZipMap } from './components/ZipMap';
import { Sidebar } from './components/Sidebar';
import { CountyPanel } from './components/CountyPanel';
import { useZipBoundaries } from './hooks/useZipBoundaries';
import { useCountyData } from './hooks/useCountyData';
import { DEFAULT_ZIP_CODES } from './data/defaultZipCodes';
import { DEFAULT_ZIP_CODES_TEMPE } from './data/defaultZipCodesTempe';
import { INCLUDED_COUNTIES } from './data/counties';
import { INCLUDED_COUNTIES_TEMPE } from './data/countiesTempe';
import { LOCATIONS } from './data/locations';
import type { ZipCodeEntry, LocationId, StateCode } from './types';
import './App.css';

function loadZipCodes(storageKey: string, defaults: ZipCodeEntry[]): ZipCodeEntry[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return defaults;
}

function saveZipCodes(storageKey: string, codes: ZipCodeEntry[]) {
  localStorage.setItem(storageKey, JSON.stringify(codes));
}

export default function App() {
  const [locationId, setLocationId] = useState<LocationId>('stl');
  const location = LOCATIONS.find(l => l.id === locationId)!;

  // Per-location zip code lists, loaded lazily from localStorage
  const [zipMap, setZipMap] = useState<Record<LocationId, ZipCodeEntry[]>>(() => ({
    stl: loadZipCodes('zipCodes_stl', DEFAULT_ZIP_CODES),
    tempe: loadZipCodes('zipCodes_tempe', DEFAULT_ZIP_CODES_TEMPE),
  }));

  const zipCodes = zipMap[locationId];

  const updateZipCodes = useCallback((next: ZipCodeEntry[], locId: LocationId = locationId) => {
    setZipMap(prev => ({ ...prev, [locId]: next }));
    saveZipCodes(locId === 'stl' ? 'zipCodes_stl' : 'zipCodes_tempe', next);
  }, [locationId]);

  const [selectedZip, setSelectedZip] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ── Location switching ────────────────────────────────────────────────────
  const handleLocationChange = (id: LocationId) => {
    setLocationId(id);
    setSelectedZip(null);
    setMunicipVis({});
    setOutlineVis({});
  };

  // ── Zip boundaries ────────────────────────────────────────────────────────
  const allZips = useMemo(() => zipCodes.map(z => z.zip), [zipCodes]);
  const { cache, loading, errors, clearCache } = useZipBoundaries(allZips);

  // ── County / municipality state ───────────────────────────────────────────
  const [zipLayerVisible, setZipLayerVisible] = useState(true);
  const [municipVis, setMunicipVis] = useState<Record<string, boolean>>({});
  const [outlineVis, setOutlineVis] = useState<Record<string, boolean>>({});

  const includedCounties = locationId === 'stl' ? INCLUDED_COUNTIES : INCLUDED_COUNTIES_TEMPE;

  const activeCounties = useMemo(
    () => includedCounties.filter(c => municipVis[c.id] || outlineVis[c.id]),
    [includedCounties, municipVis, outlineVis]
  );

  const {
    cache: countyCache,
    loading: countyLoading,
    errors: countyErrors,
    retryCounty,
    clearCache: clearCountyCache,
  } = useCountyData(activeCounties);

  const handleToggleMunic = (countyId: string) => {
    setMunicipVis(prev => ({ ...prev, [countyId]: !prev[countyId] }));
  };

  const handleToggleOutline = (countyId: string) => {
    setOutlineVis(prev => ({ ...prev, [countyId]: !prev[countyId] }));
  };

  // ── Zip code handlers ─────────────────────────────────────────────────────
  const handleToggle = (zip: string) => {
    updateZipCodes(zipCodes.map(z => (z.zip === zip ? { ...z, enabled: !z.enabled } : z)));
  };

  const handleAdd = (zip: string, state: StateCode, label?: string) => {
    updateZipCodes([...zipCodes, { zip, state, enabled: true, label, source: 'custom' }]);
  };

  const handleRemove = (zip: string) => {
    if (selectedZip === zip) setSelectedZip(null);
    updateZipCodes(zipCodes.filter(z => z.zip !== zip));
  };

  const selectedEntry = selectedZip ? zipCodes.find(z => z.zip === selectedZip) : null;

  return (
    <div className="app-layout">
      <aside className={`sidebar-wrapper${sidebarOpen ? '' : ' collapsed'}`}>
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarOpen(o => !o)}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? '‹' : '›'}
        </button>
        <Sidebar
          zipCodes={zipCodes}
          cache={cache}
          loading={loading}
          errors={errors}
          selectedZip={selectedZip}
          onSelectZip={setSelectedZip}
          onToggleZip={handleToggle}
          onAddZip={handleAdd}
          onRemoveZip={handleRemove}
          onClearCache={() => {
            clearCache();
            clearCountyCache();
            setMunicipVis({});
            setOutlineVis({});
          }}
          zipLayerVisible={zipLayerVisible}
          onToggleZipLayer={() => setZipLayerVisible(v => !v)}
          location={location}
          onLocationChange={handleLocationChange}
        />
        <CountyPanel
          counties={includedCounties}
          cache={countyCache}
          loading={countyLoading}
          errors={countyErrors}
          municipVis={municipVis}
          outlineVis={outlineVis}
          onToggleMunic={handleToggleMunic}
          onToggleOutline={handleToggleOutline}
          onRetry={retryCounty}
        />
      </aside>

      <main className="map-container">
        <ZipMap
          zipCodes={zipCodes}
          cache={cache}
          selectedZip={selectedZip}
          onSelectZip={setSelectedZip}
          zipLayerVisible={zipLayerVisible}
          countyCache={countyCache}
          counties={includedCounties}
          municipVis={municipVis}
          outlineVis={outlineVis}
          location={location}
        />

        {selectedEntry && (
          <div className="info-panel">
            <strong>{selectedEntry.zip}</strong>
            {selectedEntry.label && <> — {selectedEntry.label}</>}
            <span className={`state-badge ${selectedEntry.state.toLowerCase()}`}>
              {selectedEntry.state}
            </span>
            <button onClick={() => setSelectedZip(null)}>×</button>
          </div>
        )}
      </main>
    </div>
  );
}
