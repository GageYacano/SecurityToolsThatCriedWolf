const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const createExporter = require("./export-snapshot.cjs");

async function fixture(t) {
  const directory = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "onion-export-")));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const source = path.join(directory, "latest-config.json");
  const target = path.join(directory, "export.json");
  const snapshot = { schemaVersion: 1, collectedAt: "2026-09-28T16:26:09.366Z",
    config: { hardware: {}, firmware: {}, os: {}, libraries: [], applications: [] } };
  await fs.writeFile(source, JSON.stringify(snapshot));
  const create = (overrides = {}) => createExporter({
    readSnapshot: async () => ({ status: "found", snapshot: JSON.parse(await fs.readFile(source, "utf8")) }),
    snapshotPath: () => source, downloadsPath: () => directory,
    showSaveDialog: async () => ({ canceled: false, filePath: target }), ...overrides,
  });
  return { directory, source, target, snapshot, create };
}

test("exports a readable complete or partial snapshot with a timestamped JSON filename", async (t) => {
  const f = await fixture(t);
  for (const libraries of [[], { error: "Homebrew unavailable" }]) {
    f.snapshot.config.libraries = libraries;
    await fs.writeFile(f.source, JSON.stringify(f.snapshot));
    const run = f.create({ showSaveDialog: async (options) => {
      assert.equal(options.defaultPath, path.join(f.directory, "onionmanager-specs-2026-09-28T16-26-09Z.json"));
      assert.deepEqual(options.filters, [{ name: "JSON", extensions: ["json"] }]);
      assert.ok(options.properties.includes("showOverwriteConfirmation"));
      return { canceled: false, filePath: f.target };
    } });
    assert.equal((await run()).status, "success");
    const exported = await fs.readFile(f.target, "utf8");
    assert.equal(exported, JSON.stringify(f.snapshot, null, 2) + "\n");
    assert.deepEqual(JSON.parse(await fs.readFile(f.source)), f.snapshot);
  }
});

test("cancellation and missing/invalid snapshots do not write files", async (t) => {
  const f = await fixture(t);
  assert.equal((await f.create({ showSaveDialog: async () => ({ canceled: true }) })()).status, "cancelled");
  for (const saved of [{ status: "missing" }, { status: "error", message: "Invalid or unsupported configuration snapshot." }]) {
    const run = f.create({ readSnapshot: async () => saved,
      showSaveDialog: async () => { assert.fail("Must not open a dialog without a valid snapshot"); } });
    assert.equal((await run()).status, "error");
  }
  await assert.rejects(fs.access(f.target), { code: "ENOENT" });
});

test("captures data before the dialog and rejects simultaneous export requests", async (t) => {
  const f = await fixture(t);
  let resolveDialog;
  let opened;
  const dialogOpened = new Promise((resolve) => { opened = resolve; });
  const run = f.create({ showSaveDialog: () => {
    opened();
    return new Promise((resolve) => { resolveDialog = resolve; });
  } });
  const pending = run();
  await dialogOpened;
  assert.equal((await run()).status, "busy");
  await fs.writeFile(f.source, JSON.stringify({ ...f.snapshot, collectedAt: "2026-09-28T17:00:00Z" }));
  resolveDialog({ canceled: false, filePath: f.target });
  assert.equal((await pending).status, "success");
  assert.deepEqual(JSON.parse(await fs.readFile(f.target)), f.snapshot);
});

test("rejects direct, symlink, hard-link and directory-alias paths to the live snapshot", async (t) => {
  const f = await fixture(t);
  const symbolic = path.join(f.directory, "symbolic.json");
  const hard = path.join(f.directory, "hard.json");
  const alias = path.join(f.directory, "alias");
  await fs.symlink(f.source, symbolic);
  await fs.link(f.source, hard);
  await fs.symlink(f.directory, alias, "dir");
  for (const filePath of [f.source, symbolic, hard, path.join(alias, "latest-config.json")]) {
    const result = await f.create({ showSaveDialog: async () => ({ canceled: false, filePath }) })();
    assert.equal(result.status, "error");
    assert.match(result.message, /live snapshot/);
    assert.deepEqual(JSON.parse(await fs.readFile(f.source)), f.snapshot);
  }
});

test("write failures report errors, remove temporary files, and allow retry", async (t) => {
  const f = await fixture(t);
  let target = path.join(f.directory, "missing-directory", "export.json");
  const run = f.create({ showSaveDialog: async () => ({ canceled: false, filePath: target }) });
  assert.equal((await run()).status, "error");
  target = path.join(f.directory, "existing-directory");
  await fs.mkdir(target);
  await fs.writeFile(path.join(target, "keep.txt"), "preserved");
  assert.equal((await run()).status, "error");
  assert.equal(await fs.readFile(path.join(target, "keep.txt"), "utf8"), "preserved");
  assert.equal((await fs.readdir(f.directory)).some((name) => name.endsWith(".tmp")), false);
  target = f.target;
  assert.equal((await run()).status, "success");
});
