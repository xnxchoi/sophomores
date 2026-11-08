import assert from 'node:assert/strict';
import test from 'node:test';
import { isInternalLink } from '@/utilities/isInternalLink';

test('navigation classification tolerates absent and invalid configuration and respects exact origins', () => {
  const previous = process.env.NEXT_PUBLIC_SERVER_URL;
  try {
    for (const configured of [undefined, '', 'not a URL', 'javascript:alert(1)', 'https://user:pass@example.test']) {
      if (configured === undefined) delete process.env.NEXT_PUBLIC_SERVER_URL;
      else process.env.NEXT_PUBLIC_SERVER_URL = configured;
      for (const href of ['/read', 'read/story', './story', '../read', '?q=notes', '#body']) {
        assert.equal(isInternalLink(href), true, `${configured}: ${href}`);
      }
      assert.equal(isInternalLink('https://example.test/read'), false);
    }
    process.env.NEXT_PUBLIC_SERVER_URL = 'https://example.test/base';
    for (const href of ['https://example.test/read', 'https://example.test:443/read', '//example.test/read']) {
      assert.equal(isInternalLink(href), true, href);
    }
    for (const href of [
      '', 'https://foreign.test/read', '//foreign.test/read', '/\\foreign.test/read',
      'https://sub.example.test/read', 'https://www.example.test/read',
      'http://example.test/read', 'https://example.test:8443/read',
      'https://example.test.evil.test/read', 'https://user:pass@example.test/read',
      'https://[broken', 'mailto:desk@example.test', 'javascript:alert(1)', 'data:text/plain,hello',
      ' https://example.test/read', '/read\n/story',
      '//user:pass@example.test/read', '\\\\foreign.test/read', '/\\foreign.test/read',
      '/read\t/story', '/read\u0000/story', '/read\u007f/story',
      'https://example.test%2fforeign.test/read', 'https://example.test%5cforeign.test/read',
    ]) assert.equal(isInternalLink(href), false, href);
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SERVER_URL;
    else process.env.NEXT_PUBLIC_SERVER_URL = previous;
  }
});
