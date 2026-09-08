package com.seniordesign;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.io.File;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

public class Libs implements LayerRequirements{
    private static String resolveBrew() throws IOException {
        // Honor custom installations on PATH, then check standard macOS locations.
        String searchPath = System.getenv("PATH");
        if (searchPath != null) {
            for (String directory : searchPath.split(File.pathSeparator)) {
                if (directory.isBlank()) continue;
                Path candidate = Path.of(directory, "brew");
                if (Files.isRegularFile(candidate) && Files.isExecutable(candidate)) {
                    return candidate.toAbsolutePath().toString();
                }
            }
        }
        for (String location : new String[]{"/opt/homebrew/bin/brew", "/usr/local/bin/brew"}) {
            if (Files.isRegularFile(Path.of(location)) && Files.isExecutable(Path.of(location))) {
                return location;
            }
        }
        throw new IOException("Homebrew was not found. Install Homebrew to collect library data.");
    }
    // Stores the json info, will not be destroyed and will be used to check
    // For any new changes each time load data is called
    private String data = "";
    
    // Gets all the data you will be needing. This is basically your main
    public void loadData(){
        String os = System.getProperty("os.name");
        ObjectMapper mapper = new ObjectMapper();
        ArrayNode libs = mapper.createArrayNode();
        String libraryError = null;
        
        if(os.toLowerCase(java.util.Locale.ROOT).contains("mac")){
            Process process;
            try {
                ProcessBuilder builder = new ProcessBuilder(resolveBrew(), "list", "--versions");
                builder.redirectError(ProcessBuilder.Redirect.INHERIT);
                process = builder.start();
            
                BufferedReader reader = new BufferedReader(
                        new InputStreamReader(process.getInputStream()));
    
                String line;
                while ((line = reader.readLine()) != null) {
                    ObjectNode libTemp = mapper.createObjectNode();
                    String[] splitString = line.split(" ");
                    if (splitString.length >= 2) {
                        libTemp.put("name", splitString[0]);
                        libTemp.put("version", splitString[1]);
                        libs.add(libTemp);
                    }
                }
    
                int exitCode = process.waitFor();
                System.err.println("Exited with code: " + exitCode);
                if (exitCode != 0) {
                    libraryError = "Homebrew library collection failed (exit code " + exitCode + ").";
                }
            } 
            catch (IOException | InterruptedException e) {
                e.printStackTrace();
                libraryError = "Unable to collect Homebrew libraries: " + e.getMessage();
                if (e instanceof InterruptedException) Thread.currentThread().interrupt();
            }
        }
        
        else {
            libraryError = "Library collection is not supported on this operating system yet.";
        }
        ObjectNode root = mapper.createObjectNode();
        if (libraryError != null) {
            root.putObject("libraries").put("error", libraryError);
        } else {
            root.set("libraries", libs);
        }
        
        try {
            data = mapper.writerWithDefaultPrettyPrinter().writeValueAsString(root);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Unable to serialize library data", ex);
        }
    }

    // Does checks and then returns info
    public String toQuery() {
        loadData();
        return data;
    }
}
