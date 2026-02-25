/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  name: "SparkPulseWidget",
  displayName: "Spark Pulse",
  deploymentTarget: "17.0",
  colors: {
    $widgetBackground: "#0F172A",
    $accent: "#F59E0B",
  },
  entitlements: {
    "com.apple.security.application-groups":
      config.ios.entitlements["com.apple.security.application-groups"],
  },
});
