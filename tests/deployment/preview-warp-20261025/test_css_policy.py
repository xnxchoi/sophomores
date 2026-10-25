import importlib.util
from pathlib import Path
OPERATION = Path(__file__).resolve().parents[3] / ".deployment/operations/preview-warp-20261025"
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location("acceptance",OPERATION.joinpath("acceptance.py"))
a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a)

class CssPolicy(unittest.TestCase):
 def test_only_compiled_css_paths_are_public(self):
  for path in ["/_next/static/chunks/a_1-2.css", "/_next/static/css/a.css"]:
   self.assertTrue(a.public_css_path(path))
  for path in ["/static-fallback.css", "/_next/static/chunks/a.js", "/_next/static/chunks/a.css.map", "/_next/static/chunks/../a.css", "/_next/static/chunks/a.css?_rsc=1"]:
   self.assertFalse(a.public_css_path(path))
 def test_css_checks_include_anonymous_head_and_rsc_write_denial(self):
  suite=a.Suite("127.0.0.1");calls=[]
  def request(path,method="GET",**kw):
   calls.append((path,method,kw))
   denied=method=="POST" or kw.get("extra_headers",{}).get("RSC") or "_rsc=" in path
   return (401 if denied else 200), {"content-type":"text/css", "cache-control":"private, no-store", "x-robots-tag":"noindex"}, b".x{}"
  with patch.object(suite,"request",request):suite.css_boundary_checks("/_next/static/chunks/a.css")
  self.assertTrue(any(method=="HEAD" for _,method,_ in calls))
  self.assertTrue(any(method=="POST" for _,method,_ in calls))
  self.assertTrue(any(kw.get("extra_headers",{}).get("RSC") for _,_,kw in calls))
 def test_wrong_css_mime_is_rejected(self):
  suite=a.Suite("127.0.0.1")
  with patch.object(suite,"request",return_value=(200,{"content-type":"text/html"},b"not css")):
   with self.assertRaises(a.AcceptanceFailure):suite.css_boundary_checks("/_next/static/chunks/a.css")

if __name__=="__main__":unittest.main()
