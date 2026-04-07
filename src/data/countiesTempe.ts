import type { CountyDef } from '../types';

/**
 * Counties for the Tempe/Phoenix metro commute zone.
 *
 * FIPS reference: state 04 = Arizona.
 * County FIPS are 3-digit zero-padded strings.
 *
 * Maricopa County covers the core Phoenix metro.
 * Pinal County covers outer areas: Apache Junction, Maricopa city,
 * San Tan Valley, Queen Creek (partial), Sacaton/Bapchule.
 */
export const COUNTIES_TEMPE: CountyDef[] = [
  {
    id: '04-013',
    name: 'Maricopa County',
    stateFips: '04',
    countyFips: '013',
    stateName: 'AZ',
    included: true,
  },
  {
    id: '04-021',
    name: 'Pinal County',
    stateFips: '04',
    countyFips: '021',
    stateName: 'AZ',
    included: true,
  },
];

export const INCLUDED_COUNTIES_TEMPE = COUNTIES_TEMPE.filter(c => c.included);
