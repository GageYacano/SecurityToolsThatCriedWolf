const fs = require("node:fs/promises");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const execute = promisify(execFile);
const PRESETS = [1, 15, 30, 60, 360, 1440];
const DEFAULTS = { automaticCollection: false, collectionIntervalMinutes: 60 };

function validSettings(value) {
  return value && typeof value.automaticCollection === "boolean" &&
    PRESETS.includes(value.collectionIntervalMinutes);
}

async function readOptional(file) {
  try { return await fs.readFile(file, "utf8"); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

async function writeAtomic(file, text) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  try {
    await fs.writeFile(temporary, text, { mode: 0o600 });
    await fs.rename(temporary, file);
  } finally {
    await fs.rm(temporary, { force: true });
  }
}

const xml = (value) => String(value).replace(/[&<>"']/g, (char) =>
  ({ "&": "&amp;", "<": "&lt;", '"': "&quot;", ">": "&gt;", "'": "&apos;" })[char]);

module.exports = function createScheduler({ app, snapshotPath, resolveJarPath }) {
  const supported = process.platform === "darwin";
  const label = `com.seniordesign.onionmanager.collection${app.isPackaged ? "" : ".dev"}`;
  const domain = supported ? `gui/${process.getuid()}` : "";
  const service = `${domain}/${label}`;
  const dataDirectory = () => path.dirname(path.dirname(snapshotPath()));
  const settingsPath = () => path.join(dataDirectory(), "settings.json");
  const plistPath = () => path.join(app.getPath("home"), "Library", "LaunchAgents", `${label}.plist`);
  let queue = Promise.resolve();
  let lastError = null;
  // Settings reads, saves and startup reconciliation must not race one another.
  const serial = (operation) => {
    const result = queue.then(operation);
    queue = result.catch(() => {});
    return result;
  };
  const launchctl = (...args) => execute("/bin/launchctl", args, { timeout: 10000 });

  async function preferences() {
    const raw = await readOptional(settingsPath());
    if (raw === null) return { ...DEFAULTS };
    const value = JSON.parse(raw);
    if (!validSettings(value)) throw new Error("Saved collection settings are invalid. Choose settings and Save to replace them.");
    return { automaticCollection: value.automaticCollection, collectionIntervalMinutes: value.collectionIntervalMinutes };
  }

  async function registered() {
    try { await launchctl("print", service); return true; }
    catch (error) {
      // launchctl reports ESRCH when this particular job is absent.
      if (error.code === 113 || error.code === 3 || /Could not find service/i.test(error.stderr || "")) return false;
      throw error;
    }
  }

  async function disabledBySystem() {
    const { stdout } = await launchctl("print-disabled", domain);
    const entry = stdout.split("\n").find((line) => line.includes(`"${label}"`));
    return entry ? /=>\s*(true|disabled)\b/i.test(entry) : false;
  }

  async function javaPath() {
    const candidates = [];
    if (process.env.JAVA_HOME) candidates.push(path.join(process.env.JAVA_HOME, "bin", "java"));
    try {
      const { stdout } = await execute("/usr/libexec/java_home", ["-v", "17+"], { timeout: 10000 });
      candidates.push(path.join(stdout.trim(), "bin", "java"));
    } catch { /* Report one actionable error if no candidate works. */ }
    for (const candidate of candidates) {
      try {
        const absolute = await fs.realpath(candidate);
        const { stdout, stderr } = await execute(absolute, ["-version"], { timeout: 10000 });
        const match = `${stdout}\n${stderr}`.match(/version\s+"(\d+)(?:\.(\d+))?/);
        if (match && Number(match[1]) >= 17) return absolute;
      } catch { /* Try the next installation. */ }
    }
    throw new Error("Automatic collection requires Java 17 or newer. Install a compatible JDK or set JAVA_HOME, then retry Save.");
  }

  function plist(java, jar, settings) {
    const args = [java, "-jar", jar, "--output", snapshotPath()];
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${xml(label)}</string>
<key>ProgramArguments</key><array>${args.map((arg) => `<string>${xml(arg)}</string>`).join("")}</array>
<key>WorkingDirectory</key><string>${xml(path.dirname(snapshotPath()))}</string>
<key>StartInterval</key><integer>${settings.collectionIntervalMinutes * 60}</integer>
<key>AssociatedBundleIdentifiers</key><array><string>com.seniordesign.onionmanager</string></array>
<key>StandardOutPath</key><string>/dev/null</string>
<key>StandardErrorPath</key><string>${xml(path.join(dataDirectory(), "collection-scheduler.log"))}</string>
</dict></plist>
`;
  }

  async function reconcile(settings, immediate = false) {
    if (!supported) return;
    const exists = await registered();
    if (!settings.automaticCollection) {
      if (exists) await launchctl("bootout", service);
      await fs.rm(plistPath(), { force: true });
      return;
    }
    if (await disabledBySystem()) {
      throw new Error("macOS has disabled this background job. Allow it in System Settings (Login Items & Extensions), then retry Save. OnionManager will not override that setting.");
    }
    const java = await javaPath();
    const jar = await fs.realpath(resolveJarPath());
    await fs.mkdir(path.dirname(snapshotPath()), { recursive: true });
    const desired = plist(java, jar, settings);
    const current = await readOptional(plistPath());
    if (!exists || current !== desired) {
      if (exists) await launchctl("bootout", service);
      await writeAtomic(plistPath(), desired);
      await launchctl("bootstrap", domain, plistPath());
    }
    // Startup repairs don't trigger collection. A Save that enables or retries
    // a missing registration starts through launchd, independently of Electron.
    if (immediate) await launchctl("kickstart", service);
  }

  async function view() {
    let settings = { ...DEFAULTS };
    let error = lastError;
    try { settings = await preferences(); }
    catch (failure) { error = `Unable to load collection settings: ${failure.message}`; }
    let status = supported ? "inactive" : "unsupported";
    if (supported) {
      try {
        if (await disabledBySystem()) status = "blocked";
        else if (await registered()) status = "active";
      } catch (failure) { error = `Unable to inspect automatic collection: ${failure.stderr || failure.message}`; status = "unknown"; }
    }
    let healthWarning = null;
    if (supported && settings.automaticCollection) {
      if (status === "inactive") healthWarning = "Automatic collection is enabled, but its background job is missing. Open Settings and Save to repair it.";
      if (status === "blocked") healthWarning = "macOS has disabled automatic collection. Check Login Items & Extensions in System Settings.";
      if (status === "unknown") healthWarning = "Automatic collection could not be checked. Open Settings for details.";
      if (status === "active") {
        try {
          const { stdout } = await launchctl("print", service);
          const exit = stdout.match(/last exit code = (-?\d+)/);
          // Exit 2 means another collector held the snapshot lock.
          if (exit && ![0, 2].includes(Number(exit[1]))) {
            healthWarning = `The last automatic collection failed (exit code ${exit[1]}). Try Get OnionS to check collection, then retry Save in Settings.`;
          }
          const raw = await readOptional(snapshotPath());
          const collectedAt = raw === null ? NaN : Date.parse(JSON.parse(raw).collectedAt);
          const overdueAfter = (settings.collectionIntervalMinutes * 2 + 5) * 60000;
          if (!healthWarning && !Number.isFinite(collectedAt)) {
            healthWarning = "Automatic collection has no dated saved configuration yet. If you just enabled it, allow time for the first collection to finish.";
          } else if (!healthWarning && Date.now() - collectedAt > overdueAfter) {
            healthWarning = "The saved configuration is overdue for an update. Sleep can delay collection; if it stays overdue while awake, try Get OnionS and check Settings.";
          }
        } catch (failure) {
          healthWarning = `Unable to verify automatic collection: ${failure.message}`;
        }
      }
    }
    return { settings, status, error, healthWarning, supported, development: !app.isPackaged };
  }

  return {
    getSettings: () => serial(view),
    saveSettings: (value) => serial(async () => {
      lastError = null;
      try {
        if (!supported) throw new Error("Automatic collection is currently available only on macOS.");
        if (!validSettings(value)) throw new Error("Choose a supported collection interval.");
        let previous = { ...DEFAULTS };
        try { previous = await preferences(); } catch { /* Explicit Save can replace malformed preferences. */ }
        const wasRegistered = await registered();
        const settings = { automaticCollection: value.automaticCollection, collectionIntervalMinutes: value.collectionIntervalMinutes };
        await writeAtomic(settingsPath(), JSON.stringify(settings, null, 2) + "\n");
        await reconcile(settings, settings.automaticCollection && (!previous.automaticCollection || !wasRegistered));
      } catch (error) { lastError = `Unable to apply automatic collection: ${error.stderr || error.message}`; }
      return view();
    }),
    initialize: () => serial(async () => {
      if (!supported) return;
      try { await reconcile(await preferences()); lastError = null; }
      catch (error) { lastError = `Automatic collection needs attention: ${error.stderr || error.message}`; }
    }),
  };
};
