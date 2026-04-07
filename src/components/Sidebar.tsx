import { useState, useMemo, useEffect } from 'react';
import type { ZipCodeEntry, BoundaryCache, LocationConfig, LocationId, StateCode } from '../types';
import { LOCATIONS } from '../data/locations';

interface Props {
  zipCodes: ZipCodeEntry[];
  cache: BoundaryCache;
  loading: Record<string, boolean>;
  errors: Record<string, string>;
  selectedZip: string | null;
  onSelectZip: (zip: string | null) => void;
  onToggleZip: (zip: string) => void;
  onAddZip: (zip: string, state: StateCode, label?: string) => void;
  onRemoveZip: (zip: string) => void;
  onClearCache: () => void;
  zipLayerVisible: boolean;
  onToggleZipLayer: () => void;
  location: LocationConfig;
  onLocationChange: (id: LocationId) => void;
}

type FilterState = 'official' | StateCode;

export function Sidebar({
  zipCodes,
  cache,
  loading,
  errors,
  selectedZip,
  onSelectZip,
  onToggleZip,
  onAddZip,
  onRemoveZip,
  onClearCache,
  zipLayerVisible,
  onToggleZipLayer,
  location,
  onLocationChange,
}: Props) {
  const [filter, setFilter] = useState<FilterState>('official');
  const [search, setSearch] = useState('');
  const [newZip, setNewZip] = useState('');
  const [newState, setNewState] = useState<StateCode>(location.states[0]);
  const [newLabel, setNewLabel] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  // Reset filter and add-form state when location changes
  useEffect(() => {
    setFilter('official');
    setSearch('');
    setShowAdd(false);
    setNewState(location.states[0]);
  }, [location.id, location.states]);

  const filterTabs: FilterState[] = ['official', ...location.states];

  const filtered = useMemo(() => {
    return zipCodes.filter(z => {
      if (filter === 'official' && z.source !== 'official') return false;
      if (filter !== 'official' && z.state !== filter) return false;
      if (search && !z.zip.includes(search) && !z.label?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [zipCodes, filter, search]);

  const handleAdd = () => {
    const zip = newZip.trim();
    if (!/^\d{5}$/.test(zip)) return;
    if (zipCodes.some(z => z.zip === zip)) return;
    onAddZip(zip, newState, newLabel.trim() || undefined);
    setNewZip('');
    setNewLabel('');
    setShowAdd(false);
  };

  const loadedCount = zipCodes.filter(z => cache[z.zip]?.geojson).length;
  const loadingCount = Object.keys(loading).length;
  const errorCount = Object.keys(errors).length;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        {/* Location switcher */}
        <div className="location-tabs">
          {LOCATIONS.map(loc => (
            <button
              key={loc.id}
              className={`location-tab ${location.id === loc.id ? 'active' : ''}`}
              onClick={() => onLocationChange(loc.id)}
            >
              {loc.label}
            </button>
          ))}
        </div>

        <div className="header-title-row">
          <h1>Commute Zone</h1>
          <button
            className={`zip-layer-toggle ${zipLayerVisible ? 'on' : 'off'}`}
            onClick={onToggleZipLayer}
            title={zipLayerVisible ? 'Hide zip code overlays' : 'Show zip code overlays'}
          >
            {zipLayerVisible ? 'Zips ON' : 'Zips OFF'}
          </button>
        </div>
        <p className="subtitle">Zip code coverage map</p>
        <div className="stats">
          {location.states.map(s => (
            <span key={s} className={`stat ${s.toLowerCase()}`}>
              {zipCodes.filter(z => z.state === s).length} {s}
            </span>
          ))}
          <span className="stat neutral">{loadedCount} loaded</span>
          {loadingCount > 0 && <span className="stat loading">↻ {loadingCount}</span>}
          {errorCount > 0 && <span className="stat error">⚠ {errorCount} failed</span>}
        </div>
      </div>

      <div className="sidebar-controls">
        <input
          type="text"
          className="search-input"
          placeholder="Search zip or name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="filter-tabs">
          {filterTabs.map(f => (
            <button
              key={f}
              className={`filter-tab ${filter === f ? 'active' : ''} ${f === 'official' ? 'official' : f.toLowerCase()}`}
              onClick={() => setFilter(f)}
            >
              {f === 'official' ? 'Official' : f}
            </button>
          ))}
        </div>
      </div>

      <div className="zip-list">
        {filtered.map(entry => {
          const status = errors[entry.zip]
            ? 'error'
            : loading[entry.zip]
            ? 'loading'
            : cache[entry.zip]?.geojson
            ? 'loaded'
            : cache[entry.zip]
            ? 'not-found'
            : 'pending';

          return (
            <div
              key={entry.zip}
              className={`zip-row ${!entry.enabled ? 'disabled' : ''} ${selectedZip === entry.zip ? 'selected' : ''}`}
              onClick={() => entry.enabled && onSelectZip(selectedZip === entry.zip ? null : entry.zip)}
            >
              <label className="zip-toggle" onClick={e => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={entry.enabled}
                  onChange={() => onToggleZip(entry.zip)}
                />
              </label>
              <div className="zip-info">
                <span className={`zip-code ${entry.state.toLowerCase()}`}>
                  {entry.zip}
                  {entry.source === 'custom' && (
                    <span className="source-badge custom" title="Manually added">C</span>
                  )}
                </span>
                <span className="zip-label">{entry.label ?? entry.state}</span>
              </div>
              <div className="zip-status">
                {status === 'loading' && <span className="status-icon spin">↻</span>}
                {status === 'loaded' && <span className="status-icon ok">✓</span>}
                {status === 'not-found' && <span className="status-icon warn" title="No boundary found">?</span>}
                {status === 'error' && <span className="status-icon err" title={errors[entry.zip]}>✕</span>}
              </div>
              <button
                className="remove-btn"
                title="Remove"
                onClick={e => { e.stopPropagation(); onRemoveZip(entry.zip); }}
              >
                ×
              </button>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="empty">No zip codes match your filter.</div>
        )}
      </div>

      <div className="sidebar-footer">
        {showAdd ? (
          <div className="add-form">
            <div className="add-row">
              <input
                type="text"
                placeholder="Zip code"
                maxLength={5}
                value={newZip}
                onChange={e => setNewZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                className="add-zip-input"
              />
              <select
                value={newState}
                onChange={e => setNewState(e.target.value as StateCode)}
                className="add-state-select"
              >
                {location.states.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <input
              type="text"
              placeholder="Label (optional)"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              className="add-label-input"
            />
            <div className="add-actions">
              <button
                className="btn-primary"
                onClick={handleAdd}
                disabled={!/^\d{5}$/.test(newZip)}
              >
                Add
              </button>
              <button className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button className="btn-add" onClick={() => setShowAdd(true)}>
            + Add Zip Code
          </button>
        )}

        <button className="btn-cache-clear" onClick={onClearCache} title="Clear cached boundary data and re-fetch">
          Clear cache
        </button>
      </div>

      <div className="legend">
        {location.states.map(s => (
          <div key={s} className="legend-item">
            <span className={`swatch ${s.toLowerCase()}`} />
            {s === 'MO' ? 'Missouri' : s === 'IL' ? 'Illinois' : 'Arizona'}
          </div>
        ))}
        <div className="legend-item"><span className="swatch sel" /> Selected</div>
        <div className="legend-item"><span className="swatch dis" /> Disabled</div>
      </div>
    </aside>
  );
}
