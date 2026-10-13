const SUPABASE_URL = 'https://khzbiecodkdydvltzlsc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_4lXRKbtFMifFssAQiv8g2w_DzPgjRsv';

// Inicializar el cliente globalmente (usamos un fallback local por si falla el CDN, pero asumimos que carga bien)
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
