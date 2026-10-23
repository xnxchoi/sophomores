import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lookupZohoMailAccountId } from '../lib/phone-verification/server/zoho';

const options = { accountsOrigin: 'https://accounts.zoho.com', mailOrigin: 'https://mail.zoho.com',
  clientId: 'synthetic-client', clientSecret: 'synthetic-secret', code: 'synthetic-code' };
const token = { access_token: 'synthetic-account-access', refresh_token: 'never-persist-this', scope: 'ZohoMail.accounts.READ' };
const account = { accountId: '2560636000000008002', primaryEmailAddress: 'concierge@sophomores.co', mailboxAddress: 'concierge@sophomores.co' };
const reply = (data: unknown) => Response.json(data);
function mock(accounts: unknown, auth: unknown = token) {
  let requests = 0;
  const fetch: typeof globalThis.fetch = async (url, init) => {
    requests++;
    assert.equal(init?.redirect, 'error'); assert.ok(init?.signal);
    assert.equal(new URL(String(url)).search, '');
    if (requests === 1) {
      assert.equal(String(url), 'https://accounts.zoho.com/oauth/v2/token');
      assert.equal(init?.method, 'POST');
      const body = new URLSearchParams(String(init?.body));
      assert.equal(body.get('grant_type'), 'authorization_code');
      assert.equal(body.get('code'), 'synthetic-code');
      assert.equal(body.has('refresh_token'), false);
      return reply(auth);
    }
    assert.equal(requests, 2);
    assert.equal(String(url), 'https://mail.zoho.com/api/accounts');
    assert.equal(init?.method, 'GET');
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Zoho-oauthtoken synthetic-account-access');
    return reply({ status: { code: 200 }, data: accounts });
  };
  return { fetch, requests: () => requests };
}
test('one-time lookup returns only a lossless numeric ID for the exact primary concierge account', async () => {
  const transport = mock([{ ...account, primaryEmailAddress: 'other@example.test' }, account]);
  assert.equal(await lookupZohoMailAccountId({ ...options, fetch: transport.fetch }), account.accountId);
  assert.equal(transport.requests(), 2);
  const numeric = mock([]);
  const fetch: typeof globalThis.fetch = async (url, init) => String(url).endsWith('/api/accounts')
    ? new Response('{"status":{"code":200},"data":[{"accountId":2560636000000008002,"primaryEmailAddress":"concierge@sophomores.co"}]}')
    : numeric.fetch(url, init);
  assert.equal(await lookupZohoMailAccountId({ ...options, fetch }), account.accountId);
});
test('lookup refuses message/write scopes and account ambiguity; never falls back to receiver token', async () => {
  for (const scope of ['ZohoMail.messages.READ', 'ZohoMail.accounts.ALL', 'ZohoMail.accounts.READ,ZohoMail.messages.READ']) {
    const transport = mock([account], { ...token, scope });
    await assert.rejects(lookupZohoMailAccountId({ ...options, fetch: transport.fetch }), /^Error: Zoho request failed$/);
    assert.equal(transport.requests(), 1);
  }
  for (const accounts of [[], [account, account], [{ accountId: account.accountId, mailboxAddress: 'concierge@sophomores.co' }],
    [{ ...account, primaryEmailAddress: 'concierge@sophomores.co.attacker.invalid' }],
    [{ ...account, mailboxAddress: 'other@example.test' }], [{ ...account, accountId: 'not-numeric' }], Array(21).fill(account)]) {
    await assert.rejects(lookupZohoMailAccountId({ ...options, fetch: mock(accounts).fetch }));
  }
  assert.equal(await lookupZohoMailAccountId({ ...options, fetch: mock([account], { access_token: token.access_token }).fetch }), account.accountId);
});
test('lookup pins matching regional hosts and limits provider failures without leaking their contents', async () => {
  let calls = 0;
  const never: typeof globalThis.fetch = async () => { calls++; throw Error('provider-secret'); };
  for (const patch of [{ mailOrigin: 'https://mail.zoho.com.attacker.invalid' }, { accountsOrigin: 'https://accounts.zoho.eu' }, { code: 'x\r\nsecret' }]) {
    await assert.rejects(lookupZohoMailAccountId({ ...options, ...patch, fetch: never }), /^Error: Zoho request failed$/);
  }
  assert.equal(calls, 0);
  await assert.rejects(lookupZohoMailAccountId({ ...options, fetch: never }), /^Error: Zoho request failed$/);
  assert.equal(calls, 1);
  const bad = mock([account], { ...token, error: 'secret-client-credentials' });
  await assert.rejects(lookupZohoMailAccountId({ ...options, fetch: bad.fetch }), /^Error: Zoho request failed$/);
  assert.equal(bad.requests(), 1);
});
