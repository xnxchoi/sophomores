import hashlib
import importlib.util
from pathlib import Path
OPERATION = Path(__file__).resolve().parents[3] / ".deployment/operations/preview-warp-20261025"
import unittest
from unittest.mock import patch

def module(name):
 spec=importlib.util.spec_from_file_location(name,OPERATION.joinpath(name+".py"));value=importlib.util.module_from_spec(spec);spec.loader.exec_module(value);return value

a=module("acceptance");ui=module("release_ui")
CSS="/_next/static/chunks/auth_1.css"
HEADERS={"content-type":"text/css","cache-control":"private, no-store","x-robots-tag":"noindex"}
HOME='<main data-warp-study=""><section aria-label="Entry sequence"><div data-warp-passage=""></div></section><section id="hero"></section><section id="origin"></section><div data-teaser-continuation=""><section id="how"></section><section id="strategy"></section><section id="people"></section><section id="contacts"><footer></footer></section></div></main><link href="/_next/static/chunks/site.css">'
LOGIN='<title>sphmrs</title><link rel="stylesheet" href="'+CSS+'"><form method="post" action="/api/session"><input name="username" autocomplete="username"><input type="password" name="password" autocomplete="current-password"><input type="checkbox" name="remember" value="yes" checked=""><button>Preview</button></form><footer>FOR STAFF ONLY</footer>'

class ReleaseProof(unittest.TestCase):
 def check(self,wrong=None):
  suite=a.Suite("127.0.0.1")
  def request(path,**options):
   if not options.get("cookie"):return 401,{},b""
   if path=="/":
    html=HOME
    if wrong=="inspector":html+='<aside data-warp-controls=""></aside>'
    if wrong=="continuation":html=html.replace('data-teaser-continuation','missing-continuation')
    if wrong=="sections":html=html.replace('id="people"','id="wrong"')
    return 200,{},html.encode()
   if path.endswith("site.css"):return 200,{},b'.scale{scale:var(--wordmark-scale)}'
   if path=="/static-fallback.css":return 200,{},b'.teaser .wordmark-glyph{scale:var(--wordmark-docked-scale)!important}'
   if path==ui.MANROPE_PATH:return 200,{},b'wrong' if wrong=="font" else b'font'
   if path==ui.MASK_PATH:return 200,{"content-type":"image/png"},b'wrong' if wrong=="mask" else b'mask'
   if path.startswith("/studies"):return 404,{},b''
   return 200,{},b''
  with patch.object(suite,"request",request),patch.object(ui,"MANROPE_SHA256",hashlib.sha256(b"font").hexdigest()),patch.object(ui,"MASK_SHA256",hashlib.sha256(b"mask").hexdigest()):return ui.check(suite,a.extract_assets,"cookie")
 def test_new_release_assets_accepted(self):self.assertTrue(self.check()["passed"])
 def test_production_inspector_fails(self):
  with self.assertRaisesRegex(a.AcceptanceFailure,"warp-no-production-inspector"):self.check("inspector")
 def test_missing_continuation_fails(self):
  with self.assertRaisesRegex(a.AcceptanceFailure,"warp-continuation-present"):self.check("continuation")
 def test_wrong_section_order_fails(self):
  with self.assertRaisesRegex(a.AcceptanceFailure,"warp-full-page-section-order"):self.check("sections")
 def test_wrong_font_fails(self):
  with self.assertRaisesRegex(a.AcceptanceFailure,"ui-manrope-sha256"):self.check("font")
 def test_wrong_mask_fails(self):
  with self.assertRaisesRegex(a.AcceptanceFailure,"field-mask-sha256"):self.check("mask")

class LoginProof(unittest.TestCase):
 def run_check(self,html,css=b'.bg-preview-surface{}.text-preview-foreground{}'):
  suite=a.Suite("127.0.0.1")
  def request(path,method="GET",**kw):
   if path=="/login":return 200,{},html.encode()
   denied=method=="POST" or kw.get("extra_headers",{}).get("RSC") or "_rsc=" in path
   return (401 if denied else 200),HEADERS,css
  with patch.object(suite,"request",request):ui.check_login(suite)
 def test_tailwind_native_login(self):self.run_check(LOGIN)
 def test_inline_style_rejected(self):
  with self.assertRaisesRegex(a.AcceptanceFailure,"no-inline-style"):self.run_check(LOGIN+'<style>body{}</style>')
 def test_site_styles_in_auth_graph_rejected(self):
  with self.assertRaisesRegex(a.AcceptanceFailure,"auth-excludes-site-styles"):self.run_check(LOGIN,b'.bg-preview-surface{}.text-preview-foreground{}.wordmark-glyph{}')
 def test_client_checkbox_rejected(self):
  with self.assertRaises(a.AcceptanceFailure):self.run_check(LOGIN.replace('type="checkbox"','type="hidden"'))

if __name__=="__main__":unittest.main()
