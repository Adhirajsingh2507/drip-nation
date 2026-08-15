// ============================================================
// DRIP NATION — Supabase client
// The anon (publishable) key is PUBLIC by design: it ships to every browser
// and Row Level Security enforces access. Never put the service-role key here.
// Loaded on storefront pages BEFORE store-bridge.js, AFTER the supabase-js CDN.
// ============================================================

window.DN_CONFIG = {
  supabaseUrl: 'https://ukqcptrbsmdreelgdovl.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcWNwdHJic21kcmVlbGdkb3ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3OTQwODIsImV4cCI6MjEwMjM3MDA4Mn0.1I6P9HDwfbeoLa41DO4WwwWYoyYuj5T48tfFg5zJzfw',
  // Kill-switch: flip to false to fall back to the localStorage prototype path
  // (StoreBridge.ensureDefaults) if a Supabase deploy misbehaves.
  useSupabase: true,
  // Flip to true once the `checkout` Edge Function is deployed and Razorpay keys
  // are set. Until then the cart shows the "Coming Soon" modal.
  checkoutEnabled: false
};

window.dnSupabase = (window.supabase && window.DN_CONFIG.useSupabase)
  ? window.supabase.createClient(window.DN_CONFIG.supabaseUrl, window.DN_CONFIG.supabaseAnonKey)
  : null;

if (window.DN_CONFIG.useSupabase && !window.dnSupabase) {
  console.warn('[DripNation] supabase-js failed to load; StoreBridge will use the localStorage fallback.');
}
