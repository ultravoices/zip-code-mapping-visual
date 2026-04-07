import type { LocationConfig } from '../types';

export const LOCATIONS: LocationConfig[] = [
  {
    id: 'stl',
    label: 'St. Louis',
    center: [38.627, -90.198],
    zoom: 10,
    states: ['MO', 'IL'],
    zipStorageKey: 'zipCodes_stl',
  },
  {
    id: 'tempe',
    label: 'Tempe',
    center: [33.425, -111.94],
    zoom: 10,
    states: ['AZ'],
    zipStorageKey: 'zipCodes_tempe',
  },
];

export const DEFAULT_LOCATION = LOCATIONS[0];
