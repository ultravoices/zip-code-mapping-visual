import type { CountyDef } from '../types';

/**
 * Core 8-county STL metro area.
 *
 * `included: true`  → rendered in the current visualization.
 * `included: false` → defined here for future adjacent-county expansion;
 *                     add entries below this block and set included: true
 *                     to activate them.
 *
 * FIPS reference: state 29 = Missouri, 17 = Illinois.
 * County FIPS are 3-digit zero-padded strings.
 */
export const COUNTIES: CountyDef[] = [
  // ── Missouri ──────────────────────────────────────────────────────────────
  {
    id: '29-510',
    name: 'St. Louis City',
    stateFips: '29',
    countyFips: '510',
    stateName: 'MO',
    included: true,
  },
  {
    id: '29-189',
    name: 'St. Louis County',
    stateFips: '29',
    countyFips: '189',
    stateName: 'MO',
    included: true,
  },
  {
    id: '29-183',
    name: 'St. Charles County',
    stateFips: '29',
    countyFips: '183',
    stateName: 'MO',
    included: true,
  },
  {
    id: '29-099',
    name: 'Jefferson County',
    stateFips: '29',
    countyFips: '099',
    stateName: 'MO',
    included: true,
  },
  {
    id: '29-071',
    name: 'Franklin County',
    stateFips: '29',
    countyFips: '071',
    stateName: 'MO',
    included: true,
  },

  // ── Illinois ──────────────────────────────────────────────────────────────
  {
    id: '17-163',
    name: 'St. Clair County',
    stateFips: '17',
    countyFips: '163',
    stateName: 'IL',
    included: true,
  },
  {
    id: '17-119',
    name: 'Madison County',
    stateFips: '17',
    countyFips: '119',
    stateName: 'IL',
    included: true,
  },
  {
    id: '17-133',
    name: 'Monroe County',
    stateFips: '17',
    countyFips: '133',
    stateName: 'IL',
    included: true,
  },

  // ── Adjacent counties (reserved for future expansion) ─────────────────────
  // To activate: change included to true. The hook and UI will pick them up
  // automatically — no other code changes required.
  {
    id: '29-113',
    name: 'Lincoln County',
    stateFips: '29',
    countyFips: '113',
    stateName: 'MO',
    included: false,
  },
  {
    id: '29-219',
    name: 'Warren County',
    stateFips: '29',
    countyFips: '219',
    stateName: 'MO',
    included: false,
  },
  {
    id: '29-055',
    name: 'Crawford County',
    stateFips: '29',
    countyFips: '055',
    stateName: 'MO',
    included: false,
  },
  {
    id: '17-027',
    name: 'Clinton County',
    stateFips: '17',
    countyFips: '027',
    stateName: 'IL',
    included: false,
  },
  {
    id: '17-157',
    name: 'Randolph County',
    stateFips: '17',
    countyFips: '157',
    stateName: 'IL',
    included: false,
  },
];

export const INCLUDED_COUNTIES = COUNTIES.filter(c => c.included);
