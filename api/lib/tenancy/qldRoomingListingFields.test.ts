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
  QLD_RENT_PAYMENT_METHOD_1_DIRECT_CREDIT,
} from './qldRoomingListingFields.js'

function validRoomingForm() {
  const form = emptyQldRoomingListingFormState()
  form.sharesKitchenOrBathroom = 'yes'
  form.personsAtPremises = '4'
  form.rentPaymentMethod2 = 'BPAY'
  form.rentPaymentMethod2Costs = 'None'
  form.rentPaymentMethod2FinancialBenefit = 'None'
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

  it('locks method 1 to direct credit and requires method 2 costs and financial benefit', () => {
    const form = validRoomingForm()
    expect(qldRentPaymentBlockError(form)).toBeNull()
    form.rentPaymentMethod2 = ''
    expect(qldRentPaymentBlockError(form)).toMatch(/second way/)
    form.rentPaymentMethod2 = 'BPAY'
    form.rentPaymentMethod2Costs = ''
    expect(qldRentPaymentBlockError(form)).toMatch(/costs the resident/)
    form.rentPaymentMethod2Costs = 'None'
    form.rentPaymentMethod2FinancialBenefit = ''
    expect(qldRentPaymentBlockError(form)).toMatch(/financial benefit/)
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

  it('writes Direct credit as method 1 only when the listing is rooming, and still stores the facilities answer on QLD room cards', () => {
    const form = validRoomingForm()
    form.sharesKitchenOrBathroom = 'no'
    const roomCard = qldRoomingListingColumnPatch({ isQldRoomCard: true, isQldRooming: false, form })
    expect(roomCard.qld_shares_kitchen_or_bathroom).toBe(false)
    expect(roomCard.qld_rent_payment_method_1).toBeNull()
    const rooming = qldRoomingListingColumnPatch({
      isQldRoomCard: true,
      isQldRooming: true,
      form: validRoomingForm(),
    })
    expect(rooming.qld_rent_payment_method_1).toBe(QLD_RENT_PAYMENT_METHOD_1_DIRECT_CREDIT)
    expect(rooming.qld_student_accommodation).toBe(false)
    expect(rooming).not.toHaveProperty('qld_rooming_service_level')
    expect(rooming).not.toHaveProperty('qld_rent_payee_bsb')
  })
})
