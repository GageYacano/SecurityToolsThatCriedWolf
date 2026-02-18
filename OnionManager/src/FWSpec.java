
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;



public class FWSpec implements LayerRequirements{
	
	// Stores the json info, will not be destroyed and will be used to check
	// For any new changes each time load data is called
	private String data = "";
	public FWSpec() {
		this.loadData();	
		System.out.println("OSSpec Loaded");
	}
	static class FirmwareEntry {
			final String key;
			final String value;

        public FirmwareEntry(String key, String value) {
            this.key = key;
            this.value = value;
        }
	}
	// JSON Help
	private static String escapeJson(String str) {
		if (str == null) return null;
		return str.replace("\\", "\\\\")
				  .replace("\"", "\\\"")
				  .replace("\n", "\\n")
				  .replace("\r", "\\r")
				  .replace("\t", "\\t");	
	}

	// Convert to JSON format
	private static String toJson(Map<String, List<FirmwareEntry>> data) {
		StringBuilder json = new StringBuilder("{\n");

		json.append("{\n");

		int i = 0;
		for(var e : data.entrySet()) {
            json.append("  \"").append(escapeJson(e.getKey())).append("\": [\n");

			List<FirmwareEntry> entries = e.getValue();
			for(int j = 0; j < entries.size(); j++) {
				FirmwareEntry entry = entries.get(j);
                json.append("    {\"key\":\"").append(escapeJson(entry.key))
                .append("\",\"value\":\"").append(escapeJson(entry.value)).append("\"}");
                if (j < entries.size() - 1) json.append(",");
                json.append("\n");		
			}

			json.append("  ]");
			if (i < data.size() - 1) json.append(",");
			json.append("\n");
			i++;
		}	
		json.append("}\n");
		return json.toString();
	}

	private static void writeJsonFile(String filename, String json) throws IOException {
        Files.writeString(Paths.get(filename), json, StandardCharsets.UTF_8);
    }
@SuppressWarnings("unchecked")
	private static Map<String, Object> buildTree(Map<String, List<FirmwareEntry>> input) {
    	Map<String, Object> root = new LinkedHashMap<>();

    	for (var entry : input.entrySet()) {
        	String[] parts = entry.getKey().split(" > ");
        	Map<String, Object> cur = root;

        	// Walk/create nodes for every path part
        	for (String rawPart : parts) {
            	String part = rawPart.trim();
            	Object next = cur.get(part);

            	if (!(next instanceof Map)) {
                	next = new LinkedHashMap<String, Object>();
                	cur.put(part, next);
            	}
            	cur = (Map<String, Object>) next;
        	}

        	// Attach the firmware fields at this node under "_values"
        	Map<String, Object> values =
	            (Map<String, Object>) cur.computeIfAbsent("_values", k -> new LinkedHashMap<String, Object>());

        	for (FirmwareEntry fe : entry.getValue()) {
            	values.put(fe.key, fe.value);
        	}
    	}

    	return root;
	}

	public Process CollectFirmwareInfo() {
		try {
			ProcessBuilder pb = new ProcessBuilder("system_profiler", "-detailLevel", "mini",
			"SPSoftwareDataType",
			"SPHardwareDataType",
			"SPNetworkDataType",
			"SPStorageDataType",
			"SPDisplaysDataType",
			"SPAudioDataType",
			"SPBluetoothDataType",
			"SPPrintersDataType",
			"SPUSBDataType",
			"SPPowerDataType",
			"SPMemoryDataType",
			"SPSerialATADataType",
			"SPThunderboltDataType",
			"SPFireWireDataType",
			"SPCardReaderDataType",
			"SPCameraDataType",
			"SPDiscBurningDataType",
			"SPSoftwareUpdateDataType",
			"SPDiagnosticsDataType",
			"SPStorageDataType",
			"SPHardwareDataType",
			"SPNetworkDataType",
			"SPDisplaysDataType",
			"SPAudioDataType",
			"SPPowerDataType",
			"SPSerialATADataType",
			"SPFireWireDataType",
			"SPCameraDataType"
			);
			Process process = pb.start();
			return process;
		} catch (Exception e) {
			// Handle exception
			e.printStackTrace();
			return null;
		}
	}
	// Gets all the data you will be needing. This is basically your main
    @Override
	public void loadData() {
		Map<String, List<FirmwareEntry>> dataMap = new java.util.LinkedHashMap<>();

		Process process = CollectFirmwareInfo();
		if (process == null) {
			System.out.println("Failed to collect firmware info.");
			return;
		}

		try(BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
			String line;
			Deque<Map.Entry<Integer, String>> stack = new ArrayDeque<>();
			
			while((line = reader.readLine()) != null) {
				if (line.isBlank()) continue;

				// indentation level
				int indent = 0;
				while(indent < line.length() && Character.isWhitespace(line.charAt(indent))) indent++;

				String trimmed = line.trim();

				// prevents cases like Name: MacBook, we want Power: \n
				boolean isHeader = trimmed.endsWith(":") && !trimmed.contains(": ");

				if(isHeader) {
					while(!stack.isEmpty() && stack.peek().getKey() >= indent) stack.pop();
					stack.push(Map.entry(indent, trimmed.substring(0, trimmed.length() - 1)));
					continue;
				}

				boolean isFirmwareEntry = 
					trimmed.contains("Firmware Version:") ||
					trimmed.contains("System Firmware Version:");
				
				if(isFirmwareEntry) {
					// Build out the path to append into json
					List<Map.Entry<Integer, String>> path = new ArrayList<>(stack);
					Collections.reverse(path);

					StringBuilder section = new StringBuilder();

					for(int i = 0; i < path.size(); i++) {
						if(i > 0) section.append(" > ");
						section.append(path.get(i).getValue());
					}
					// Spot out section, otherwise mark as unknown
					String sectionKey = section.length() == 0 ? "Unknown Section" : section.toString();

					// Split key: value
					String[] parts = trimmed.split(":", 2);
					String key = parts[0].trim();
					String value = parts.length > 1 ? parts[1].trim() : "";

					// add into LHM
					dataMap.computeIfAbsent(sectionKey, k -> new ArrayList<>())
						.add(new FirmwareEntry(key, value));
				}
			}

			// Serialize to JSON and write to file
			String json = toJson(dataMap);
			System.out.println(json);
			try {
				writeJsonFile("firmware_info.json", json);
			} catch (IOException e) {
				System.getLogger(FWSpec.class.getName()).log(System.Logger.Level.ERROR, "Failed to write JSON file", e);
			}
			this.data = json;
		}   
		catch (IOException ex) {
        	System.getLogger(FWSpec.class.getName()).log(System.Logger.Level.ERROR, (String) null, ex);
    	}
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
}