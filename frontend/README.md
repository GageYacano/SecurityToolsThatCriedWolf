# OnionManager frontend

This is a minimal Electron + React frontend that starts a bundled, runnable
OnionManager JAR as a subprocess. It sends the `all` query followed by `done`,
logs stdout/stderr in the Electron terminal, and displays the same stream in
the window.

## Prerequisites

- Node.js and npm
- Java 17 (needed to run OnionManager during development and by recipients
  unless a JRE is bundled)
- Maven (needed only on the build machine)
- macOS tools used by OnionManager, including `system_profiler` and (for
  library data) Homebrew's `brew`

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
artifacts are written to `frontend/dist/`:

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

The **Query all layers** button starts:

```text
java -jar OnionManager.jar
```

with Electron's per-user application data directory as its working directory.
