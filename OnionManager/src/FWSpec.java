

public class FWSpec implements LayerRequirements{
	
	// Stores the json info, will not be destroyed and will be used to check
	// For any new changes each time load data is called
	private String data = "";
	
	// Gets all the data you will be needing. This is basically your main
	public void loadData(){
		String myData = "";
		// Get data, blah blah blah
		
		
		if(checkDuplicate()){
			data = myData;
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
