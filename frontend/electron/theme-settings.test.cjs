const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const vm = require("node:vm");

test("theme persists without scheduling and survives collection settings saves", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "onion-theme-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const calls = [];
  const module = { exports: {} };
  vm.runInNewContext(await fs.readFile(path.join(__dirname, "collection-scheduler.cjs"), "utf8"), {
    module, process: { platform: "darwin", pid: process.pid, getuid: () => 501 },
    require(name) {
      if (name === "node:child_process") return { execFile: (_file, args, _options, callback) => {
        calls.push(args[0]);
        if (args[0] === "print") callback(Object.assign(new Error("No service"), { code: 113 }));
        else if (args[0] === "print-disabled") callback(null, "", "");
        else callback(new Error(`Unexpected scheduler command: ${args[0]}`));
      } };
      return require(name);
    },
  });
  const create = () => module.exports({ app: { isPackaged: false, getPath: () => directory },
    snapshotPath: () => path.join(directory, "snapshots", "latest-config.json"), resolveJarPath: () => "unused" });
  const scheduler = create();
  const settingsFile = path.join(directory, "settings.json");
  assert.equal((await scheduler.getTheme()).darkMode, false);
  await fs.writeFile(settingsFile, JSON.stringify({ automaticCollection: false, collectionIntervalMinutes: 15 }));
  assert.equal((await scheduler.getTheme()).darkMode, false);
  await scheduler.saveTheme(true);
  assert.equal(calls.length, 0, "Theme operations must not call launchctl");
  assert.equal((await create().getTheme()).darkMode, true, "A new instance restores the saved preference");
  assert.equal(JSON.parse(await fs.readFile(settingsFile)).collectionIntervalMinutes, 15);
  await scheduler.saveSettings({ automaticCollection: false, collectionIntervalMinutes: 30, darkMode: false });
  assert.equal((await scheduler.getTheme()).darkMode, true, "Stale Settings dialog data cannot overwrite the theme");
  await Promise.all([
    scheduler.saveTheme(false),
    scheduler.saveSettings({ automaticCollection: false, collectionIntervalMinutes: 60, darkMode: true }),
    scheduler.saveTheme(true),
  ]);
  const saved = JSON.parse(await fs.readFile(settingsFile));
  assert.equal(saved.darkMode, true);
  assert.equal(saved.collectionIntervalMinutes, 60);
  await assert.rejects(scheduler.saveTheme("dark"), /boolean/);
  await fs.writeFile(settingsFile, "invalid json");
  await assert.rejects(scheduler.saveTheme(false));
  assert.equal(await fs.readFile(settingsFile, "utf8"), "invalid json", "Theme saves must not erase unreadable collection settings");
});
