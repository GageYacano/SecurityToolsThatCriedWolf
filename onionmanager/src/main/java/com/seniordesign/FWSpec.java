package com.seniordesign;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.Map;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

public class FWSpec implements LayerRequirements{
	public ObjectNode wrappedObject;

	public class FirmwareRecord {
		String component;
		String key, version;

		public FirmwareRecord() {}
		public FirmwareRecord(String component, String key, String version) {
			this.version = version;
			this.component = component;
			this.key = key;
		}
		public String getComponent() { return component; }
		public String getKey() { return key; }
		public String getVersion() { return version; }
	}

	// Stores the json info, will not be destroyed and will be used to check
	// For any new changes each time load data is called
	private ArrayList<FirmwareRecord> records = new ArrayList<>();

	public FWSpec() {
		ObjectMapper mapper = new ObjectMapper();
		wrappedObject = mapper.createObjectNode();

	}


	@SuppressWarnings("unchecked")
	public Process CollectFirmwareInfo() {
		try {
			ProcessBuilder pb = new ProcessBuilder("system_profiler",  "-json", "-detailLevel", "full",
				"SPSoftwareDataType",
				"SPiBootDataType",
				"SPiBridgeDataType",
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
				"SPEthernetDataType",
				"SPFibreChannelDataType",
				"SPNVMeDataType",
				"SPPCIDataType",
				"SPSASDataType",
				"SPSPIDataType",
				"SPSmartCardsDataType",
				"SPUSBHostDataType",
				"SPParallelATADataType"		
			);
			pb.redirectError(ProcessBuilder.Redirect.INHERIT);
			Process process = pb.start();
			return process;
		} catch (Exception e) {
			// Handle exception
			throw new IllegalStateException("Unable to collect FWSpec data", e);
		}
	}

	public boolean isFirmwarePath(String str) {
		str = str.toLowerCase();
		return (str.contains("firmware")
     			|| str.contains("loader")
				|| str.contains("rom")
			);
	}

	public void extractFirmware(JsonNode node, String currentDeviceName) {
        if (node.isObject()) {
            // First pass, find the actual name of the object
            String thisDeviceName = currentDeviceName;
            Iterator<Map.Entry<String, JsonNode>> nameSearch = node.fields();

            while (nameSearch.hasNext()) {
                Map.Entry<String, JsonNode> entry = nameSearch.next();
                String key = entry.getKey();
                JsonNode value = entry.getValue();

                // Look for name-related keys
                if (value.isValueNode() && (key.contains("rom") || key.contains("_name") || key.contains("minor") || key.contains("charger_name"))) {
                    // Prioritize specific name over generic
                    if (thisDeviceName == null || thisDeviceName.equals(currentDeviceName) || !key.equals("minor")) {
                        thisDeviceName = value.asText();
                    }
                }
            }

            // Check for firmware, recurse into children nodes
            Iterator<Map.Entry<String, JsonNode>> fields = node.fields();

            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> entry = fields.next();
                String key = entry.getKey();
                JsonNode value = entry.getValue();

                String nextDeviceName = thisDeviceName;

                // If we can't find a name, use the key
                if (value.isObject() && nextDeviceName == null) {
                    nextDeviceName = key;
                }

                // If the key is firmware
                if (isFirmwarePath(key) && value.isValueNode()) {
					FirmwareRecord record = new FirmwareRecord(thisDeviceName, key, value.asText());
					records.add(record);
					/*
					System.err.println("Device: " + thisDeviceName);
                    System.err.println("Firmware Key: " + key);
                    System.err.println("Firmware Version: " + value.asText());
                    System.err.println();
					*/
                }
                // Recurse using updated name
                extractFirmware(value, nextDeviceName);
            }
        }
        else if (node.isArray()) {
            for (JsonNode element : node) {
                extractFirmware(element, currentDeviceName);
            }
        }
    }

    // Gets all the data you will be needing. This is basically your main
    public void loadData() {

        records.clear();
        Process process = CollectFirmwareInfo();
        ObjectMapper mapper = new ObjectMapper();

        try {
            JsonNode root;
            try (var input = process.getInputStream()) {
                root = mapper.readTree(input);
            }
            if (process.waitFor() != 0 || root == null) {
                throw new IllegalStateException("Firmware command failed or returned no data");
            }
			wrappedObject.set("firmware", root);

			// Keep extracted records available without writing a separate file
			extractFirmware(root, null);
        } catch (Exception e) {
            throw new IllegalStateException("Unable to collect FWSpec data", e);
        }
    }

		// Does checks and then returns info
		public String toQuery() {
	        ObjectMapper mapper = new ObjectMapper();
			loadData();
			String data = "";

			try {
				data = mapper.writerWithDefaultPrettyPrinter().writeValueAsString(wrappedObject);
			} catch (JsonProcessingException e) {
				data = e.toString();
			}
			return data;
		}
	}
