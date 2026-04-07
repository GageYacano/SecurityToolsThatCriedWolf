package com.seniordesign;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import oshi.SystemInfo;
import oshi.software.os.OperatingSystem;
import oshi.software.os.OperatingSystem.OSVersionInfo;

public class OSSpec implements LayerRequirements {
	// Stores the json info, will not be destroyed and will be used to check
	// For any new changes each time load data is called
	private String data = "";

	// Constructor for OSSpec that runs loadData
	OSSpec(){
		loadData();
		System.out.println("OS Loaded");
	}

	// Gets all the data you will be needing. This is basically your main
	public void loadData() {
		ObjectNode osJson = getOSJson();
		data = getCombinedJson(osJson);

		debugJson(data);
	}

	// Does checks and then returns info
	public String toQuery() {
		loadData();
		return data;
	}

	// Wraps OS JSON under a top-level "os" key and returns as string
	public String getCombinedJson(ObjectNode osJson) {
		ObjectMapper mapper = new ObjectMapper();
		ObjectNode combinedJson = mapper.createObjectNode();
		combinedJson.set("os", osJson);
		return combinedJson.toString();
	}

	// Pretty prints JSON for clean debug output
	private void debugJson(String json) {
		try {
			ObjectMapper mapper = new ObjectMapper();
			JsonNode node = mapper.readTree(json);
			data = mapper.writerWithDefaultPrettyPrinter().writeValueAsString(node);
		} catch (JsonProcessingException e) {
			data = e.toString();
		}
	}

	// Gathers all OS fields into a single ObjectNode
	private ObjectNode getOSJson() {
		ObjectMapper mapper = new ObjectMapper();
		ObjectNode osJson = mapper.createObjectNode();

		try {
			SystemInfo si = new SystemInfo();
			OperatingSystem os = si.getOperatingSystem();
			OSVersionInfo versionInfo = os.getVersionInfo();
			oshi.software.os.NetworkParams networkParams = os.getNetworkParams();

			// Basic identity
			osJson.put("family", os.getFamily());
			osJson.put("manufacturer", os.getManufacturer());
			osJson.put("bitness", os.getBitness());

			// Version details
			ObjectNode versionNode = mapper.createObjectNode();
			versionNode.put("version", versionInfo.getVersion());
			versionNode.put("buildNumber", versionInfo.getBuildNumber());
			versionNode.put("codeName", versionInfo.getCodeName());
			osJson.set("versionInfo", versionNode);

			// Network / hostname
			osJson.put("hostname", networkParams.getHostName());
			osJson.put("domainName", networkParams.getDomainName());

		} catch (Exception e) {
			e.printStackTrace();
		}

		return osJson;
	}
}
