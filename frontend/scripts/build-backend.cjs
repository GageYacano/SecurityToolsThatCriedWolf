const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const frontendRoot = path.resolve(__dirname, "..");
const repositoryRoot = path.resolve(frontendRoot, "..");
const onionManagerRoot = path.join(repositoryRoot, "OnionManager");
const outputDirectory = path.join(frontendRoot, "backend");
const outputJar = path.join(outputDirectory, "OnionManager.jar");
const wrapper = process.platform === "win32" ? "mvnw.cmd" : "mvnw";
const localMaven = path.join(onionManagerRoot, wrapper);
const mavenCommand = process.env.MAVEN_BIN || (fs.existsSync(localMaven) ? localMaven : "mvn");

execFileSync(mavenCommand, ["-q", "clean", "package"], {
  cwd: onionManagerRoot,
  stdio: "inherit",
});

fs.mkdirSync(outputDirectory, { recursive: true });
fs.copyFileSync(path.join(onionManagerRoot, "target", "OnionManager.jar"), outputJar);
console.log(`Copied runnable JAR to ${outputJar}`);
