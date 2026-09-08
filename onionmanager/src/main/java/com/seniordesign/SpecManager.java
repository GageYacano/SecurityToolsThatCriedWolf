package com.seniordesign;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.Locale;
import java.util.function.Supplier;

public class SpecManager {
    private final ObjectMapper mapper = new ObjectMapper();

    public ObjectNode collect() {
        ObjectNode config = mapper.createObjectNode();
        addLayer(config, "hardware", HWSpec::new);
        addLayer(config, "os", OSSpec::new);
        String os = System.getProperty("os.name").toLowerCase(Locale.ROOT);
        if (os.contains("mac")) {
            addLayer(config, "firmware", FWSpec::new);
            addLayer(config, "libraries", Libs::new);
            addLayer(config, "applications", Apps::new);
        } else {
            for (String layer : new String[]{"firmware", "libraries", "applications"}) {
                config.putObject(layer).put("error", "Collection is not supported on this operating system yet.");
            }
        }
        return config;
    }

    private void addLayer(ObjectNode config, String key, Supplier<LayerRequirements> factory) {
        try {
            JsonNode result = mapper.readTree(factory.get().toQuery());
            if (result == null || !result.isObject() || !result.hasNonNull(key)) {
                throw new IllegalStateException("Collector returned invalid data");
            }
            config.set(key, result.get(key));
        } catch (Exception e) {
            e.printStackTrace(System.err);
            config.putObject(key).put("error", "Unable to collect " + key + ": " + e.getMessage());
        }
    }

    public String getQueries() { return getSystemConfig(); }
    public String getSystemConfig() { return collect().toPrettyString(); }

    public String getSpecificQuery(String layer) {
        String key = layer.toLowerCase(Locale.ROOT);
        if (key.equals("library")) key = "libraries";
        if (key.equals("apps")) key = "applications";
        JsonNode value = collect().get(key);
        if (value == null) return "No layer of that name";
        ObjectNode wrapped = mapper.createObjectNode();
        wrapped.set(key, value);
        return wrapped.toPrettyString();
    }
}
