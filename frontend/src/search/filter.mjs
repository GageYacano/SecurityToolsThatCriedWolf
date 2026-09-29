export const LAYER_ORDER = ["hardware", "firmware", "os", "libraries", "applications"];
export const normalizeQuery = (query) => query.trim().toLowerCase();
export const formatLabel = (key) => key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
export const formatVersions = (versions) => Array.isArray(versions) ? versions.join(", ") : String(versions ?? "");
export const isNameVersionTable = (value) => Array.isArray(value) && value.length > 0 && value.every(
  (item) => item && typeof item === "object" && "name" in item && "version" in item,
);

// Mirror the visible JSON renderer: name/version tables do not display other fields.
function displayedText(value) {
  if (value == null) return "null";
  if (isNameVersionTable(value)) return `Name Version ${value.map((item) => `${item.name} ${item.version}`).join(" ")}`;
  if (Array.isArray(value)) return value.map(displayedText).join(" ");
  if (typeof value === "object") return Object.entries(value).map(([key, nested]) => `${formatLabel(key)} ${displayedText(nested)}`).join(" ");
  return String(value);
}

export function groupVulnerabilities(findings) {
  const grouped = Object.fromEntries(LAYER_ORDER.map((layer) => [layer, []]));
  for (const finding of findings) {
    if (LAYER_ORDER.includes(finding.layer_affected)) grouped[finding.layer_affected].push(finding);
  }
  return grouped;
}

export function filterLayer(value, query, kind = "specs") {
  const normalized = normalizeQuery(query);
  if (value == null || (!Array.isArray(value) && typeof value === "object" && Object.hasOwn(value, "error"))) {
    return { value, count: 0, preserve: true };
  }
  const matches = (text) => text.toLowerCase().includes(normalized);
  if (Array.isArray(value)) {
    const table = isNameVersionTable(value);
    const filtered = !normalized ? value : value.filter((item) => {
      if (kind === "vulnerabilities") return matches([
        formatLabel(item.layer_affected), item.name, formatVersions(item.versions), item.date_reported, item.description,
      ].join(" "));
      return matches(table ? `Name ${item.name} Version ${item.version}` : displayedText(item));
    });
    return { value: filtered, count: filtered.length, preserve: false };
  }
  if (typeof value === "object") {
    const entries = Object.entries(value).filter(([key, nested]) => !normalized || matches(`${formatLabel(key)} ${displayedText(nested)}`));
    return { value: normalized ? Object.fromEntries(entries) : value, count: entries.length, preserve: false };
  }
  const count = !normalized || matches(displayedText(value)) ? 1 : 0;
  return { value, count, preserve: false };
}
