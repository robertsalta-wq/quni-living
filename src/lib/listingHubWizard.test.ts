import { describe, expect, it } from 'vitest'
import {
  isListingPreviewPath,
  listingHubWizardNextHref,
  listingHubWizardPrevHref,
  listingHubWizardStepError,
  listingOwnerOrPublicPreviewHref,
  listingPreviewPath,
} from './listingHubWizard'

describe('listingHubWizard', () => {
  it('builds the owner preview path', () => {
    expect(listingPreviewPath('abc')).toBe('/landlord/property/edit/abc/preview')
    expect(isListingPreviewPath('/landlord/property/edit/abc/preview')).toBe(true)
    expect(isListingPreviewPath('/landlord/property/edit/abc')).toBe(false)
    expect(isListingPreviewPath('/landlord/property/edit/abc/section/photos')).toBe(false)
  })

  it('sends live listings to the public page and drafts to owner preview', () => {
    expect(
      listingOwnerOrPublicPreviewHref({
        propertyId: 'abc',
        status: 'active',
        slug: 'sunny-room',
      }),
    ).toBe('/properties/sunny-room')
    expect(
      listingOwnerOrPublicPreviewHref({
        propertyId: 'abc',
        status: 'draft',
        slug: 'sunny-room',
      }),
    ).toBe('/landlord/property/edit/abc/preview')
    expect(
      listingOwnerOrPublicPreviewHref({
        propertyId: null,
        status: 'draft',
        slug: null,
      }),
    ).toBeNull()
  })

  it('Prev on step 1 returns to the hub; later steps go to the previous section', () => {
    expect(listingHubWizardPrevHref('abc', 'basic')).toBe('/landlord/property/edit/abc')
    expect(listingHubWizardPrevHref('abc', 'property')).toBe('/landlord/property/edit/abc/basic')
    expect(listingHubWizardPrevHref(null, 'inclusions')).toBe('/landlord/property/new/section/property')
    expect(listingHubWizardPrevHref('abc', 'photos')).toBe('/landlord/property/edit/abc/section/pricing')
  })

  it('Next walks 1-8 and last step opens preview when the listing is saved', () => {
    expect(listingHubWizardNextHref('abc', 'basic')).toBe('/landlord/property/edit/abc/section/property')
    expect(listingHubWizardNextHref(null, 'basic')).toBe('/landlord/property/new/section/property')
    expect(listingHubWizardNextHref('abc', 'pricing')).toBe('/landlord/property/edit/abc/section/photos')
    expect(listingHubWizardNextHref('abc', 'photos')).toBe('/landlord/property/edit/abc/preview')
    expect(listingHubWizardNextHref(null, 'photos')).toBe('/landlord/property/new')
  })

  it('only gates rent on pricing and title on basic', () => {
    expect(listingHubWizardStepError('property', { rentPerWeek: 0 })).toBeNull()
    expect(listingHubWizardStepError('photos', { rentPerWeek: '' })).toBeNull()
    expect(listingHubWizardStepError('pricing', { rentPerWeek: 0 })).toBe(
      'Rent per week must be a positive number.',
    )
    expect(listingHubWizardStepError('pricing', { rentPerWeek: 320 })).toBeNull()
    expect(listingHubWizardStepError('basic', { title: '  ' })).toBe('Add a listing title to continue.')
    expect(listingHubWizardStepError('basic', { title: 'Sunny room' })).toBeNull()
  })
})
