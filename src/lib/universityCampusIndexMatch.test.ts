import { describe, expect, it } from 'vitest'
import {
  campusesForHomeCityIndex,
  propertyMatchesUniversityForIndexCount,
  type CampusReferenceRow,
  type UniversityReferenceRow,
} from './universityCampusReference'

const UOW_ID = '11111111-0000-0000-0000-000000000008'
const WOLLONGONG_CAMPUS_ID = '22222222-0000-0000-0000-000000000023'
const LIVERPOOL_CAMPUS_ID = '22222222-0000-0000-0000-000000000024'

const uow: UniversityReferenceRow = {
  id: UOW_ID,
  name: 'University of Wollongong',
  slug: 'uow',
  short_name: 'UOW',
  city: 'Wollongong',
  state: 'NSW',
}

const uowCampuses: CampusReferenceRow[] = [
  {
    id: WOLLONGONG_CAMPUS_ID,
    name: 'Wollongong Campus',
    university_id: UOW_ID,
    suburb: 'Wollongong',
    state: 'NSW',
    slug: 'wollongong',
    latitude: -34.4054,
    longitude: 150.8784,
  },
  {
    id: LIVERPOOL_CAMPUS_ID,
    name: 'Liverpool Campus',
    university_id: UOW_ID,
    suburb: 'Liverpool',
    state: 'NSW',
    slug: 'liverpool',
    latitude: -33.919,
    longitude: 150.923,
  },
]

describe('campusesForHomeCityIndex', () => {
  it('keeps only campuses in the university home city', () => {
    const home = campusesForHomeCityIndex(uow, uowCampuses)
    expect(home.map((c) => c.suburb)).toEqual(['Wollongong'])
  })
})

describe('propertyMatchesUniversityForIndexCount', () => {
  it('does not count Liverpool listing on Wollongong index via university_id or suburb', () => {
    const liverpoolListing = {
      university_id: UOW_ID,
      campus_id: null,
      suburb: 'Liverpool',
      latitude: -33.92,
      longitude: 150.92,
    }
    expect(propertyMatchesUniversityForIndexCount(liverpoolListing, uow, uowCampuses)).toBe(false)
  })

  it('counts listing within 10 km of Wollongong campus', () => {
    const nearWollongong = {
      university_id: null,
      campus_id: null,
      suburb: 'Gwynneville',
      latitude: -34.41,
      longitude: 150.87,
    }
    expect(propertyMatchesUniversityForIndexCount(nearWollongong, uow, uowCampuses)).toBe(true)
  })

  it('counts listing linked to Wollongong campus id', () => {
    const onCampus = {
      university_id: UOW_ID,
      campus_id: WOLLONGONG_CAMPUS_ID,
      suburb: 'Wollongong',
      latitude: null,
      longitude: null,
    }
    expect(propertyMatchesUniversityForIndexCount(onCampus, uow, uowCampuses)).toBe(true)
  })
})
