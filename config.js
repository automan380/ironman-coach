// Public configuration for the COACH control-panel app. These two values are PUBLIC by design:
// the anon key only ever grants what Row-Level Security allows. The coach's broad access comes from
// signing in as the coach + the is_coach() policies (migration 0007) — NOT from any secret in here.
// The SECRET service-role key NEVER ships to this app; it lives only on the PC (coach bridge .env).
window.IRONMAN_CONFIG = {
  SUPABASE_URL: "https://biowfnuwktaquwynctms.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpb3dmbnV3a3RhcXV3eW5jdG1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MTAxNzMsImV4cCI6MjEwNzI4NjE3M30.TKtdAggBeOtflHvdGlP_VxI_Zp_stRIA2YFrvuq1xMU",
};
