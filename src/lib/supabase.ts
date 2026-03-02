import { createClient } from "@supabase/supabase-js";
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://mymfalygccxyzjdomuwr.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15bWZhbHlnY2N4eXpqZG9tdXdyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTg3MzMxMSwiZXhwIjoyMDg3NDQ5MzExfQ.m62bupgvwhey88-3RUN3vpNpvW1t9LHHHhK-2W1vpUI';

export const supabase = createClient(supabaseUrl, supabaseKey);