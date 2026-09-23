const { MongoClient } = require("mongodb");

const DEFAULT_URI = "mongodb://onionadmin:change-this-password@127.0.0.1:27017/onionmanager?authSource=admin";
const forbiddenKey = /^(?:\$|.*\.)/;

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function serialize(document) {
  const { _id, ...safeDocument } = document;
  return safeDocument;
 }

function validateValue(value, keyPath = "value") {
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return;
  if (Array.isArray(value)) { value.forEach((item, index) => validateValue(item, `${keyPath}[${index}]`)); return; }
  if (typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      if (!key || forbiddenKey.test(key)) throw new Error(`Invalid field name: ${key || "(blank)"}`);
      validateValue(nested, `${keyPath}.${key}`);
    }
    return;
  }
  throw new Error(`Unsupported value at ${keyPath}`);
}

function normalizeCve(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("A CVE must be a JSON object.");
  const document = clone(input);
  delete document._id;
  validateValue(document);
  if (typeof document.layer_affected !== "string" || !document.layer_affected.trim()) throw new Error("layer_affected is required and cannot be blank.");
  if (typeof document.name !== "string" || !document.name.trim()) throw new Error("name is required and cannot be blank.");
  document.layer_affected = document.layer_affected.trim();
  document.name = document.name.trim();
  if (document.versions !== undefined && !Array.isArray(document.versions)) throw new Error("versions must be an array when provided.");
  return document;
}

function versionParts(value) {
  const match = String(value).match(/\d+(?:\.\d+){0,3}/);
  return match ? match[0].split(".").map(Number) : null;
}

function compareVersions(left, right) {
  const a = versionParts(left);
  const b = versionParts(right);
  if (!a || !b) return null;
  for (let index = 0; index < Math.max(a.length, b.length); index++) {
    const difference = (a[index] || 0) - (b[index] || 0);
    if (difference) return Math.sign(difference);
  }
  return 0;
}

function systemVersions(value) {
  const versions = new Set();
  const visit = (node, key = "") => {
    if (typeof node === "string" && /(version|release|build)/i.test(key)) {
      for (const match of node.matchAll(/\d+(?:\.\d+){0,3}/g)) versions.add(match[0]);
    } else if (Array.isArray(node)) node.forEach((item) => visit(item, key));
    else if (node && typeof node === "object") Object.entries(node).forEach(([childKey, child]) => visit(child, childKey));
  };
  visit(value);
  return [...versions];
}

function componentCandidates(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return [value];
  return [{ value }];
}

function versionMatches(systemVersion, specs) {
  return specs.some((spec) => {
    const value = String(spec);
    const range = value.match(/^(StartIncluding|StartExcluding|EndIncluding|EndExcluding):(.+)$/);
    if (!range) return compareVersions(systemVersion, value) === 0;
    const comparison = compareVersions(systemVersion, range[2]);
    if (comparison === null) return false;
    if (range[1] === "StartIncluding") return comparison >= 0;
    if (range[1] === "StartExcluding") return comparison > 0;
    if (range[1] === "EndIncluding") return comparison <= 0;
    return comparison < 0;
  });
}

function createDatabase(options = {}) {
  const client = new MongoClient(options.uri || process.env.MONGODB_URI || DEFAULT_URI, { serverSelectionTimeoutMS: 3000 });
  let collection;
  async function getCollection() {
    if (!collection) {
      await client.connect();
      collection = client.db(options.database || "onionmanager").collection("cves");
      const legacy = await collection.find({ id: { $exists: false } }).sort({ _id: 1 }).toArray();
      for (const [id, document] of legacy.entries()) await collection.updateOne({ _id: document._id }, { $set: { id } });
      await collection.createIndex({ layer_affected: 1 });
      await collection.createIndex({ name: 1 });
    }
    return collection;
  }
  return {
    async scan(config = {}) {
      const cves = await getCollection();
      const documents = await cves.find({}, { projection: { _id: 0 } }).sort({ id: 1 }).limit(5000).toArray();
      const matches = [];
      for (const document of documents) {
        const layer = String(document.layer_affected || "").trim().toLowerCase();
        const scope = layer ? { [layer]: config[layer] || {} } : config;
        const specs = (document.versions || []).filter(Boolean);
        const candidates = Object.values(scope).flatMap(componentCandidates);
        const evidence = candidates.map((candidate) => {
          const systemText = JSON.stringify(candidate).toLowerCase();
          const matchedKeywords = (document.keywords || []).filter((keyword) => systemText.includes(String(keyword).toLowerCase()));
          if (!matchedKeywords.length) return null;
          const currentVersions = systemVersions(candidate);
          const matchedVersions = specs.length
            ? currentVersions.filter((version) => versionMatches(version, specs))
            : [];
          if (specs.length && !matchedVersions.length) return null;
          return matchedKeywords.concat(matchedVersions.map((version) => `version:${version}`));
        }).find(Boolean);
        if (evidence) matches.push({ ...serialize(document), matchedOn: evidence });
      }
      return matches;
    },
    async close() { await client.close(); collection = undefined; },
  };
}

module.exports = { createDatabase, normalizeCve };