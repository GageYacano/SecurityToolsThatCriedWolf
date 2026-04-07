package com.seniordesign;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import oshi.SystemInfo;
import oshi.hardware.CentralProcessor;
import oshi.hardware.ComputerSystem;
import oshi.hardware.GraphicsCard;
import oshi.hardware.HardwareAbstractionLayer;

public class HWSpec implements LayerRequirements {
	private String data = "";
	private String currentData = "";
	
	// Gets all the data you will be needing. This is basically your main
	public void loadData() {
		// Get all hardware data (CPU, memory, GPU, motherboard, storage, etc)
		ObjectNode hwJson = getHardwareJson();

		currentData = getCombinedJson(hwJson);

		if(!checkDuplicate()){
			data = currentData;
		}
		debugJson(data);
	}

	// returns true if the data is the same as the current data and is not empty, otherwise returns false
	public boolean checkDuplicate() {
		return data.equals(currentData) &&  !data.isEmpty();
    }

	// Does checks and then returns info
	public String toQuery() {
		loadData();
		return data;
	}

	/* --------  Hardware info fetching functions -------- */

	// Combines all hardware JSON into single object and returns it as a string
	public String getCombinedJson(ObjectNode hwJson){
		ObjectMapper mapper = new ObjectMapper();
		ObjectNode combinedJson = mapper.createObjectNode();

		// Wrap all hardware data under top-level hardware object
		combinedJson.set("hardware", hwJson);
		String combinedJsonString = "";
		try {
		combinedJsonString = mapper.writerWithDefaultPrettyPrinter().writeValueAsString(combinedJson);
		} catch (Exception e) {}
		
		return combinedJsonString;
	}

	// Pretty-prints JSON for clean debug output
	private void debugJson(String json) {
		try {
			ObjectMapper mapper = new ObjectMapper();
			JsonNode node = mapper.readTree(json);
			String pretty = mapper.writerWithDefaultPrettyPrinter().writeValueAsString(node);
			System.out.println(pretty);
		} catch (JsonProcessingException e) {
			System.err.println("Failed to pretty-print JSON.");
			e.printStackTrace();
		}
	}

	// Gets CPU, memory, GPU, etc using OSHI library (cross-platform)
	private ObjectNode getHardwareJson(){

		ObjectMapper mapper = new ObjectMapper();
		ObjectNode hwJson = mapper.createObjectNode();

		try{
			// Get all hardware components and combine into one object
			hwJson.setAll(getSystemInfo());
			hwJson.setAll(getMotherboardInfo());
			hwJson.setAll(getCPUInfo());
			hwJson.setAll(getMemoryInfo());
			hwJson.setAll(getPCIDevices());
			hwJson.setAll(getGPUJson());
		}catch(Exception e){
			e.printStackTrace();
		}

		return hwJson;
	}

	// Gets basic system information (model, name, serial)
	private ObjectNode getSystemInfo() {
		ObjectMapper mapper = new ObjectMapper();
		ObjectNode systemJson = mapper.createObjectNode();

		try {
			SystemInfo systemInfo = new SystemInfo();
			HardwareAbstractionLayer hal = systemInfo.getHardware();
			ComputerSystem computerSystem = hal.getComputerSystem();

			systemJson.put("model", computerSystem.getModel());
			systemJson.put("name", computerSystem.getManufacturer());
			systemJson.put("serialNumber", computerSystem.getSerialNumber());
		} catch (Exception e) {
			e.printStackTrace();
		}

		return systemJson;
	}

	// Gets motherboard information
	private ObjectNode getMotherboardInfo() {
		ObjectMapper mapper = new ObjectMapper();
		ObjectNode motherboardJson = mapper.createObjectNode();

		try {
			SystemInfo systemInfo = new SystemInfo();
			HardwareAbstractionLayer hal = systemInfo.getHardware();
			ComputerSystem computerSystem = hal.getComputerSystem();

			ObjectNode mbJson = mapper.createObjectNode();
			mbJson.put("manufacturer", computerSystem.getManufacturer());
			mbJson.put("model", computerSystem.getModel());
			motherboardJson.set("motherboard", mbJson);
		} catch (Exception e) {
			e.printStackTrace();
		}

		return motherboardJson;
	}

	// Gets CPU information (chipset, family, model, cores, clock speed, architecture, cache)
	private ObjectNode getCPUInfo() {
		ObjectMapper mapper = new ObjectMapper();
		ObjectNode cpuInfoJson = mapper.createObjectNode();

		try {
			SystemInfo systemInfo = new SystemInfo();
			HardwareAbstractionLayer hal = systemInfo.getHardware();
			CentralProcessor processor = hal.getProcessor();

			ObjectNode cpuJson = mapper.createObjectNode();
			cpuJson.put("chipset", processor.getProcessorIdentifier().getName());
			cpuJson.put("family", processor.getProcessorIdentifier().getFamily());
			cpuJson.put("model", processor.getProcessorIdentifier().getModel());
			cpuJson.put("numberProcessors", String.valueOf(processor.getLogicalProcessorCount()));
			cpuJson.put("coreCount", String.valueOf(processor.getPhysicalProcessorCount()));
			cpuJson.put("clockSpeed", formatClockSpeed(processor.getProcessorIdentifier().getVendorFreq()));
			cpuJson.put("architecture", processor.getProcessorIdentifier().getMicroarchitecture());

			// Add cache information
			cpuJson.set("cache", getCPUCacheInfo(processor));

			cpuInfoJson.set("cpu", cpuJson);
		} catch (Exception e) {
			e.printStackTrace();
		}

		return cpuInfoJson;
	}

