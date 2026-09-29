import test from "node:test";
import assert from "node:assert/strict";
import { nameVersionRowKeys } from "./rowKeys.mjs";
import { filterLayer } from "./filter.mjs";

test("different paths, missing paths, identical rows and separator characters get unique keys", () => {
  const rows = [
    { name: "Same", version: "1", path: "/Applications/One.app" },
    { name: "Same", version: "1", path: "/Applications/Two.app" },
    { name: "Same", version: "1" }, { name: "Same", version: "1", path: "" },
    { name: "Same", version: "1", path: "" },
    { name: "a-b", version: "c" }, { name: "a", version: "b-c" },
    { name: 'quotes"[,]0', version: "" },
  ];
  const original = JSON.stringify(rows);
  const keys = nameVersionRowKeys(rows);
  assert.equal(new Set(keys).size, rows.length);
  assert.deepEqual(nameVersionRowKeys(JSON.parse(original)), keys);
  assert.equal(JSON.stringify(rows), original);
});

test("filtering unrelated rows preserves surviving keys, including duplicate libraries", () => {
  const rows = [
    { name: "Siri", version: "1", path: "/System/Siri.app" },
    { name: "Siri", version: "1", path: "/Other/Siri.app" },
    { name: "HonkaiImpact3rd", version: "9.0.0", path: "/Applications/Game.app" },
    { name: "NativeMessagingHost", version: "5" },
    { name: "NativeMessagingHost", version: "5" },
  ];
  const original = nameVersionRowKeys(rows);
  for (const query of ["honkai", "siri", "native", "", "missing", "honkai"]) {
    const filtered = filterLayer(rows, query).value;
    assert.deepEqual(nameVersionRowKeys(filtered), filtered.map((row) => original[rows.indexOf(row)]));
  }
});
