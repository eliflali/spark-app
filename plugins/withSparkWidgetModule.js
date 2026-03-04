const { withXcodeProject } = require('@expo/config-plugins');

module.exports = function withSparkWidgetModule(config) {
    return withXcodeProject(config, async (config) => {
        const xcodeProject = config.modResults;

        // The files we want to add to the main app target
        const sourceFiles = [
            'SparkWidgetModule.h',
            'SparkWidgetModule.m',
            'WidgetDataBridge.swift'
        ];

        sourceFiles.forEach(file => {
            // Check if file is already added to prevent duplicates
            if (!xcodeProject.hasFile(file)) {
                // Add file to the project (in the root group)
                xcodeProject.addSourceFile(file, null, xcodeProject.getFirstTarget().uuid);
            }
        });

        return config;
    });
};
