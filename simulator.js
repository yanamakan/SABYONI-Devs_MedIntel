// simulator.js
// Entry point for the simulator
// Loads environment variables and starts the interval loop
// ALL simulator logic lives in src/services/simulatorService.js

import "dotenv/config";
import { sendReadings } from "./src/services/simulatorService.js";

// Send vitals for every patient every 30 seconds
setInterval(sendReadings, 30000);

console.log("Sentinel simulator running — generating vitals for all patients...");