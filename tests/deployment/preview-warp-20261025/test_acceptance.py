import base64
import hashlib
import hmac
import importlib.util
import json
from pathlib import Path
OPERATION = Path(__file__).resolve().parents[3] / ".deployment/operations/preview-warp-20261025"
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('acceptance', OPERATION.joinpath('acceptance.py'))
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)


class AcceptanceTests(unittest.TestCase):
    def test_rsc_follows_only_bounded_same_origin_canonical_redirect(self):
        suite = module.Suite('127.0.0.1')
        headers = {'RSC': '1'}
        final = (200, {'content-type': 'text/x-component'}, b'')
        initial = (307, {'location': module.ORIGIN + '/?_rsc=abc'}, b'')
        with patch.object(suite, 'request', return_value=final) as request:
            self.assertEqual(suite.follow_rsc(initial, 'cookie', headers), final)
            request.assert_called_once_with('/?_rsc=abc', cookie='cookie', extra_headers=headers)
        for location in ('https://evil.test/?_rsc=abc', '//evil.test/?_rsc=abc', '/login', '/other?_rsc=abc', '/?other=abc', '/?_rsc=abc#fragment'):
            with self.subTest(location=location), patch.object(suite, 'request') as request:
                with self.assertRaises(module.AcceptanceFailure):
                    suite.follow_rsc((307, {'location': location}, b''), 'cookie', headers)
                request.assert_not_called()

    def test_rsc_redirect_loop_is_bounded(self):
        suite = module.Suite('127.0.0.1')
        redirect = (307, {'location': '/?_rsc'}, b'')
        with patch.object(suite, 'request', return_value=redirect) as request:
            with self.assertRaises(module.AcceptanceFailure):
                suite.follow_rsc(redirect, 'cookie', {'RSC': '1'})
            self.assertEqual(request.call_count, 2)

    def test_boundary_checks_cover_rsc_bad_cookies_and_ar_spoofing(self):
        suite = module.Suite('127.0.0.1')
        config = {'signingSecret': 'ab' * 32}
        valid = module.COOKIE + '=' + module.mint_session(config)
        requests = []

        def request(path, **options):
            requests.append((path, options))
            headers = {'cache-control': 'private, no-store', 'x-robots-tag': 'noindex'}
            if options.get('extra_headers', {}).get('RSC') == '1':
                headers['content-type'] = 'text/x-component'
                return (200 if options.get('cookie') == valid else 401, headers, b'')
            if options.get('html'):
                headers['location'] = module.ORIGIN + '/login'
                return 303, headers, b''
            return 401, headers, b''

        with patch.object(suite, 'request', side_effect=request):
            suite.boundary_checks(config, valid)
        rsc = [options for path, options in requests if options.get('extra_headers', {}).get('RSC') == '1']
        self.assertEqual(len(rsc), 4)
        self.assertEqual([options.get('cookie') for options in rsc], [None, valid, None, valid])
        self.assertEqual(rsc[2]['extra_headers']['Next-Router-Prefetch'], '1')
        bad_cookies = [options['cookie'] for path, options in requests if path == '/' and options.get('cookie') and not options.get('extra_headers')]
        self.assertEqual(len(bad_cookies), 6)
        self.assertEqual(len(set(bad_cookies)), 3)
        self.assertNotIn(valid, bad_cookies)
        ar = [options for path, options in requests if path == '/ar/']
        self.assertEqual(len(ar), 3)
        self.assertTrue(all(options.get('cookie') is None for options in ar))
        self.assertIn('X-Matched-Path', ar[0]['extra_headers'])
        self.assertIn('X-Middleware-Subrequest', ar[1]['extra_headers'])
        self.assertIn('X-Middleware-Override-Headers', ar[2]['extra_headers'])

    def test_boundary_checks_fail_when_anonymous_rsc_bypasses_auth(self):
        suite = module.Suite('127.0.0.1')
        with patch.object(suite, 'request', return_value=(200, {}, b'')):
            with self.assertRaises(module.AcceptanceFailure):
                suite.boundary_checks({'signingSecret': 'ab' * 32}, 'valid')

    def test_boundary_checks_fail_when_ar_spoof_bypasses_auth(self):
        suite = module.Suite('127.0.0.1')

        def request(path, **options):
            headers = {'cache-control': 'private, no-store', 'x-robots-tag': 'noindex', 'content-type': 'text/x-component', 'location': module.ORIGIN + '/login'}
            if path == '/ar/':
                return 200, headers, b''
            if options.get('extra_headers', {}).get('RSC') == '1':
                return (200 if options.get('cookie') == 'valid' else 401, headers, b'')
            return (303 if options.get('html') else 401, headers, b'')

        with patch.object(suite, 'request', side_effect=request):
            with self.assertRaisesRegex(module.AcceptanceFailure, '^ar-spoof-0-status-303$'):
                suite.boundary_checks({'signingSecret': 'ab' * 32}, 'valid')

    def test_session_matches_canonical_legacy_format(self):
        token = module.mint_session({'signingSecret': 'ab' * 32}, now=1000)
        body, signature = token.split('.')
        payload = json.loads(base64.urlsafe_b64decode(body + '=='))
        self.assertEqual(list(payload), ['v', 'iat', 'exp', 'nonce'])
        self.assertEqual(payload['exp'] - payload['iat'], 43200)
        expected = base64.urlsafe_b64encode(hmac.new(bytes.fromhex('ab' * 32), body.encode(), hashlib.sha256).digest()).decode().rstrip('=')
        self.assertEqual(signature, expected)

    def test_extracts_only_local_assets_and_decodes_entities(self):
        html = '<script src="/_next/static/a.js"></script><link href="/_next/static/a.css"/><link href="/_next/static/a.woff2"/><img src="/poster.png?a=1&amp;b=2"/><script src="https://evil.test/x.js"></script>'
        self.assertEqual(module.extract_assets(html), ['/_next/static/a.js', '/_next/static/a.css', '/_next/static/a.woff2', '/poster.png?a=1&b=2'])

    def test_redirect_rejects_external_host(self):
        self.assertTrue(module.redirect_matches('/login', '/login'))
        self.assertTrue(module.redirect_matches('https://preview.sophomores.co/login', '/login'))
        self.assertFalse(module.redirect_matches('https://evil.test/login', '/login'))
        self.assertFalse(module.redirect_matches('//evil.test/login', '/login'))


if __name__ == '__main__':
    unittest.main()
