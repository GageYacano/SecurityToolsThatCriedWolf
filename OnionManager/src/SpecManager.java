
public class SpecManager {
	private enum Layer{
		HardWare,
		FirmWare,
		OS,
		Library,
		Applicaiton
	};
	
	private String[] layerData;
	
	LayerRequirements HardWare = new HWSpec();
	LayerRequirements FirmWare = new FWSpec();
	LayerRequirements OS = new OSSpec();
	LayerRequirements Library = new Libs();
	LayerRequirements Applications = new Apps();
	
	public String getQueries() {
		return null;
	}
}
