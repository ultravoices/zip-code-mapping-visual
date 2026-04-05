import { useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Tooltip,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import type { Layer, StyleFunction } from 'leaflet';
import type { ZipCodeEntry, BoundaryCache, CountyDef, CountyCache } from '../types';
import { CountyLayer } from './CountyLayer';
import 'leaflet/dist/leaflet.css';

const STL_CENTER: [number, number] = [38.627, -90.198];
const DEFAULT_ZOOM = 10;
const MO_COLOR = '#3b82f6';
const IL_COLOR = '#f59e0b';
const DISABLED_COLOR = '#9ca3af';

function FitBoundsOnce({
  zipCodes,
  cache,
}: {
  zipCodes: ZipCodeEntry[];
  cache: BoundaryCache;
}) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current) return;

    const features = zipCodes
      .filter(z => z.enabled && cache[z.zip]?.geojson)
      .map(z => cache[z.zip].geojson!);

    if (features.length === 0) return;

    const bounds = L.latLngBounds([]);
    for (const f of features) {
      try {
        L.geoJSON(f).eachLayer(layer => {
          if ('getBounds' in layer) {
            bounds.extend((layer as L.Path & { getBounds(): L.LatLngBounds }).getBounds());
          }
        });
      } catch {
        // skip bad features
      }
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20] });
      fitted.current = true;
    }
  });

  return null;
}

interface Props {
  zipCodes: ZipCodeEntry[];
  cache: BoundaryCache;
  selectedZip: string | null;
  onSelectZip: (zip: string | null) => void;
  zipLayerVisible: boolean;
  // County layer props
  counties: CountyDef[];
  countyCache: CountyCache;
  municipVis: Record<string, boolean>;
  outlineVis: Record<string, boolean>;
}

export function ZipMap({
  zipCodes,
  cache,
  selectedZip,
  onSelectZip,
  zipLayerVisible,
  counties,
  countyCache,
  municipVis,
  outlineVis,
}: Props) {
  return (
    <MapContainer
      center={STL_CENTER}
      zoom={DEFAULT_ZOOM}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />

      <FitBoundsOnce zipCodes={zipCodes} cache={cache} />

      {/* ── County fills and municipality layers (below zip fills) ── */}
      <CountyLayer
        counties={counties}
        cache={countyCache}
        municipVis={municipVis}
        outlineVis={outlineVis}
      />

      {/* ── Zip code layers (master-toggled by zipLayerVisible) ── */}
      {zipLayerVisible && zipCodes
        .filter(z => !z.enabled && cache[z.zip]?.geojson)
        .map(entry => (
          <GeoJSON
            key={`${entry.zip}-disabled`}
            data={cache[entry.zip].geojson!}
            style={() => ({
              color: DISABLED_COLOR,
              weight: 1,
              fillColor: DISABLED_COLOR,
              fillOpacity: 0.05,
              opacity: 0.4,
              dashArray: '4 4',
            })}
          />
        ))}

      {zipLayerVisible && zipCodes
        .filter(z => z.enabled && cache[z.zip]?.geojson)
        .map(entry => {
          const isSelected = selectedZip === entry.zip;
          const color = entry.state === 'MO' ? MO_COLOR : IL_COLOR;

          const style: StyleFunction = () => ({
            color: isSelected ? '#ef4444' : color,
            weight: isSelected ? 3 : 1.5,
            fillColor: color,
            fillOpacity: isSelected ? 0.35 : 0.18,
            opacity: 0.9,
          });

          const onEachFeature = (_feat: GeoJSON.Feature, layer: Layer) => {
            layer.on({
              click: () => onSelectZip(isSelected ? null : entry.zip),
              mouseover: e => {
                const target = (e as L.LeafletMouseEvent).target as L.Path;
                target.setStyle({ fillOpacity: 0.5, weight: 2.5 });
                target.bringToFront();
              },
              mouseout: e => {
                const target = (e as L.LeafletMouseEvent).target as L.Path;
                target.setStyle({
                  fillOpacity: isSelected ? 0.35 : 0.18,
                  weight: isSelected ? 3 : 1.5,
                });
              },
            });
          };

          return (
            <GeoJSON
              key={`${entry.zip}-${isSelected}`}
              data={cache[entry.zip].geojson!}
              style={style}
              onEachFeature={onEachFeature}
            >
              <Tooltip sticky>
                <strong>{entry.zip}</strong>
                {entry.label ? ` — ${entry.label}` : ''}
                <br />
                <span style={{ color: entry.state === 'MO' ? MO_COLOR : IL_COLOR }}>
                  {entry.state}
                </span>
              </Tooltip>
            </GeoJSON>
          );
        })}
    </MapContainer>
  );
}
