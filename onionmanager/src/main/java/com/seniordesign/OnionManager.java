package com.seniordesign;

import java.util.Scanner;

public class OnionManager {

	public static void main(String[] args) {
		SpecManager mySpecs = new SpecManager();
		Scanner myObj = new Scanner(System.in);
		String input = "";
		
		System.out.println("Which Layer Would You Like To See: hardware, firmware, os, library, apps or all\nYou May Enter 'done' to end this");
		input = myObj.nextLine();
		while(!input.equals("done")) {
			if(input.equals("all")) {
				System.out.println(mySpecs.getQueries());
			}
			else {
				System.out.println(mySpecs.getSpecificQuery(input));
			}
			input = myObj.nextLine();
		}
		myObj.close();
	}
}
