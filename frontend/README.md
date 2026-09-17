# OnionManager frontend

This Electron + React frontend runs the bundled OnionManager JAR to collect
system configuration. The backend saves a JSON snapshot; Electron reads it for
the UI. Java stdout/stderr remain diagnostic output, not the data interface.

## Prerequisites

- Node.js and npm
- Java 17 (needed to run OnionManager during development and by recipients
  unless a JRE is bundled)
- Maven (needed only on the build machine)
- macOS tools used by OnionManager, including `system_profiler` and (for
  library data) Homebrew's `brew`**

## Run

From this directory:

```bash
npm install
npm run dev
```

`npm run dev` builds only the backend JAR, starts the Vite development server,
and opens Electron. It does not create an installer.

`npm run build` creates the self-contained
`frontend/backend/OnionManager.jar` and builds the React renderer. Build an
installable Electron artifact with:

```bash
npm run dist
```

`electron-builder` detects the current operating system and architecture. The
artifacts are written to `frontend/release/`:

- macOS: send the `.dmg` installer (or `.zip`) to Mac users.
- Windows: send the generated `.exe` installer to Windows users.
- Linux: send the generated Linux package to Linux users.

Build each platform on that platform for the most reliable result. For example,
run `npm run dist` on macOS to create the Mac installer and on Windows to create
the Windows `.exe`.

On macOS, install the build prerequisites with Homebrew if needed:

```bash
brew install maven
brew install --cask temurin@17
```

The packaged application includes the runnable JAR and does not require Maven.
Recipients still need Java 17 unless a Java runtime is bundled separately.
OnionManager also depends on operating-system-specific tools, so all supported
platform commands must be available on the recipient's machine.

If Maven is installed but the build cannot find it, provide its absolute path:

```bash
MAVEN_BIN="$(command -v mvn)" npm run dist
```

## Saved configuration

**Get OnionS** collects once, saves the snapshot, and displays it when the Java
process finishes. Existing results stay visible during collection. The app loads
the latest snapshot on startup and when its window regains focus, and displays
its collection timestamp. These reads do not trigger another collection.

Packaged apps store `latest-config.json` in:

