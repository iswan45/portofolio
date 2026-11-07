// Supabase connection used by index.html and admin.html.
// The publishable key is safe to expose in the browser: database rules (RLS)
// allow everyone to read, and only the admin account to change content.
window.PORTFOLIO_CONFIG = {
  supabaseUrl: "https://nwigoebuydgqatcbnkic.supabase.co",
  supabaseKey: "sb_publishable_F_wLAwAM39oXtGpN0T4FwA_PcqCtVLM",
  imageBucket: "portfolio-images"
};
