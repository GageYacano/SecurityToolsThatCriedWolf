package com.seniordesign;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.IOException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

public class Apps implements LayerRequirements {
	// Default constructor that loads initial data.
	Apps(){
		loadData();	
		System.out.println("Apps Loaded");
	}

	// Stores the json info, will not be destroyed and will be used to check
	// For any new changes each time load data is called
	private String data = "";

	// Gets all the data you will be needing. This is basically your main
	public void loadData(){
		StringBuilder myData = new StringBuilder();
		ObjectMapper mapper = new ObjectMapper();

		try {
			ProcessBuilder pb = new ProcessBuilder(
				"system_profiler",
				"SPApplicationsDataType",
				"-detailLevel",
				"mini",
				"-json"
			);
			pb.redirectErrorStream(true);
			Process process = pb.start();

			try (BufferedReader reader = new BufferedReader(
					new InputStreamReader(process.getInputStream()))) {
				String line;
				while ((line = reader.readLine()) != null) {
					myData.append(line).append("\n");
				}
			}
			process.waitFor();

			JsonNode root = mapper.readTree(myData.toString());
			JsonNode appList = root.path("SPApplicationsDataType");
			ArrayNode filteredApps = mapper.createArrayNode();
			
			if (appList.isArray()) {
				for (JsonNode app : appList) {
					ObjectNode appEntry = mapper.createObjectNode();
					appEntry.put("name", app.path("_name").asText());
					appEntry.put("version", app.path("version").asText());
					appEntry.put("path", app.path("path").asText());
					filteredApps.add(appEntry);
				}
			}

			ObjectNode result = mapper.createObjectNode();
			result.set("applications", filteredApps);

			this.data = mapper.writerWithDefaultPrettyPrinter().writeValueAsString(result);

		} catch (IOException | InterruptedException e) {
			e.printStackTrace();
		}
	}

	// Returns data
	public String toQuery() {
		loadData();
		return data;
	}
}
