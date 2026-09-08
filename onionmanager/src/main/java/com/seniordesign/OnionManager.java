package com.seniordesign;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.nio.channels.FileChannel;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.time.Instant;

public class OnionManager {
    public static void main(String[] args) {
        try {
            if (args.length == 0) {
                System.out.println(new SpecManager().getQueries());
                return;
            }
            if (args.length != 2 || !args[0].equals("--output") || args[1].isBlank()) {
                throw new IllegalArgumentException("Usage: java -jar OnionManager.jar [--output <path>]");
            }
            System.exit(saveSnapshot(Path.of(args[1])));
        } catch (Exception e) {
            e.printStackTrace(System.err);
            System.exit(1);
        }
    }

    private static int saveSnapshot(Path requestedOutput) throws Exception {
        Path absolute = requestedOutput.toAbsolutePath().normalize();
        Files.createDirectories(absolute.getParent());
        // Resolve directory aliases so invocations share the same lock.
        Path output = absolute.getParent().toRealPath().resolve(absolute.getFileName());
        Path lockPath = output.resolveSibling(output.getFileName() + ".lock");
        try (FileChannel channel = FileChannel.open(lockPath, StandardOpenOption.CREATE, StandardOpenOption.WRITE);
             var lock = channel.tryLock()) {
            if (lock == null) {
                System.err.println("Configuration collection is already running.");
                return 2;
            }
            ObjectNode config = new SpecManager().collect();
            boolean anySuccess = false;
            for (var values = config.elements(); values.hasNext();) {
                var value = values.next();
                if (!value.has("error")) anySuccess = true;
            }
            if (!anySuccess) throw new IllegalStateException("All configuration layers failed; previous snapshot preserved.");

            ObjectMapper mapper = new ObjectMapper();
            ObjectNode snapshot = mapper.createObjectNode();
            snapshot.put("schemaVersion", 1);
            snapshot.put("collectedAt", Instant.now().toString());
            snapshot.set("config", config);
            Path temporary = Files.createTempFile(output.getParent(), "latest-config-", ".tmp");
            try {
                mapper.writerWithDefaultPrettyPrinter().writeValue(temporary.toFile(), snapshot);
                Files.move(temporary, output, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
            } finally {
                Files.deleteIfExists(temporary);
            }
            return 0;
        }
    }
}
