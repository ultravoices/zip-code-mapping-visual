import { useState, useMemo } from 'react';
import { ZipMap } from './components/ZipMap';
import { Sidebar } from './components/Sidebar';
import { CountyPanel } from './components/CountyPanel';
import { useZipBoundaries } from './hooks/useZipBoundaries';
import { useCountyData } from './hooks/useCountyData';
import { DEFAULT_ZIP_CODES } from './data/defaultZipCodes';
import { INCLUDED_COUNTIES } from './data/counties';
import type { ZipCodeEntry } from './types';
import './App.css';

const STORAGE_KEY = 'zipCodeList';

function loadZipCodes(): ZipCodeEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return DEFAULT_ZIP_CODES;
}

function saveZipCodes(codes: ZipCodeEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
}

export default function App() {
  const [zipCodes, setZipCodes] = useState<ZipCodeEntry[]>(loadZipCodes);
  const [selectedZip, setSelectedZip] = useState<string | null>(null);

  // ── Zip boundary state ────────────────────────────────────────────────────
  const allZips = useMemo(() => zipCodes.map(z => z.zip), [zipCodes]);
  const { cache, loading, errors, clearCache } = useZipBoundaries(allZips);

  // ── County / municipality state ───────────────────────────────────────────
  // municipVis: which counties have their municipality fill layer on
  // outlineVis: which counties have their county outline on
  const [zipLayerVisible, setZipLayerVisible] = useState(true);
  const [municipVis, setMunicipVis] = useState<Record<string, boolean>>({});
  const [outlineVis, setOutlineVis] = useState<Record<string, boolean>>({});

  // Only pass counties to the hook when at least one toggle is on for them
  const activeCounties = useMemo(
    () => INCLUDED_COUNTIES.filter(c => municipVis[c.id] || outlineVis[c.id]),
    [municipVis, outlineVis]
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
  const updateZipCodes = (next: ZipCodeEntry[]) => {
    setZipCodes(next);
    saveZipCodes(next);
  };

  const handleToggle = (zip: string) => {
    updateZipCodes(zipCodes.map(z => (z.zip === zip ? { ...z, enabled: !z.enabled } : z)));
  };

  const handleAdd = (zip: string, state: 'MO' | 'IL', label?: string) => {
    updateZipCodes([...zipCodes, { zip, state, enabled: true, label, source: 'custom' }]);
  };

  const handleRemove = (zip: string) => {
    if (selectedZip === zip) setSelectedZip(null);
    updateZipCodes(zipCodes.filter(z => z.zip !== zip));
  };

  const selectedEntry = selectedZip ? zipCodes.find(z => z.zip === selectedZip) : null;

  return (
    <div className="app-layout">
      <aside className="sidebar-wrapper">
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
        />
        <CountyPanel
          counties={INCLUDED_COUNTIES}
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
          counties={INCLUDED_COUNTIES}
          municipVis={municipVis}
          outlineVis={outlineVis}
        />

        {selectedEntry && (
          <div className="info-panel">
            <strong>{selectedEntry.zip}</strong>
            {selectedEntry.label && <> — {selectedEntry.label}</>}
            <span className={`state-badge ${selectedEntry.state === 'MO' ? 'mo' : 'il'}`}>
              {selectedEntry.state}
            </span>
            <button onClick={() => setSelectedZip(null)}>×</button>
          </div>
        )}
      </main>
    </div>
  );
}
