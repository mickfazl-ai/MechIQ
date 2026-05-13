// ─────────────────────────────────────────────────────────────
// App.js changes needed for QR scan + Label Designer
//
// This is a PATCH file — copy the relevant sections into your
// existing App.js. Do not replace the whole file.
// ─────────────────────────────────────────────────────────────

// ── 1. New imports at the top of App.js ──────────────────────
import ScanPage      from './ScanPage';
import LabelDesigner from './LabelDesigner';

// ── 2. In your App() function, detect the /scan/ route BEFORE
//       the auth check so it works without login.
//
//    Add this block near the TOP of App(), before any
//    "if (!session)" / login redirect logic:
// ─────────────────────────────────────────────────────────────

// Public route — no auth needed
const pathname = window.location.pathname;
const scanMatch = pathname.match(/^\/scan\/([a-f0-9-]{36})$/);
if (scanMatch) {
  return <ScanPage assetId={scanMatch[1]} />;
}
const partScanMatch = pathname.match(/^\/scan\/part\/([a-f0-9-]{36})$/);
if (partScanMatch) {
  return <ScanPage partId={partScanMatch[1]} />;
}

// ── 3. Handle browser back/forward for scan URLs
//    Add this useEffect in App() (or in index.js):
// ─────────────────────────────────────────────────────────────
useEffect(() => {
  // Redirect /scan/* to the React app on Vercel
  // No changes needed here — Vercel serves index.html for all routes
  // as long as you add this to vercel.json:
}, []);

// ── 4. Add Label Designer to Navbar nav items ────────────────
//    In Navbar.js, add 'Label Designer' as a menu item for
//    roles: 'master_admin' and 'admin'
//
//    Example addition to your navItems array:
//    { label: 'Label Designer', icon: '🏷', roles: ['master_admin', 'admin'] }
//
//    Then in the page routing switch/if block in App.js:
// ─────────────────────────────────────────────────────────────
if (page === 'Label Designer') {
  return (
    <LabelDesigner
      userRole={userRole}
      companyId={session?.user?.user_metadata?.company_id || companyId}
    />
  );
}

// ── 5. vercel.json — add this file to your repo root ─────────
// This ensures /scan/[uuid] routes load the React app (SPA routing)
// Create file: vercel.json in C:\Users\mickf\Documents\mechiq\
// ─────────────────────────────────────────────────────────────
/*
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
*/

// ── 6. Company branding in Settings.js ───────────────────────
//    In the company admin's Settings page, add a Branding section:
//    - Logo upload (to Supabase storage → company-assets bucket)
//    - Primary colour picker
//    - Secondary colour picker
//    These values are read by ScanPage.js when technicians scan QR codes.
//
//    Branding save example:
// ─────────────────────────────────────────────────────────────
const saveBranding = async ({ logoUrl, primaryColor, secondaryColor, companyId }) => {
  await supabase.from('company_branding').upsert({
    company_id:      companyId,
    logo_url:        logoUrl,
    primary_color:   primaryColor,
    secondary_color: secondaryColor,
    updated_at:      new Date().toISOString(),
  }, { onConflict: 'company_id' });
};

// ── 7. Supabase storage upload helper (for logo) ─────────────
const uploadLogo = async (file, companyId) => {
  const ext  = file.name.split('.').pop();
  const path = `logos/${companyId}.${ext}`;
  const { error } = await supabase.storage
    .from('company-assets')
    .upload(path, file, { upsert:true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from('company-assets').getPublicUrl(path);
  return data.publicUrl;
};
