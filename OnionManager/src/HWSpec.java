import java.io.BufferedReader;
import java.io.InputStreamReader;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

public class HWSpec implements LayerRequirements{
	
	// Stores the json info, will not be destroyed and will be used to check
	// For any new changes each time load data is called
	private String data = "";
	
	// Gets all the data you will be needing. This is basically your main
	public void loadData() {
		String myData = "";
		// Get data, blah blah blah
		ObjectNode hwJson = getHardwareJson();
		ObjectNode gpuJson = getGPUJson();

		data = getCombinedJson(hwJson, gpuJson);
//		System.out.println(data);

		debugJson(data);
//
//		if(checkDuplicate()){
//			data = myData;
//		}
	}
	
	public boolean checkDuplicate() {
		// if data == "" 			--> return true
		// if data != loadData.info --> return true
		// if data == loadData.info --> return false
		return false;
	}

	// Does checks and then returns info
	public String toQuery() {
		loadData();
		return data;
	}

	/* --------  Hardware info fetching functions -------- */

	// Combines JSON from all functions into one JSON object and returns it as a string
	public String getCombinedJson(ObjectNode hwJson, ObjectNode gpuJson){
		ObjectMapper mapper = new ObjectMapper();
		ObjectNode hardwareJson = mapper.createObjectNode();

		// Parse HW JSON
		hardwareJson.set("model", hwJson.path("model"));
		hardwareJson.set("name", hwJson.path("name"));
		hardwareJson.set("modelNumber", hwJson.path("modelNumber"));
		hardwareJson.set("serialNumber", hwJson.path("serialNumber"));
		hardwareJson.set("cpu", hwJson.path("cpu"));
		hardwareJson.set("memory", hwJson.path("memory"));

		// Parse GPU JSON
		hardwareJson.set("gpu", gpuJson.path("gpu"));
		hardwareJson.set("display", gpuJson.path("display"));

		// Created combined JSON object
		ObjectNode combinedJson = mapper.createObjectNode();
		combinedJson.set("hardware", hardwareJson);
		return combinedJson.toString();

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

	// Gets CPU, memory, etc
	private ObjectNode getHardwareJson(){

		ObjectMapper mapper = new ObjectMapper();
		ObjectNode hwJson = mapper.createObjectNode();

		try{
			// Create process
			ProcessBuilder processBuilder = new ProcessBuilder("system_profiler", "SPHardwareDataType", "-json");
			processBuilder.redirectErrorStream(true);

			// Start process
			Process process = processBuilder.start();

			// Read output of system_profiler command
			BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
			StringBuilder output = new StringBuilder();
			String line;
			while ((line = reader.readLine()) != null){
				output.append(line).append("\n");
			}

			// Wait for process to finish
			int exitCode = process.waitFor();
			if(exitCode != 0){
				System.err.println("Error: system_profiler command failed.");
				return hwJson;
			}

			JsonNode root = mapper.readTree(output.toString());
			JsonNode hardwareData = root.path("SPHardwareDataType");
			if (!hardwareData.isArray() || hardwareData.isEmpty()) {
				return hwJson;
			}

			JsonNode hw = hardwareData.get(0);
			hwJson.put("model", hw.path("machine_model").asText(""));
			hwJson.put("name", hw.path("machine_name").asText(""));
			hwJson.put("modelNumber", hw.path("model_number").asText(""));
			hwJson.put("serialNumber", hw.path("serial_number").asText(""));

			ObjectNode cpuJson = mapper.createObjectNode();
			cpuJson.put("chipset", hw.path("chip_type").asText(""));
			cpuJson.put("numberProcessors", hw.path("number_processors").asText(""));
			hwJson.set("cpu", cpuJson);

			ObjectNode memoryJson = mapper.createObjectNode();
			memoryJson.put("capacity", hw.path("physical_memory").asText(""));
			hwJson.set("memory", memoryJson);
		}catch(Exception e){
			e.printStackTrace();
		}

		return hwJson;
	}

	// Gets GPU and display info
	private ObjectNode getGPUJson(){

		ObjectMapper mapper = new ObjectMapper();
		ObjectNode hwJson = mapper.createObjectNode();

		try{
			// Create process
			ProcessBuilder processBuilder = new ProcessBuilder("system_profiler", "SPDisplaysDataType", "-json");
			processBuilder.redirectErrorStream(true);

			// Start process
			Process process = processBuilder.start();

			// Read output of system_profiler command
			BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
			StringBuilder output = new StringBuilder();
			String line;
			while ((line = reader.readLine()) != null){
				output.append(line).append("\n");
			}

			// Wait for process to finish
			int exitCode = process.waitFor();
			if(exitCode != 0){
				System.err.println("Error: system_profiler command failed.");
				return hwJson;
			}

			JsonNode root = mapper.readTree(output.toString());
			JsonNode displayData = root.path("SPDisplaysDataType");
			if (!displayData.isArray() || displayData.isEmpty()) {
				return hwJson;
			}

			JsonNode gpu = displayData.get(0);
			ObjectNode gpuNode = mapper.createObjectNode();
			gpuNode.put("chipsetModel", gpu.path("sppci_model").asText(""));
			gpuNode.put("type", gpu.path("sppci_device_type").asText(""));
			gpuNode.put("bus", gpu.path("sppci_bus").asText(""));
			gpuNode.put("cores", gpu.path("sppci_cores").asText(""));
			gpuNode.put("vendor", gpu.path("spdisplays_vendor").asText(""));
			hwJson.set("gpu", gpuNode);

			JsonNode displays = gpu.path("spdisplays_ndrvs");
			if (displays.isArray() && !displays.isEmpty()) {
				JsonNode display = displays.get(0);
				ObjectNode displayNode = mapper.createObjectNode();
				displayNode.put("name", display.path("_name").asText(""));
				displayNode.put("product_id", display.path("_spdisplays_display-product-id").asText(""));
				displayNode.put("serial_number", display.path("_spdisplays_display-serial-number").asText(""));
				displayNode.put("type", display.path("spdisplays_display_type").asText(""));
				displayNode.put("pixels", display.path("_spdisplays_pixels").asText(""));
				displayNode.put("resolution", display.path("_spdisplays_resolution").asText(""));
				displayNode.put("connection", display.path("spdisplays_connection_type").asText(""));
				hwJson.set("display", displayNode);
			}
		}catch(Exception e){
			e.printStackTrace();
		}

		return hwJson;
	}


}
