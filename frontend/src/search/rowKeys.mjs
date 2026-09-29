// Keys belong to the rendered list, never to the collected/exported records.
export function nameVersionRowKeys(rows) {
  const occurrences = new Map();
  return rows.map((row) => {
    const identity = [row.path ?? "", row.name ?? "", row.version ?? ""];
    const base = JSON.stringify(identity);
    const occurrence = occurrences.get(base) ?? 0;
    occurrences.set(base, occurrence + 1);
    return JSON.stringify([...identity, occurrence]);
  });
}
