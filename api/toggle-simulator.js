// api/toggle-simulator.js
// Handles turning the simulator on and off
// Reads and updates the simulator_running key in the settings table

import "dotenv/config";
import { supabase } from "../src/models/supabase.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "simulator_running")
        .single();

      if (error) throw new Error(error.message);

      return res.status(200).json({ isRunning: data.value === "true" });
    }

    if (req.method === "POST") {
      const { running } = req.body;

      const { error } = await supabase
        .from("settings")
        .update({ value: String(running) })
        .eq("key", "simulator_running");

      if (error) throw new Error(error.message);

      return res.status(200).json({ isRunning: running });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}