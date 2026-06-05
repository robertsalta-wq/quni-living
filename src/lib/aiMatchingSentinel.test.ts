import { describe, expect, it } from 'vitest'
import {
  AI_SENTINEL_VALUES,
  ALL_AI_SENTINELS,
  assembleDescriptionGeneratorModelCall,
  assembleEnquiryReplyModelCall,
  assembleLandlordAssessmentModelCall,
  assembleLandlordChatModelCall,
  assembleStudentChatModelCall,
  assembleVisitorChatModelCall,
  buildSentinelBookingRow,
  buildSentinelStudentProfileRow,
} from './aiSurfacePromptAssembly'

const SENTINEL_LISTING = [
  {
    id: 'prop-1',
    title: 'Campus Studio',
    room_type: 'single',
    suburb: 'Kensington',
    state: 'NSW',
    rent_per_week: 420,
    furnished: true,
    landlord_profiles: {
      id: 'lp-1',
      full_name: AI_SENTINEL_VALUES.full_name,
      verified: true,
    },
  },
]

describe('AI surface sentinel leakage (assembled model call)', () => {
  const studentRow = buildSentinelStudentProfileRow()
  const bookingRow = buildSentinelBookingRow()
  const propertyRow = { title: 'Campus Studio', suburb: 'Kensington', rent_per_week: 420, room_type: 'single' }

  it('landlord_assessment: no excluded-field sentinels in full Anthropic payload', () => {
    const { fullAssembled, userMessage } = assembleLandlordAssessmentModelCall({
      studentProfileRow: studentRow,
      bookingRow,
      propertyRow,
      universityName: 'UNSW',
      campusName: 'Kensington',
      landlordFirstName: 'Sam',
    })
    for (const sentinel of ALL_AI_SENTINELS) {
      expect(fullAssembled, `leaked ${sentinel} in landlord_assessment`).not.toContain(sentinel)
    }
    expect(userMessage).toContain('Alex')
    expect(userMessage).not.toContain(AI_SENTINEL_VALUES.last_name)
  })

  it('student_chat: no excluded-field sentinels in full Anthropic payload', () => {
    const { fullAssembled } = assembleStudentChatModelCall({
      studentProfileRow: studentRow,
      listingRows: SENTINEL_LISTING,
      userMessage: 'Does this listing fit my preferences?',
    })
    for (const sentinel of ALL_AI_SENTINELS) {
      expect(fullAssembled, `leaked ${sentinel} in student_chat`).not.toContain(sentinel)
    }
  })

  it('landlord_chat: no profile/booking sentinels in full Anthropic payload', () => {
    const { fullAssembled } = assembleLandlordChatModelCall({
      landlordFirstName: 'Sam',
      userMessage: 'How should I respond to an enquiry?',
      sentinelProfile: studentRow,
    })
    for (const sentinel of ALL_AI_SENTINELS) {
      expect(fullAssembled, `leaked ${sentinel} in landlord_chat`).not.toContain(sentinel)
    }
  })

  it('visitor_chat: no profile/booking sentinels in full Anthropic payload', () => {
    const { fullAssembled } = assembleVisitorChatModelCall({
      userMessage: 'How do I sign up as a student?',
      sentinelProfile: studentRow,
    })
    for (const sentinel of ALL_AI_SENTINELS) {
      expect(fullAssembled, `leaked ${sentinel} in visitor_chat`).not.toContain(sentinel)
    }
  })

  it('description_generator: no profile/booking sentinels in full Anthropic payload', () => {
    const { fullAssembled } = assembleDescriptionGeneratorModelCall({
      roomType: 'single',
      suburb: 'Kensington',
      furnished: true,
    })
    for (const sentinel of ALL_AI_SENTINELS) {
      expect(fullAssembled, `leaked ${sentinel} in description_generator`).not.toContain(sentinel)
    }
  })

  it('enquiry_reply: profile sentinels absent; enquiry text is user-supplied only', () => {
    const { fullAssembled } = assembleEnquiryReplyModelCall({
      studentName: `Alex ${AI_SENTINEL_VALUES.last_name}`,
      studentMessage: 'Is the room still available?',
      propertyTitle: 'Campus Studio',
      propertySuburb: 'Kensington',
      landlordName: 'Sam',
      sentinelProfile: studentRow,
    })
    const profileSentinels = ALL_AI_SENTINELS.filter((s) => s !== AI_SENTINEL_VALUES.student_message)
    for (const sentinel of profileSentinels) {
      expect(fullAssembled, `leaked ${sentinel} in enquiry_reply`).not.toContain(sentinel)
    }
  })

  it('sample assembled landlord_assessment prompt for eyeball review', () => {
    const { fullAssembled } = assembleLandlordAssessmentModelCall({
      studentProfileRow: studentRow,
      bookingRow,
      propertyRow,
      universityName: 'UNSW',
      landlordFirstName: 'Sam',
    })
    expect(fullAssembled.length).toBeGreaterThan(200)
    expect(fullAssembled).toMatch(/allowlisted/i)
  })
})