	// Gets CPU cache information (L1/L2/L3)
	private ObjectNode getCPUCacheInfo(CentralProcessor processor) {
		ObjectMapper mapper = new ObjectMapper();
		ObjectNode cacheJson = mapper.createObjectNode();

		try {
			java.util.List<oshi.hardware.CentralProcessor.ProcessorCache> caches = processor.getProcessorCaches();
			for (oshi.hardware.CentralProcessor.ProcessorCache cache : caches) {
				String cacheType = cache.getType().toString();
				cacheJson.put(cacheType.toLowerCase(), formatBytes(cache.getCacheSize()));
			}
			// If no caches found, add placeholder values
			if (caches.isEmpty()) {
				cacheJson.put("l1d", "");
				cacheJson.put("l1i", "");
				cacheJson.put("l2", "");
				cacheJson.put("l3", "");
			}
		} catch (Exception e) {
			e.printStackTrace();
		}

		return cacheJson;
	}

	// Gets memory information (capacity, available, type, speed)
	private ObjectNode getMemoryInfo() {
		ObjectMapper mapper = new ObjectMapper();
		ObjectNode memoryInfoJson = mapper.createObjectNode();

		try {
			SystemInfo systemInfo = new SystemInfo();
			HardwareAbstractionLayer hal = systemInfo.getHardware();

			ObjectNode memoryJson = mapper.createObjectNode();
			long totalMemory = hal.getMemory().getTotal();
			memoryJson.put("capacity", formatBytes(totalMemory));
			memoryJson.put("available", formatBytes(hal.getMemory().getAvailable()));

			memoryInfoJson.set("memory", memoryJson);
		} catch (Exception e) {
			e.printStackTrace();
		}

		return memoryInfoJson;
	}

	// Gets PCI devices list (network and storage devices)
	private ObjectNode getPCIDevices() {
		ObjectMapper mapper = new ObjectMapper();
		ObjectNode pciJson = mapper.createObjectNode();

		try {
			SystemInfo systemInfo = new SystemInfo();
			HardwareAbstractionLayer hal = systemInfo.getHardware();

			java.util.List<ObjectNode> pciDevices = new java.util.ArrayList<>();

			// Get network devices
			for (oshi.hardware.NetworkIF netInterface : hal.getNetworkIFs()) {
				ObjectNode deviceNode = mapper.createObjectNode();
				deviceNode.put("type", "Network");
				deviceNode.put("name", netInterface.getName());
				deviceNode.put("displayName", netInterface.getDisplayName());
				pciDevices.add(deviceNode);
			}

			// Get storage devices
			java.util.List<oshi.hardware.HWDiskStore> disks = hal.getDiskStores();
			for (oshi.hardware.HWDiskStore disk : disks) {
				ObjectNode deviceNode = mapper.createObjectNode();
				deviceNode.put("type", "Storage");
				deviceNode.put("name", disk.getName());
				deviceNode.put("model", disk.getModel());
				deviceNode.put("size", formatBytes(disk.getSize()));
				pciDevices.add(deviceNode);
			}

			if (!pciDevices.isEmpty()) {
				pciJson.putPOJO("pciDevices", pciDevices);
			}
		} catch (Exception e) {
			e.printStackTrace();
		}
		return pciJson;
	}

	// Formats clock speed from Hz to GHz
	private String formatClockSpeed(long clockSpeed) {
		if (clockSpeed > 0) {
			return String.format("%.2f GHz", clockSpeed / 1e9);
		}
		return "";
	}

	// Formats bytes to human-readable format
	private String formatBytes(long bytes) {
		if (bytes <= 0) return "0 B";

		final String[] units = new String[] { "B", "KB", "MB", "GB", "TB" };
		int digitGroups = (int) (Math.log10(bytes) / Math.log10(1024));

		return String.format("%.2f %s", bytes / Math.pow(1024, digitGroups), units[digitGroups]);
	}

	// Gets GPU info using OSHI library (cross-platform)
	private ObjectNode getGPUJson(){

		ObjectMapper mapper = new ObjectMapper();
		ObjectNode gpuInfoJson = mapper.createObjectNode();

		try {
			// Initialize OSHI SystemInfo
			SystemInfo systemInfo = new SystemInfo();
			HardwareAbstractionLayer hal = systemInfo.getHardware();

			// Get graphics cards
			ObjectNode gpuNode = mapper.createObjectNode();
			java.util.List<GraphicsCard> gpus = hal.getGraphicsCards();

			if (!gpus.isEmpty()) {
				GraphicsCard gpu = gpus.get(0);  // Get first GPU
				gpuNode.put("chipsetModel", gpu.getName());
				gpuNode.put("vendor", gpu.getVendor());
				// For integrated GPUs (VRAM = 0), indicate shared system memory
				long vram = gpu.getVRam();

				if (vram == 0) {
					gpuNode.put("memory", "Integrated - shared with system memory");
				} 
				else {
					gpuNode.put("memory", formatBytes(vram));
				}
			}
			gpuInfoJson.set("gpu", gpuNode);
			
		} catch(Exception e) {
			e.printStackTrace();
		}
		return gpuInfoJson;
	}
}
