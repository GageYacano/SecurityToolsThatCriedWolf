const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI || "mongodb://onionadmin:change-this-password@127.0.0.1:27017/onionmanager?authSource=admin";
const searches = [
  ["openssl", "libraries"], ["ubuntu", "os"], ["linux kernel", "os"], ["docker", "applications"],
  ["node.js", "applications"], ["python", "applications"], ["java", "applications"], ["nginx", "applications"],
  ["curl", "libraries"], ["git", "applications"], ["mongodb", "applications"], ["apple firmware", "firmware"],
];

function description(cve) {
  return cve.descriptions?.find((item) => item.lang === "en")?.value || "No English description supplied by NVD.";
}

function keywords(cve, search) {
  const values = new Set([search.split(" ")[0].toLowerCase()]);
  for (const configuration of cve.configurations || []) for (const node of configuration.nodes || []) {
    for (const match of node.cpeMatch || []) {
      const parts = match.criteria?.split(":") || [];
      if (parts[3] && parts[3] !== "*") values.add(parts[3].replaceAll("_", " ").toLowerCase());
      if (parts[4] && parts[4] !== "*") values.add(parts[4].replaceAll("_", " ").toLowerCase());
    }
  }
  return [...values];
}

function versions(cve) {
  const values = new Set();
  for (const configuration of cve.configurations || []) for (const node of configuration.nodes || []) {
    for (const match of node.cpeMatch || []) {
      const version = match.criteria?.split(":")[5];
      if (version && version !== "*") values.add(version);
      for (const key of ["versionStartIncluding", "versionStartExcluding", "versionEndIncluding", "versionEndExcluding"]) {
        if (match[key]) values.add(`${key.replace("version", "")}:${match[key]}`);
      }
    }
  }
  return [...values].slice(0, 40);
}

async function fetchSearch(query) {
  const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(query)}&resultsPerPage=25`;
  const response = await fetch(url, { headers: { "User-Agent": "OnionManager-CVE-seeder/1.0" } });
  if (!response.ok) throw new Error(`NVD returned ${response.status} for ${query}`);
  return (await response.json()).vulnerabilities || [];
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const collection = client.db("onionmanager").collection("cves");
  const legacy = await collection.find({ id: { $exists: false } }).sort({ _id: 1 }).toArray();
  for (const [id, document] of legacy.entries()) {
    await collection.updateOne({ _id: document._id }, {
      $set: {
        id,
        cve_id: `CVE-SAMPLE-000${id + 1}`,
        layer_affected: String(document.layer_affected || "applications").toLowerCase(),
        keywords: [String(document.name || "").toLowerCase()],
        source: "local sample",
      },
    });
  }
  const highest = await collection.findOne({}, { sort: { id: -1 }, projection: { id: 1 } });
  let nextId = Number.isInteger(highest?.id) ? highest.id + 1 : 0;
  const seen = new Set();
  let imported = 0;
  for (const [search, layer] of searches) {
    try {
      for (const item of await fetchSearch(search)) {
        const cve = item.cve;
        if (!cve?.id || seen.has(cve.id)) continue;
        seen.add(cve.id);
        const record = {
          cve_id: cve.id, layer_affected: layer, keywords: keywords(cve, search),
          name: cve.id, date_reported: cve.published?.slice(0, 10) || "", versions: versions(cve),
          description: description(cve), source: "NVD", references: cve.references?.slice(0, 5).map((ref) => ref.url) || [],
        };
        const existing = await collection.findOne({ cve_id: cve.id }, { projection: { _id: 1, id: 1 } });
        if (existing) await collection.updateOne({ _id: existing._id }, { $set: record });
        else await collection.insertOne({ id: nextId++, ...record });
        imported++;
      }
    } catch (error) { console.warn(error.message); }
  }
  await collection.createIndex({ id: 1 }, { unique: true });
  await collection.createIndex({ cve_id: 1 }, { unique: true });
  console.log(`Imported ${imported} NVD records.`);
  await client.close();
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
