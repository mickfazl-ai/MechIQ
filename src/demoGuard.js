// src/demoGuard.js
// Utility for demo mode — blocks write actions and shows tooltip

export const DEMO_COMPANY_ID = 'demo-company-0000-0000-000000000001';
export const DEMO_EMAIL = 'demo@mechiq.com.au';

export const isDemo = (userRole) =>
  userRole?.company_id === DEMO_COMPANY_ID ||
  userRole?.email === DEMO_EMAIL;

// Wrap onClick handlers — shows alert and blocks action in demo mode
export const demoBlock = (userRole, fn) => {
  if (isDemo(userRole)) {
    return (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      showDemoAlert();
    };
  }
  return fn;
};

export const showDemoAlert = () => {
  // Create a nice toast-style alert
  const existing = document.getElementById('demo-alert');
  if (existing) { existing.remove(); }

  const el = document.createElement('div');
  el.id = 'demo-alert';
  el.innerHTML = `
    <div style="
      position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
      background:#0ea5e9; color:#fff; padding:12px 24px; border-radius:12px;
      font-size:13px; font-weight:700; z-index:9999;
      box-shadow:0 8px 32px rgba(14,165,233,0.4);
      display:flex; align-items:center; gap:10px;
      animation: demoIn 0.3s cubic-bezier(0.16,1,0.3,1);
      font-family: system-ui, sans-serif;
      white-space: nowrap;
    ">
      <span style="font-size:16px">🎯</span>
      Demo mode — this action is disabled
      <a href="mailto:info@mechiq.com.au?subject=MechIQ Demo Enquiry"
        style="color:#fff;text-decoration:underline;margin-left:4px">Get started →</a>
    </div>
  `;

  if (!document.getElementById('demo-alert-css')) {
    const style = document.createElement('style');
    style.id = 'demo-alert-css';
    style.textContent = '@keyframes demoIn { from{opacity:0;transform:translateX(-50%) translateY(12px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }';
    document.head.appendChild(style);
  }

  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
};

// HOC-style wrapper for buttons
export function DemoButton({ isDemo: demo, children, onClick, style, className, disabled, ...rest }) {
  const handleClick = (e) => {
    if (demo) { e.preventDefault(); e.stopPropagation(); showDemoAlert(); return; }
    onClick?.(e);
  };
  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={className}
      style={{ ...style, ...(demo ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}
      title={demo ? '🎯 Demo mode — sign up to use this feature' : undefined}
      {...rest}
    >
      {children}
    </button>
  );
}