- macOS: `~/Library/Application Support/OnionManager/snapshots/`
- Windows: `%APPDATA%\OnionManager\snapshots\`
- Linux: `$XDG_CONFIG_HOME/OnionManager/snapshots/`, normally
  `~/.config/OnionManager/snapshots/`

Development uses `OnionManager-dev` instead of `OnionManager`. Storage uses
Electron's platform application-data directory and is independent of the app's
display name. It is outside the installation directory and persists across builds.

The file contains `schemaVersion: 1`, a UTC `collectedAt` timestamp, and `config`
with the five layer keys. Failed or unsupported layers contain an `error`
message. Partial results are saved; if all layers fail, the previous snapshot is
preserved. An invalid saved file produces a visible error rather than being
silently accepted.

To collect directly, independently of Electron:

```text
java -jar OnionManager.jar --output "/absolute/path/latest-config.json"
```

The backend creates the parent directory and uses a sibling
`latest-config.json.lock` file to prevent overlapping collections. The lock file
stays on disk; its existence does not mean collection is running. The actual
lock is released when the process exits. A temporary file is atomically moved
into place after collection; if that operation fails, the previous snapshot is
retained. Use a local filesystem that supports atomic replacement.

Exit codes: `0` = saved (including partial results), `1` = failure or invalid
arguments, `2` = another collector holds the lock. Without `--output`, the CLI
continues to print configuration JSON to stdout. Diagnostics go to stderr.

Closing the window or quitting Electron terminates its manual Java collection.
A snapshot already saved remains valid; interrupted writes cannot expose a
partially written JSON file. Direct CLI runs are independent of Electron.
Automatic collection can be enabled in Settings on macOS; see below.

## Platform coverage

Snapshot storage and loading use portable Java, Node, and Electron APIs.
Hardware and OS collection use OSHI. Firmware, applications, and libraries are
currently collected only on macOS; Windows and Linux show explicit unsupported
messages for those three layers. Homebrew is required for macOS libraries.
Node.js, npm, and Maven are build prerequisites, not recipient prerequisites.

## Manual verification

- Collect, quit, and reopen: saved results and timestamp should return.
- Refresh: old results remain visible until the new snapshot is loaded.
- Confirm partial failures show layer errors and total failure preserves old data.
- Run two collectors with the same output path: the second should exit with code 2.
- Close during collection, reopen, and collect again: no corrupt snapshot or stuck lock.
- Check missing/invalid snapshots and an output path containing spaces.
- Verify installed builds on each target platform; building on macOS alone does
  not verify Windows or Linux behavior.

## Automatic collection (macOS)

### Notifications

The bell in the header opens a history of configuration collections, partial
results, failed manual attempts, settings errors, and scheduler health warnings.
The badge counts unread messages; opening the dialog marks them read without
clearing active warnings on the main screen. Dates use local time in
`HH:mm:ss on DD/MM/YYYY` format.

The latest 200 observed messages and their read state persist in local browser
storage. Development and packaged origins have separate histories. Repeated
polls do not duplicate a collection or an unchanged scheduler warning. If a
problem resolves and later recurs, it produces a new warning.

History records events observed by the open app. Reopening can report the latest
snapshot and current scheduler problems, but cannot reconstruct every background
run while the app was closed. Vulnerability findings will be connected when
vulnerability scanning is implemented. No operating-system notifications are sent.

Run notification history tests with `npm test` from `frontend/`.

### Settings and behavior

Open Settings, enable **Automatic collection**, select an interval, and click
**Save**. It defaults to disabled with a one-hour interval. Available intervals
are 1 minute, 15 minutes, 30 minutes, 1 hour, 6 hours, and 24 hours. Cancel discards unsaved
changes; Save applies them immediately while leaving the dialog open to show
registration status or an error.

Enabling registers a per-user macOS LaunchAgent and requests an immediate run.
Later runs use the selected interval. Changing the interval does not request an
immediate run. Registration does not mean the first collection has finished:
check the snapshot's **Last collected** timestamp. The visible window checks
for saved changes every 30 seconds, as well as on startup and focus.

The job continues after Electron quits while you remain logged in. It does not
wake the Mac or replay missed intervals. Disabling unloads the job and removes
its plist. Disabling or changing intervals may stop a current scheduled run;
the existing atomic snapshot write protects saved data. Manual and scheduled
runs share the backend file lock, so a busy scheduled attempt is skipped.

Preferences are stored in `settings.json` in the `OnionManager` application-data
directory (one level above `snapshots`). Development uses `OnionManager-dev`.
Java is resolved from a compatible `JAVA_HOME` or macOS's `java_home` utility;
Java 17 or newer is required. Scheduled stderr is appended to
`collection-scheduler.log` alongside settings. This version does not rotate logs.

LaunchAgent files:

- Installed: `~/Library/LaunchAgents/com.seniordesign.onionmanager.collection.plist`
- Development: `~/Library/LaunchAgents/com.seniordesign.onionmanager.collection.dev.plist`

Development scheduling persists after `npm run dev` exits. Disable it in the
development Settings dialog when finished. Its settings, job, logs, and snapshots
are independent of the installed app.

Startup repairs missing or outdated registrations based on saved preferences,
including paths changed by moving the app. Reopen the installed app after moving
it. System-disabled background execution is reported instead of overridden;
check macOS System Settings, Login Items & Extensions, and retry Save. Settings
can be saved even if registration fails, so always check the displayed status.
Malformed settings produce an error; an explicit Save replaces them.

Disable automatic collection before deleting the app. If it has already been
removed, unload its orphaned job and remove its plist manually:

```bash
launchctl bootout "gui/$(id -u)/com.seniordesign.onionmanager.collection"
rm "$HOME/Library/LaunchAgents/com.seniordesign.onionmanager.collection.plist"
```

For a development job, append `.dev` to the label and filename. A missing-job
error from `bootout` means it is already unloaded; the plist can still be removed.
Keep your settings and snapshots unless you also want to discard saved data.

Windows and Linux scheduling are not implemented yet. No schedule is registered
by `npm run build` or `npm run dist`.

### Manual scheduling checks

- Verify disabled defaults and settings persistence; Cancel should not apply edits.
- Enable and verify an immediate snapshot update, then quit and wait for another.
- Change the interval and check that no extra immediate run starts.
- Disable during collection and verify the job is removed and the snapshot remains valid.
- Overlap a manual collection with the scheduled job and confirm only one proceeds.
- Leave the window visible and confirm new snapshots appear without switching windows.
- Check login/restart, sleep/wake, missing Java/JAR, moved paths, malformed settings,
  registration failures, and a job disabled through macOS.
- Verify development and installed jobs separately, and disable development
  scheduling after testing. Verify the installed build, not just development.
