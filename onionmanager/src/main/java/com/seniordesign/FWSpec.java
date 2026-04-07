package com.seniordesign;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.Map;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;

	public class FWSpec implements LayerRequirements{
		public JsonNode wrappedObject;
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
			this.loadData();	
			System.out.println("FWSpec Loaded");
		}

		private static void writeJsonFile(String filename, ArrayList<FirmwareRecord> object) throws IOException {
			ObjectMapper mapper = new ObjectMapper();
			mapper.enable(SerializationFeature.INDENT_OUTPUT);

			String json = String.format("{\n\"firmware\" : { %s \n}", mapper.writeValueAsString(object));
			System.out.println(json);
			Files.writeString(Paths.get(String.format("%s%s", filename, ".json")), json, StandardCharsets.UTF_8);
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
				Process process = pb.start();
				return process;
			} catch (Exception e) {
				// Handle exception
				e.printStackTrace();
				return null;
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

            // First pass, find the actual name of the objectz
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
					System.out.println("Device: " + thisDeviceName);
                    System.out.println("Firmware Key: " + key);
                    System.out.println("Firmware Version: " + value.asText());
                    System.out.println();
					*/

                }

                // Recurse using updated name
                extractFirmware(value, nextDeviceName);
            }

        } else if (node.isArray()) {

            for (JsonNode element : node) {
                extractFirmware(element, currentDeviceName);
            }
        }
    }

    // Gets all the data you will be needing. This is basically your main
    @Override
    public void loadData() {

        Process process = CollectFirmwareInfo();
        ObjectMapper mapper = new ObjectMapper();

        try {
            process.waitFor();
            JsonNode root = mapper.readTree(process.getInputStream());
			
			this.wrappedObject = root;
            extractFirmware(root, null);

			writeJsonFile("firmware", records);
        } catch (Exception e) {
            e.printStackTrace();
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
			return "";
		}
	}
