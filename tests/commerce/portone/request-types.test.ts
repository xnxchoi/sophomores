import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { PayloadRequest } from 'payload'
import type { paymentRequest } from '../../../src/lib/commerce/portone/adapter'
import type { MemberPrincipal } from '../../../src/lib/payload/collections/access'
import type { assignBookmarkOwner } from '../../../src/lib/payload/collections/bookmarks'
import type { lockNotificationRecipient } from '../../../src/lib/payload/collections/notifications'

type Customer = Parameters<typeof paymentRequest>[2]
type Contracts = {
  payloadCustomer: Pick<NonNullable<PayloadRequest['user']>, 'email' | 'name'> extends Customer ? true : false
  absentEmail: Record<string, never> extends Customer ? true : false
  undefinedEmail: { email: undefined } extends Customer ? true : false
  numericEmailRejected: { email: number } extends Customer ? false : true
  nullEmailRejected: { email: null } extends Customer ? false : true
  validatedOutput: ReturnType<typeof paymentRequest>['customer']['email'] extends string ? true : false
  payloadPrincipal: PayloadRequest['user'] extends MemberPrincipal ? true : false
  numericPrincipal: { id: number; collection: 'users' } extends MemberPrincipal ? true : false
  stringPrincipal: { id: string; collection: 'users' } extends MemberPrincipal ? true : false
  absentPrincipal: undefined extends MemberPrincipal ? true : false
  nullPrincipal: null extends MemberPrincipal ? true : false
  booleanIDRejected: { id: boolean } extends MemberPrincipal ? false : true
  bookmarkPayload: PayloadRequest['user'] extends Parameters<typeof assignBookmarkOwner>[1] ? true : false
  notificationPayload: PayloadRequest['user'] extends Parameters<typeof lockNotificationRecipient>[1] ? true : false
}

// The scoped TypeScript gate enforces these assignments; tsx alone does not.
const contracts: Contracts = {
  payloadCustomer: true, absentEmail: true, undefinedEmail: true,
  numericEmailRejected: true, nullEmailRejected: true, validatedOutput: true,
  payloadPrincipal: true, numericPrincipal: true, stringPrincipal: true,
  absentPrincipal: true, nullPrincipal: true, booleanIDRejected: true,
  bookmarkPayload: true, notificationPayload: true,
}
test('the compiler-checked request and principal boundary fixture stays in test discovery', () => {
  assert.equal(Object.values(contracts).every(Boolean), true)
})
