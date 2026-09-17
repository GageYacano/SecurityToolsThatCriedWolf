export const STORAGE_KEY = "onionmanager.notifications.v1";
export const emptyHistory = () => ({ version: 1, entries: [], health: null, open: false });

export function loadHistory(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { history: emptyHistory(), warning: null };
    const value = JSON.parse(raw);
    if (value.version !== 1 || !Array.isArray(value.entries) ||
        !(value.health === null || typeof value.health === "string") ||
        !value.entries.every((entry) => entry &&
          ["key", "category", "message", "timestamp"].every((key) => typeof entry[key] === "string") &&
          Number.isFinite(Date.parse(entry.timestamp)) &&
          ["general", "warning"].includes(entry.severity) && typeof entry.read === "boolean")) {
      throw new Error("Invalid notification history");
    }
    return { history: { ...emptyHistory(), health: value.health,
      entries: [...new Map(value.entries.map((entry) => [entry.key, entry])).values()]
        .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)).slice(0, 200) }, warning: null };
  } catch {
    return { history: emptyHistory(), warning: "Notification history could not be loaded. New messages are available for this session." };
  }
}

export function persistHistory(storage, history) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, entries: history.entries, health: history.health }));
    return null;
  } catch {
    return "Notification history could not be saved. Messages are available for this session only.";
  }
}

export function historyReducer(state, action) {
  if (action.type === "open") return { ...state, open: action.open,
    entries: action.open ? state.entries.map((entry) => ({ ...entry, read: true })) : state.entries };
  if (action.type === "health") {
    if (state.health === action.message) return state;
    const next = { ...state, health: action.message };
    return action.message ? historyReducer(next, { type: "add", entry: action.entry }) : next;
  }
  if (action.type !== "add" || state.entries.some((entry) => entry.key === action.entry.key)) return state;
  return { ...state, entries: [{ ...action.entry, read: state.open }, ...state.entries]
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)).slice(0, 200) };
}

export function collectionNotification(snapshot) {
  const partial = Object.values(snapshot.config).some((layer) => layer?.error);
  return { key: `collection:${snapshot.collectedAt}`, category: "collection",
    severity: partial ? "warning" : "general", timestamp: snapshot.collectedAt,
    message: partial ? "Configuration collected with warnings; some layers could not be collected" : "Configuration collected" };
}

export function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const pad = (value) => String(value).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} on ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}
