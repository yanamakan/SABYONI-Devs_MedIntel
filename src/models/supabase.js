// src/models/supabase.js
// Creates and exports the Supabase client
// Every model imports from here — one single connection

import { createClient } from "@supabase/supabase-js";
// Get the URL and service key from the env file 
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

//export the new created client 
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);