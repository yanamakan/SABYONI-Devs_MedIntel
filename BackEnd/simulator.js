import "dotenv/config";
import { sendReadings } from "./src/services/simulatorService.js";

setInterval(sendReadings, 30000);

console.log("OCTAVIA simulator running — generating vitals for all patients...");