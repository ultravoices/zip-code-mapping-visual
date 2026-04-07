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
import type { ZipCodeEntry, BoundaryCache, CountyDef, CountyCache, LocationConfig } from '../types';
import { CountyLayer } from './CountyLayer';
import 'leaflet/dist/leaflet.css';

const DEFAULT_ZOOM = 10;
const MO_COLOR = '#3b82f6';
const IL_COLOR = '#f59e0b';
const AZ_COLOR = '#a855f7'; // purple for Arizona
const DISABLED_COLOR = '#9ca3af';

function stateColor(state: string): string {
  if (state === 'MO') return MO_COLOR;
  if (state === 'IL') return IL_COLOR;
  return AZ_COLOR;
}

/** Re-centers the map whenever the location changes, then fits bounds on first data load. */
function LocationController({
  location,
  zipCodes,
  cache,
}: {
  location: LocationConfig;
  zipCodes: ZipCodeEntry[];
  cache: BoundaryCache;
}) {
  const map = useMap();
  const currentLocationId = useRef(location.id);
  const fitted = useRef(false);

  // Re-center immediately when location switches
  useEffect(() => {
    if (currentLocationId.current !== location.id) {
      currentLocationId.current = location.id;
      fitted.current = false;
      map.setView(location.center, location.zoom);
    }
  }, [location, map]);

  // Fit bounds once on first data load for this location
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
  counties: CountyDef[];
  countyCache: CountyCache;
  municipVis: Record<string, boolean>;
  outlineVis: Record<string, boolean>;
  location: LocationConfig;
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
  location,
}: Props) {
  return (
    <MapContainer
      center={location.center}
      zoom={DEFAULT_ZOOM}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />

      <LocationController location={location} zipCodes={zipCodes} cache={cache} />

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
          const color = stateColor(entry.state);

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
                <span style={{ color }}>
                  {entry.state}
                </span>
              </Tooltip>
            </GeoJSON>
          );
        })}
    </MapContainer>
  );
}
