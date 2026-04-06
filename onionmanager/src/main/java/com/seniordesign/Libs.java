package com.seniordesign;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

public class Libs implements LayerRequirements{
    public Libs() {
        loadData();
    }
    // Stores the json info, will not be destroyed and will be used to check
    // For any new changes each time load data is called
    private String data = "";
    
    // Gets all the data you will be needing. This is basically your main
    public void loadData(){
        String os = System.getProperty("os.name");
        ObjectMapper mapper = new ObjectMapper();
        ArrayNode libs = mapper.createArrayNode();
        
        if(os.toLowerCase().contains("windows")) {
            String command = "winget export -o packages.json"; 
            ProcessBuilder builder = new ProcessBuilder("cmd.exe", "/c", command);
            
            Process process;
            try {
                process = builder.start();
            
                BufferedReader reader = new BufferedReader(
                        new InputStreamReader(process.getInputStream()));
    
                String line;
                while ((line = reader.readLine()) != null) {
                    System.out.println(line);
                }
    
                int exitCode = process.waitFor();
                System.out.println("Exited with code: " + exitCode);
            } 
            catch (IOException | InterruptedException e) {
                e.printStackTrace();
            }
        }
                else if(os.toLowerCase().contains("mac")){
            ProcessBuilder builder = new ProcessBuilder("brew", "list", "--versions");
            Process process;
            try {
                process = builder.start();
            
                BufferedReader reader = new BufferedReader(
                        new InputStreamReader(process.getInputStream()));
    
                String line;
                while ((line = reader.readLine()) != null) {
                    ObjectNode libTemp = mapper.createObjectNode();
                    String[] splitString = line.split(" ");
                    libTemp.put("name", splitString[0]);
                    libTemp.put("version:", splitString[1]);
                    libs.add(libTemp);
                }
    
                int exitCode = process.waitFor();
                System.out.println("Exited with code: " + exitCode);
            } 
            catch (IOException | InterruptedException e) {
                e.printStackTrace();
            }
        }
        
        else if(os.toLowerCase().contains("linux")) {
            
        }
        ObjectNode root = mapper.createObjectNode();
        root.set("libraries", libs);
        
        try {
            data = mapper.writerWithDefaultPrettyPrinter().writeValueAsString(root);
        } catch (JsonProcessingException ex) {
            System.getLogger(Libs.class.getName()).log(System.Logger.Level.ERROR, (String) null, ex);
        }
        System.out.println(data);
    }
    
    public boolean checkDuplicate() {
        // if data == ""             --> return true
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