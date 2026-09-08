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
There is no automatic scheduling in this version.

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
