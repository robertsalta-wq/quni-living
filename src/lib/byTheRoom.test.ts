import { describe, expect, it } from 'vitest'
import {
  BY_THE_ROOM_FEE_LINE,
  NSW_RESIDENTS_NOTE,
  NSW_RESIDENTS_NOTE_MIN,
  QLD_ROOMING_NOTE,
  WEEKS_PER_YEAR,
  evaluateByTheRoom,
  nswResidentsNoteTriggered,
  parseResidentCount,
  qldRoomingNoteTriggered,
  visibleStateNote,
  type ByTheRoomFields,
} from './byTheRoom'

const base: ByTheRoomFields = {
  wholeHomeWeekly: '500',
  roomRentsWeekly: ['250', '250', '250'],
  utilitiesWeekly: '0',
  internetWeekly: '0',
  furnishingOnce: '0',
  furnishingYears: '',
  emptyWeeks: '0',
}

describe('evaluateByTheRoom', () => {
  it('stays blank until whole-home and room rents are entered', () => {
    expect(evaluateByTheRoom({ ...base, wholeHomeWeekly: '' }).status).toBe('need-rents')
    expect(evaluateByTheRoom({ ...base, roomRentsWeekly: ['250', '', '250'] }).status).toBe('need-rents')
  })

  it('treats blank costs as zero and keeps the accept fee out of the net', () => {
    const result = evaluateByTheRoom({
      ...base,
      utilitiesWeekly: '',
      internetWeekly: '',
      furnishingOnce: '',
      emptyWeeks: '',
    })
    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    expect(result.figures.currentAnnual).toBe(500 * WEEKS_PER_YEAR)
    expect(result.figures.grossWeekly).toBe(750)
    expect(result.figures.grossAnnual).toBe(750 * WEEKS_PER_YEAR)
    expect(result.figures.netAnnual).toBe(750 * WEEKS_PER_YEAR)
    expect(result.figures.differenceAnnual).toBe((750 - 500) * WEEKS_PER_YEAR)
    expect(result.figures.netAnnual).not.toBe(result.figures.grossAnnual - 99)
    expect(BY_THE_ROOM_FEE_LINE).toContain('$99')
  })

  it('runs utilities and internet for 52 weeks and reduces rent by empty weeks', () => {
    const result = evaluateByTheRoom({
      ...base,
      utilitiesWeekly: '20',
      internetWeekly: '10',
      emptyWeeks: '4',
      furnishingOnce: '5200',
      furnishingYears: '4',
    })
    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    const grossAnnual = 750 * 52
    const net = grossAnnual - 750 * 4 - 20 * 52 - 10 * 52 - 5200 / 4
    expect(result.figures.netAnnual).toBe(net)
    expect(result.figures.differenceAnnual).toBe(net - 500 * 52)
    expect(result.figures.netWeekly).toBe(net / 52)
    expect(result.figures.differenceWeekly).toBe((net - 500 * 52) / 52)
  })

  it('holds the net until furnishing years are entered', () => {
    expect(
      evaluateByTheRoom({ ...base, furnishingOnce: '1000', furnishingYears: '' }).status,
    ).toBe('need-furnishing-years')
    expect(
      evaluateByTheRoom({ ...base, furnishingOnce: '1000', furnishingYears: '0' }).status,
    ).toBe('need-furnishing-years')
    const ready = evaluateByTheRoom({ ...base, furnishingOnce: '0', furnishingYears: '' })
    expect(ready.status).toBe('ready')
  })

  it('rejects empty weeks above 52', () => {
    expect(evaluateByTheRoom({ ...base, emptyWeeks: '53' }).status).toBe('empty-weeks')
  })

  it('sums different room rents', () => {
    const result = evaluateByTheRoom({ ...base, roomRentsWeekly: ['200', '250', '300'] })
    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    expect(result.figures.grossWeekly).toBe(750)
  })
})

describe('state notes', () => {
  it('keeps both sentences empty so nothing renders yet', () => {
    expect(NSW_RESIDENTS_NOTE.trim()).toBe('')
    expect(QLD_ROOMING_NOTE.trim()).toBe('')
    expect(visibleStateNote('QLD', 1)).toBeNull()
    expect(visibleStateNote('QLD', null)).toBeNull()
    expect(visibleStateNote('NSW', NSW_RESIDENTS_NOTE_MIN)).toBeNull()
    expect(visibleStateNote('NSW', 8)).toBeNull()
    expect(visibleStateNote('', 8)).toBeNull()
  })

  it('triggers NSW from residents, not from a room count', () => {
    expect(nswResidentsNoteTriggered(4)).toBe(false)
    expect(nswResidentsNoteTriggered(5)).toBe(true)
    expect(nswResidentsNoteTriggered(null)).toBe(false)
    expect(parseResidentCount('')).toBeNull()
    expect(parseResidentCount('0')).toBeNull()
    expect(parseResidentCount('6')).toBe(6)
  })

  it('triggers the QLD note from the state alone', () => {
    expect(qldRoomingNoteTriggered()).toBe(true)
  })
})
