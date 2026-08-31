package com.seniordesign;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

public class SpecManager {
	private enum Layer{
		HardWare,
		FirmWare,
		OS,
		Library,
		Application
	};
	
	private String[] layerData;
	
	LayerRequirements HardWare = new HWSpec();
	LayerRequirements FirmWare = new FWSpec();
	LayerRequirements OS = new OSSpec();
	LayerRequirements Library = new Libs();
	LayerRequirements Applications = new Apps();
	
	public String getQueries() {
		return getSystemConfig();
	}
	
	public String getSystemConfig() {
		ObjectMapper mapper = new ObjectMapper();
		ObjectNode systemConfig = mapper.createObjectNode();
		addLayer(systemConfig, "hardware", HardWare.toQuery());
		addLayer(systemConfig, "firmware", FirmWare.toQuery());
		addLayer(systemConfig, "os", OS.toQuery());
		addLayer(systemConfig, "libraries", Library.toQuery());
		addLayer(systemConfig, "applications", Applications.toQuery());
		return systemConfig.toPrettyString();
	}
	
	private void addLayer(ObjectNode root, String key, String layerJson) {
		try {
			JsonNode layerNode = new ObjectMapper().readTree(layerJson);
			if (layerNode != null && layerNode.isObject() && layerNode.has(key)) {
				root.set(key, layerNode.get(key));
			} else {
				root.set(key, layerNode);
			}
		} catch (Exception e) {
			root.putObject(key).put("error", "Unable to parse layer data");
		}
	}
	
	public String getSpecificQuery(String layer) {
		if(layer.equalsIgnoreCase("hardware")) {
			return HardWare.toQuery();
		}
		else if(layer.equalsIgnoreCase("firmware")) {
			return FirmWare.toQuery();
		}
		else if(layer.equalsIgnoreCase("os")) {
			return OS.toQuery();
		}
		else if(layer.equalsIgnoreCase("library")) {
			return Library.toQuery();
		}
		else if(layer.equalsIgnoreCase("apps")) {
			return Applications.toQuery();
		}
		return "No layer of that name";
	}

}
