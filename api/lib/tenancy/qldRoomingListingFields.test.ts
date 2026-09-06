import { describe, expect, it } from 'vitest'
import {
  emptyQldRoomingListingFormState,
  qldNoticeConsentFieldError,
  qldPersonsAtPremisesError,
  qldRentPaymentBlockError,
  qldRoomDescriptionError,
  qldRoomingListingColumnPatch,
  qldRoomingListingSaveError,
  qldSharesKitchenOrBathroomError,
} from './qldRoomingListingFields.js'

function validRoomingForm() {
  const form = emptyQldRoomingListingFormState()
  form.sharesKitchenOrBathroom = 'yes'
  form.personsAtPremises = '4'
  form.rentPaymentMethod1 = 'Direct credit'
  form.rentPaymentMethod2 = 'BPAY'
  form.rentPayeeBankName = 'CBA'
  form.rentPayeeAccountName = 'Quinnvestments Pty Ltd'
  form.rentPayeeBsb = '062-000'
  form.rentPayeeAccountNumber = '12345678'
  form.rentPaymentReference = 'Room 3 rent'
  form.providerNotice.emailPermitted = 'yes'
  form.providerNotice.emailAddress = 'host@example.com'
  form.providerNotice.smsPermitted = 'no'
  return form
}

describe('qldRoomingListingFields', () => {
  it('requires an explicit shares kitchen or bathroom answer', () => {
    expect(qldSharesKitchenOrBathroomError('')).toMatch(/shares a kitchen or bathroom/)
    expect(qldSharesKitchenOrBathroomError('yes')).toBeNull()
    expect(qldSharesKitchenOrBathroomError('no')).toBeNull()
  })

  it('requires a room description', () => {
    expect(qldRoomDescriptionError('')).toMatch(/room description/)
    expect(qldRoomDescriptionError('Room 3, first floor rear')).toBeNull()
  })

  it('requires persons at the premises at least the room cap', () => {
    expect(qldPersonsAtPremisesError(null, 1)).toMatch(/premises/)
    expect(qldPersonsAtPremisesError(1, 2)).toMatch(/cannot be fewer/)
    expect(qldPersonsAtPremisesError(4, 2)).toBeNull()
  })

  it('requires two payment methods and the direct credit block', () => {
    const form = validRoomingForm()
    expect(qldRentPaymentBlockError(form)).toBeNull()
    form.rentPaymentMethod2 = ''
    expect(qldRentPaymentBlockError(form)).toMatch(/two ways/)
    form.rentPaymentMethod2 = 'BPAY'
    form.rentPayeeBsb = '62'
    expect(qldRentPaymentBlockError(form)).toMatch(/6-digit BSB/)
  })

  it('does not hardcode provider email yes', () => {
    const form = emptyQldRoomingListingFormState()
    expect(qldNoticeConsentFieldError(form.providerNotice, 'you (the provider)')).toMatch(/email/)
    form.providerNotice.emailPermitted = 'no'
    form.providerNotice.smsPermitted = 'no'
    expect(qldNoticeConsentFieldError(form.providerNotice, 'you (the provider)')).toBeNull()
  })

  it('blocks save until rooming particulars are complete', () => {
    expect(
      qldRoomingListingSaveError({
        sharesKitchenOrBathroom: '',
        roomDescription: '',
        personsAtPremises: '',
        personsInRoom: 1,
        form: emptyQldRoomingListingFormState(),
      }),
    ).not.toBeNull()
    const form = validRoomingForm()
    expect(
      qldRoomingListingSaveError({
        sharesKitchenOrBathroom: 'yes',
        roomDescription: 'Room 3',
        personsAtPremises: '4',
        personsInRoom: 1,
        form,
      }),
    ).toBeNull()
  })

  it('writes Level 1 only when the listing is rooming, and still stores the facilities answer on QLD room cards', () => {
    const form = validRoomingForm()
    form.sharesKitchenOrBathroom = 'no'
    const roomCard = qldRoomingListingColumnPatch({ isQldRoomCard: true, isQldRooming: false, form })
    expect(roomCard.qld_shares_kitchen_or_bathroom).toBe(false)
    expect(roomCard.qld_rooming_service_level).toBeNull()
    const rooming = qldRoomingListingColumnPatch({ isQldRoomCard: true, isQldRooming: true, form: validRoomingForm() })
    expect(rooming.qld_rooming_service_level).toBe('level_1')
    expect(rooming.qld_student_accommodation).toBe(false)
  })
})
