// api/add-reading.js
// Handles inserting a new device reading into the device_readings table
// Called by the simulator for each device reading

import "dotenv/config";
import { supabase } from "../src/models/supabase.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { device_id, value } = req.body;

    if (!device_id || value === undefined) {
      return res.status(400).json({ error: "device_id and value are required" });
    }

    const { error } = await supabase
      .from("device_readings")
      .insert({ device_id, value });

    if (error) throw new Error(error.message);

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}