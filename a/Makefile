# Variables
SRC_DIR = src
BIN_DIR = bin
LIB_DIR = lib
MAIN_CLASS = OnionManager

# Find all Java source files
SOURCES = $(wildcard $(SRC_DIR)/*.java)

# Create a colon-separated classpath for all JAR files in the lib directory
LIBS = $(wildcard $(LIB_DIR)/*.jar)
LIBS_CLASSPATH = $(shell echo $(LIBS) | tr ' ' ':')

# Classpath includes the bin directory and all JARs in the lib directory
CLASSPATH = $(BIN_DIR):$(LIBS_CLASSPATH)

# Default target: Compile the project
all:
	mkdir -p $(BIN_DIR)
	javac -cp "$(CLASSPATH)" -d $(BIN_DIR) $(SOURCES)

# Run the program
run: all
	java -cp "$(CLASSPATH)" $(MAIN_CLASS)

# Clean up compiled class files
clean:
	rm -rf $(BIN_DIR)

# Debug
debug:
	@echo $(CLASSPATH)

# Phony targets to avoid conflicts with files
.PHONY: all run clean debug