const fs = require('fs');

let configFileName = process.env["CONFIG"];
if (!configFileName) configFileName = "config.json";
const config = JSON.parse(fs.readFileSync(configFileName));

if (!config) {
    console.log("could not read config file! Stopping...");
    process.exit(1);
}

module.exports = config;