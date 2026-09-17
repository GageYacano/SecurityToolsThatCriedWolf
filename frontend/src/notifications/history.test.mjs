import test from "node:test";
import assert from "node:assert/strict";
import { collectionNotification, emptyHistory, formatTimestamp, historyReducer, loadHistory, persistHistory } from "./history.mjs";

const entry = (key, overrides = {}) => ({ key, category: "collection", severity: "general",
  message: "Configuration collected", timestamp: "2026-09-17T12:34:56Z", ...overrides });
const add = (state, value) => historyReducer(state, { type: "add", entry: value });
const health = (state, message, key) => historyReducer(state, { type: "health", message,
  entry: entry(key, { message, category: "scheduler", severity: "warning" }) });
const memoryStorage = () => {
  let value = null;
  return { getItem: () => value, setItem: (_key, next) => { value = next; } };
};

test("manual completion, polling and reload produce one entry per collection", () => {
  const snapshot = { collectedAt: "2026-09-17T12:34:56Z", config: { os: {} } };
  const notification = collectionNotification(snapshot);
  let state = add(emptyHistory(), notification);
  state = add(state, notification);
  const storage = memoryStorage();
  assert.equal(persistHistory(storage, state), null);
  state = add(loadHistory(storage).history, notification);
  assert.equal(state.entries.length, 1);
  assert.equal(state.entries[0].severity, "general");
});

test("partial collection is a warning", () => {
  const result = collectionNotification({ collectedAt: "2026-09-17T12:34:56Z", config: { os: {}, hardware: { error: "Denied" } } });
  assert.equal(result.severity, "warning");
  assert.match(result.message, /some layers/);
});

test("separate failed and busy manual attempts remain separate events", () => {
  let state = add(emptyHistory(), entry("failure", { severity: "warning", message: "Collection failed" }));
  state = add(state, entry("busy", { severity: "warning", message: "Another collection is already running" }));
  assert.equal(state.entries.length, 2);
});

test("unchanged health is deduplicated across polls and restarts; recurrence is recorded", () => {
  let state = health(emptyHistory(), "Job missing", "first");
  state = health(state, "Job missing", "poll");
  const storage = memoryStorage();
  persistHistory(storage, state);
  state = health(loadHistory(storage).history, "Job missing", "restart");
  assert.equal(state.entries.length, 1);
  state = health(state, null);
  state = health(state, "Job missing", "recurrence");
  assert.equal(state.entries.length, 2);
});

test("opening marks history and live arrivals read without clearing health", () => {
  let state = health(emptyHistory(), "Job failed", "health");
  assert.equal(state.entries[0].read, false);
  state = historyReducer(state, { type: "open", open: true });
  state = add(state, entry("live"));
  assert.ok(state.entries.every((event) => event.read));
  assert.equal(state.health, "Job failed");
  const storage = memoryStorage();
  persistHistory(storage, state);
  state = loadHistory(storage).history;
  assert.equal(state.open, false);
  assert.ok(state.entries.every((event) => event.read));
  state = add(state, entry("later"));
  assert.equal(state.entries.find((event) => event.key === "later").read, false);
});

test("history retains the newest 200 events sorted by occurrence", () => {
  let state = emptyHistory();
  for (let index = 0; index < 205; index++) state = add(state, entry(String(index), { timestamp: new Date(index * 1000).toISOString() }));
  assert.equal(state.entries.length, 200);
  assert.equal(state.entries[0].key, "204");
  assert.equal(state.entries.at(-1).key, "5");
  state = add(state, entry("old snapshot", { timestamp: new Date(0).toISOString() }));
  assert.equal(state.entries.at(-1).key, "5");
});

test("malformed and unsupported stored history recover with a visible warning", () => {
  for (const raw of ["broken", "null", '{"version":2}', JSON.stringify({ version: 1, health: null, entries: [entry("bad", { timestamp: "invalid", read: false })] })]) {
    const result = loadHistory({ getItem: () => raw });
    assert.equal(result.history.entries.length, 0);
    assert.ok(result.warning);
  }
  assert.equal(loadHistory(memoryStorage()).warning, null);
});

test("storage exceptions leave session history usable", () => {
  const storage = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("quota"); } };
  const loaded = loadHistory(storage);
  assert.ok(loaded.warning);
  const state = add(loaded.history, entry("session"));
  assert.match(persistHistory(storage, state), /session only/);
  assert.equal(state.entries.length, 1);
});

test("timestamps use padded local time and day/month/year", () => {
  assert.equal(formatTimestamp(new Date(2026, 0, 2, 3, 4, 5).toISOString()), "03:04:05 on 02/01/2026");
});
