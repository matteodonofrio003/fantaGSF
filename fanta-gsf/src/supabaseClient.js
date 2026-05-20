import { createClient } from '@supabase/supabase-js'

console.log("TUTTE LE VARIABILI VITE:", import.meta.env)
console.log("IL MIO URL È:", import.meta.env.VITE_SUPABASE_URL)

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)