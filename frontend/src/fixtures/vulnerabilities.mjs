// Fictional examples only. Imported exclusively by the Vite development branch.
const products = {
  hardware: ["Demo Processor", "Demo Processor", "Example Network Adapter"],
  firmware: ["Demo Boot Firmware", "Example Controller", "Demo Boot Firmware"],
  os: ["ExampleOS", "ExampleOS", "Demo Kernel"],
  libraries: ["Demo Crypto Library", "Example Parser", "Demo Crypto Library"],
  applications: ["Demo Browser", "Example Editor", "Demo Browser"],
};
const descriptions = [
  "Fictional development example: memory access issue while processing network input.",
  "Fictional development example: permission check missing when reading a local file.",
  "Fictional development example: NETWORK input can cause a memory allocation failure.",
];
export default Object.entries(products).flatMap(([layer_affected, names], layerIndex) => names.map((name, index) => ({
  layer_affected,
  date_reported: `2026-0${layerIndex + 1}-${String(index + 10).padStart(2, "0")}`,
  name,
  versions: index === 1 ? "2.0 through 2.3" : ["1.0", `1.${index + 1}`],
  description: descriptions[index],
})));
