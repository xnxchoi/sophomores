/** Non-deliverable synthetic MMS for local CLI/browser acceptance only. */
export function buildLocalFixtureMessage(input: { token: string; recipient: string; messageId: string }): string {
  if (!/^[A-Za-z0-9_-]{43}$/.test(input.token) || !/^[1-9][0-9]{0,29}$/.test(input.messageId)
    || !/^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$/.test(input.recipient)) throw new Error('Invalid local fixture');
  return [
    'From: <01012345678@emms.nate.com>', `To: <${input.recipient}>`,
    `Message-ID: <${input.messageId}@local-fixture.invalid>`,
    'Subject: Local synthetic fixture', 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=utf-8',
    '', `SPHMRS ${input.token}`, '',
  ].join('\r\n');
}
