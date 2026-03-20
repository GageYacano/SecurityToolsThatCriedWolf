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
	LayerRequirements FirmWare = new OSSpec();
	LayerRequirements OS = new FWSpec();
	LayerRequirements Library = new Libs();
	LayerRequirements Applications = new Apps();
	
	public String getQueries() {
		return null;
	}
}
