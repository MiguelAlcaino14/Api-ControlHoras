import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from "@supabase/supabase-js";


console.log("URL detectada:", process.env.SUPABASE_URL); 

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);