const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const vm = require("node:vm");

async function fixture(t, isPackaged = false) {
  const directory = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "onion-calendar-")));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const calls = [];
  let registered = false;
  const java = path.join(directory, "bin", "java");
  const jar = path.join(directory, "OnionManager.jar");
  await fs.mkdir(path.dirname(java));
  await fs.writeFile(java, "");
  await fs.writeFile(jar, "");
  const module = { exports: {} };
  vm.runInNewContext(await fs.readFile(path.join(__dirname, "collection-scheduler.cjs"), "utf8"), {
    module, process: { platform: "darwin", pid: process.pid, getuid: () => 501, env: {} },
    require(name) {
      if (name !== "node:child_process") return require(name);
      return { execFile(file, args, _options, callback) {
        if (file === "/usr/libexec/java_home") return callback(null, { stdout: directory, stderr: "" });
        if (file === java) return callback(null, { stdout: "", stderr: 'openjdk version "17.0.1"' });
        calls.push(args);
        if (args[0] === "print" && !registered) return callback(Object.assign(new Error("Missing"), { code: 113 }));
        if (args[0] === "bootstrap") registered = true;
        if (args[0] === "bootout") registered = false;
        callback(null, { stdout: args[0] === "print" ? "last exit code = 0" : "", stderr: "" });
      } };
    },
  });
  const label = `com.seniordesign.onionmanager.collection${isPackaged ? "" : ".dev"}`;
  const plistPath = path.join(directory, "Library", "LaunchAgents", `${label}.plist`);
  const settingsPath = path.join(directory, "settings.json");
  const scheduler = module.exports({ app: { isPackaged, getPath: () => directory },
    snapshotPath: () => path.join(directory, "snapshots", "latest-config.json"), resolveJarPath: () => jar });
  return { scheduler, calls, plistPath, settingsPath, label };
}

function calendar(plist) {
  assert.doesNotMatch(plist, /<key>StartInterval<\/key>/);
  const content = plist.match(/<key>StartCalendarInterval<\/key><array>(.*?)<\/array>/s)?.[1];
  assert.ok(content, "Calendar schedule must exist");
  return [...content.matchAll(/<dict>(.*?)<\/dict>/gs)].map((match) => Object.fromEntries(
    [...match[1].matchAll(/<key>(Minute|Hour)<\/key><integer>(\d+)<\/integer>/g)].map((part) => [part[1], Number(part[2])])));
}

test("every preset generates the expected local clock schedule; changes do not kickstart", async (t) => {
  const f = await fixture(t);
  const expected = new Map([
    [1, Array.from({ length: 60 }, (_, Minute) => ({ Minute }))],
    [15, [0, 15, 30, 45].map((Minute) => ({ Minute }))],
    [30, [0, 30].map((Minute) => ({ Minute }))],
    [60, [{ Minute: 0 }]],
    [360, [0, 6, 12, 18].map((Hour) => ({ Hour, Minute: 0 }))],
    [1440, [{ Hour: 0, Minute: 0 }]],
  ]);
  for (const [minutes, entries] of expected) {
    const result = await f.scheduler.saveSettings({ automaticCollection: true, collectionIntervalMinutes: minutes });
    assert.equal(result.error, null);
    assert.deepEqual(calendar(await fs.readFile(f.plistPath, "utf8")), entries);
  }
  assert.equal(f.calls.filter(([command]) => command === "kickstart").length, 1);
  assert.equal(f.calls.filter(([command]) => command === "bootstrap").length, 6);
  assert.ok(f.calls.filter(([command]) => command === "bootout").every(([, service]) => service === `gui/501/${f.label}`));
  await f.scheduler.saveSettings({ automaticCollection: false, collectionIntervalMinutes: 1440 });
  await assert.rejects(fs.access(f.plistPath), { code: "ENOENT" });
  assert.equal((await f.scheduler.getSettings()).status, "inactive");
});

for (const isPackaged of [false, true]) {
  test(`migrates old ${isPackaged ? "installed" : "development"} plist on startup and Save`, async (t) => {
    const f = await fixture(t, isPackaged);
    await f.scheduler.saveTheme(true);
    await f.scheduler.saveSettings({ automaticCollection: true, collectionIntervalMinutes: 15 });
    const desired = await fs.readFile(f.plistPath, "utf8");
    const legacy = desired.replace(/<key>StartCalendarInterval<\/key><array>.*?<\/array>/s, "<key>StartInterval</key><integer>900</integer>");
    for (const operation of [() => f.scheduler.initialize(), () => f.scheduler.saveSettings({ automaticCollection: true, collectionIntervalMinutes: 15 })]) {
      await fs.writeFile(f.plistPath, legacy);
      f.calls.length = 0;
      await operation();
      assert.equal(await fs.readFile(f.plistPath, "utf8"), desired);
      assert.deepEqual(f.calls.filter(([command]) => ["bootout", "bootstrap", "kickstart"].includes(command)).map(([command]) => command), ["bootout", "bootstrap"]);
      assert.deepEqual(JSON.parse(await fs.readFile(f.settingsPath)), { automaticCollection: true, collectionIntervalMinutes: 15, darkMode: true });
      f.calls.length = 0;
      await f.scheduler.initialize();
      assert.equal(f.calls.some(([command]) => ["bootout", "bootstrap", "kickstart"].includes(command)), false);
    }
  });
}
