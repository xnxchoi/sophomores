import assert from "node:assert/strict";
import test from "node:test";
import { assertLocalProofDatabase } from "./proof-database";

// Review-A, 25 Nov (MEDIUM): the smoke seed must never reach a non-disposable or remote database. Pure checks: these
// refusals happen before any connection, so nothing here opens a socket.
test("only a plain local *_proof postgres URL is accepted", () => {
  for (const ok of ["postgresql://postgres:pw@127.0.0.1:55432/ledger_proof", "postgres://u@localhost/x_proof"]) {
    assert.doesNotThrow(() => assertLocalProofDatabase(ok), ok);
  }
});

test("query and fragment options, other hosts, schemes and names are refused", () => {
  for (const bad of [
    undefined, "", "not a url",
    "postgresql://postgres@127.0.0.1/ledger_proof?host=db.example.com",
    "postgresql://postgres@127.0.0.1/ledger_proof?hostaddr=203.0.113.5",
    "postgresql://postgres@localhost/ledger_proof?options=-c%20search_path%3Dx",
    "postgresql://postgres@127.0.0.1/ledger_proof?",
    "postgresql://postgres@127.0.0.1/ledger_proof#host=db.example.com",
    "postgresql://postgres@db.example.com/ledger_proof",
    "postgresql://postgres@127.0.0.2/ledger_proof",
    "postgresql:///ledger_proof",
    "mysql://root@127.0.0.1/ledger_proof",
    "https://127.0.0.1/ledger_proof",
    "postgresql://postgres@127.0.0.1/sophomores",
    "postgresql://postgres@127.0.0.1/ledger_proof/extra",
    "postgresql://postgres@127.0.0.1/ledger_proof_not",
  ]) assert.throws(() => assertLocalProofDatabase(bad), /^Error: Refused/, String(bad));
});
