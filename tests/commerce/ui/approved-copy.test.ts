import assert from 'node:assert/strict'
import { test } from 'node:test'
import messages from '../../../messages/en.json'

// Approval constraints on the canonical catalogue, not a runtime copy source.
test('approved delivery labels distinguish recipient, delivery contact and optional address details', () => {
  const copy = messages.Customer.components_commerce_shipping_address
  assert.equal(copy.recipient, 'Recipient name')
  assert.equal(copy.deliveryPhone, 'Phone number for delivery')
  assert.equal(copy.searchAddress, 'Search for an address')
  assert.equal(copy.detailedAddress, 'Address details (optional)')
  assert.equal(copy.addressSearchIsUnavailableEnterYourAddressBelow, 'We can’t look up your address right now. Please enter your address and postcode manually.')
})

test('approved admission recovery and gift completion prose stays in the canonical catalogue', () => {
  assert.equal(messages.Customer.components_commerce_order_admissions.theseAdmissionsCouldNotBeLoadedCheckThatYou,
    'We couldn’t load these admissions. Check that you’re signed in with the purchasing account, then try again.')
  const copy = messages.Customer.components_commerce_invitation_claim
  assert.equal(copy.yourGuestPackageIsClaimed, 'You’ve claimed your gift. Welcome to Sophomores.')
  assert.equal(Reflect.get(copy, 'exploreSophomores'), 'Explore Sophomores')
})
