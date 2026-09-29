const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

module.exports = function createSnapshotExporter({ readSnapshot, snapshotPath, downloadsPath, showSaveDialog }) {
  let exporting = false;
  return async function exportSnapshot() {
    if (exporting) return { status: "busy", message: "An export is already in progress." };
    exporting = true;
    let temporary;
    try {
      const result = await readSnapshot();
      if (result.status !== "found") return { status: "error", message: result.message || "No saved configuration to export. Select Get OnionS first." };
      // Capture before the dialog: scheduled collection may replace the source while it is open.
      const content = JSON.stringify(result.snapshot, null, 2) + "\n";
      const timestamp = new Date(result.snapshot.collectedAt).toISOString().replace(/\.\d{3}Z$/, "Z").replace(/:/g, "-");
      const { canceled, filePath } = await showSaveDialog({
        title: "Export system specifications",
        defaultPath: path.join(downloadsPath(), `onionmanager-specs-${timestamp}.json`),
        filters: [{ name: "JSON", extensions: ["json"] }],
        properties: ["showOverwriteConfirmation"],
      });
      if (canceled || !filePath) return { status: "cancelled" };

      const source = snapshotPath();
      const sourcePath = path.join(await fs.realpath(path.dirname(source)), path.basename(source));
      const targetPath = path.join(await fs.realpath(path.dirname(filePath)), path.basename(filePath));
      if (sourcePath === targetPath) throw new Error("Choose a location outside the app's live snapshot file.");
      // Resolve existing symlinks and hard links before allowing an overwrite.
      try {
        const [targetReal, sourceReal, targetStat, sourceStat] = await Promise.all([
          fs.realpath(filePath), fs.realpath(source), fs.stat(filePath), fs.stat(source),
        ]);
        if (targetReal === sourceReal || (targetStat.dev === sourceStat.dev && targetStat.ino === sourceStat.ino)) {
          throw new Error("Choose a location outside the app's live snapshot file.");
        }
      } catch (error) { if (error.code !== "ENOENT") throw error; }

      // Write beside the destination and rename, so a failed write preserves an existing export.
      temporary = path.join(path.dirname(filePath), `.onionmanager-export-${randomUUID()}.tmp`);
      await fs.writeFile(temporary, content, { encoding: "utf8", mode: 0o600, flag: "wx" });
      await fs.rename(temporary, filePath);
      return { status: "success", filePath };
    } catch (error) {
      return { status: "error", message: `Unable to export configuration: ${error.message}` };
    } finally {
      if (temporary) await fs.rm(temporary, { force: true }).catch(() => {});
      exporting = false;
    }
  };
};
