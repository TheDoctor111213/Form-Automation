/* config.js — Supabase connection settings.
   The anon (public) key is safe to embed in client code by Supabase's design:
   it does nothing without a signed-in user, and Row-Level Security scopes every
   row to its owner. NEVER put the service_role key here. */
window.SUPABASE_URL = 'https://plgegtosqwehriqecaui.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsZ2VndG9zcXdlaHJpcWVjYXVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMjE0MjIsImV4cCI6MjA5OTU5NzQyMn0.sCPLdRCo3Birz8MkZ40_rNxm4ZJooTQI0W0SPwwjcHk';
