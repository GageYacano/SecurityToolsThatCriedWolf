package com.seniordesign;

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
		String allLayersAsJson = "";
		allLayersAsJson += HardWare.toQuery() + "\n";
		allLayersAsJson += FirmWare.toQuery() + "\n";
		allLayersAsJson += OS.toQuery() + "\n";
		allLayersAsJson += Library.toQuery() + "\n";
		allLayersAsJson += Applications.toQuery() + "\n";
		return allLayersAsJson;
	}
}
