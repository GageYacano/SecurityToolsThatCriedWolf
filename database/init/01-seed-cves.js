const cves = [
  { cve_id: "CVE-SAMPLE-0003", layer_affected: "hardware", keywords: ["intel", "amd", "arm"], name: "Processor firmware sample", date_reported: "07:15:2026", versions: [], description: "Sample hardware match for development and demonstration.", source: "local sample" },
  { cve_id: "CVE-SAMPLE-0004", layer_affected: "firmware", keywords: ["apple", "efi", "firmware"], name: "Firmware sample", date_reported: "06:40:2026", versions: [], description: "Sample firmware match for development and demonstration.", source: "local sample" },
  { cve_id: "CVE-SAMPLE-0005", layer_affected: "applications", keywords: ["docker", "java", "node", "python"], name: "Runtime sample", date_reported: "05:30:2026", versions: [], description: "Sample application/runtime match for development and demonstration.", source: "local sample" },
];

db = db.getSiblingDB("onionmanager");
if (db.cves.countDocuments() === 0) db.cves.insertMany(cves.map((cve, id) => ({ id, ...cve })));
db.cves.createIndex({ id: 1 }, { unique: true });
db.cves.createIndex({ cve_id: 1 }, { unique: true });
db.cves.createIndex({ layer_affected: 1 });