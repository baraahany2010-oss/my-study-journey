
// Supabase Project Configuration

const SUPABASE_URL =
    "https://gdcgdsmbgftnkgickogp.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_HXQyitoZHlTq69F5z0mq1A_6HwExobk";

// Owner account details
const OWNER_EMAIL = "baraahany2010@gmail.com";
const OWNER_USER_ID = "9b823d2c-7d4e-4117-bc6b-a5c449fcfa40";

// Initialize Supabase
const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

console.log("Supabase connected successfully!");
