import { useState } from 'react';
import type { CountyDef, CountyCache } from '../types';

interface Props {
  counties: CountyDef[];
  cache: CountyCache;
  loading: Record<string, boolean>;
  errors: Record<string, string>;
  municipVis: Record<string, boolean>;
  outlineVis: Record<string, boolean>;
  onToggleMunic: (countyId: string) => void;
  onToggleOutline: (countyId: string) => void;
  onRetry: (countyId: string) => void;
}

export function CountyPanel({
  counties,
  cache,
  loading,
  errors,
  municipVis,
  outlineVis,
  onToggleMunic,
  onToggleOutline,
  onRetry,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="county-panel">
      <button className="county-panel-header" onClick={() => setCollapsed(c => !c)}>
        <span>County Boundaries</span>
        <span className="collapse-icon">{collapsed ? '▶' : '▼'}</span>
      </button>

      {!collapsed && (
        <div className="county-list">
          <div className="county-list-legend">
            <span className="county-legend-item">
              <span className="county-swatch outline" /> Outline
            </span>
            <span className="county-legend-item">
              <span className="county-swatch munic" /> Incorporated
            </span>
            <span className="county-legend-item">
              <span className="county-swatch cdp" /> CDPs
            </span>
          </div>

          {counties.map(county => {
            const data = cache[county.id];
            const isLoading = loading[county.id];
            const error = errors[county.id];
            const isLoaded = !!data;
            const municipOn = municipVis[county.id] ?? false;
            const outlineOn = outlineVis[county.id] ?? false;

            return (
              <div key={county.id} className="county-row">
                <div className="county-name-row">
                  <span className={`county-state-dot ${county.stateName === 'MO' ? 'mo' : 'il'}`} />
                  <span className="county-name">{county.name}</span>
                  <span className="county-state-label">{county.stateName}</span>

                  {isLoading && <span className="county-status spin">↻</span>}
                  {!isLoading && error && (
                    <button
                      className="county-retry"
                      title={error}
                      onClick={() => onRetry(county.id)}
                    >
                      ⚠ retry
                    </button>
                  )}
                  {!isLoading && isLoaded && (
                    <span className="county-status ok">✓</span>
                  )}
                </div>

                <div className="county-toggles">
                  <label className="county-toggle-label">
                    <input
                      type="checkbox"
                      checked={outlineOn}
                      onChange={() => onToggleOutline(county.id)}
                    />
                    Outline
                  </label>
                  <label className="county-toggle-label">
                    <input
                      type="checkbox"
                      checked={municipOn}
                      onChange={() => onToggleMunic(county.id)}
                    />
                    Municipalities
                    {isLoaded && (
                      <span className="munic-count">
                        {data.municipalities.filter(m => m.type === 'incorporated').length}
                        +{data.municipalities.filter(m => m.type === 'cdp').length}
                      </span>
                    )}
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
