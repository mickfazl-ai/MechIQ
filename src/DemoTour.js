import React, { useState, useEffect } from 'react';

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes fadeUp   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
  @keyframes pulse-glow { 0%,100%{box-shadow:0 0 0 0 rgba(14,165,233,0.4)} 50%{box-shadow:0 0 0 8px transparent} }
  @keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes shimmer-slide { 0%{background-position:-200% 0} 100%{background-position:200% 0} }

  .demo-overlay {
    position: fixed; inset: 0; z-index: 2000;
    background: rgba(0,0,0,0.75);
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    padding: 20px; animation: fadeIn 0.3s ease;
  }

  .demo-welcome {
    background: var(--surface); border-radius: 20px;
    width: 100%; max-width: 780px; max-height: 90vh;
    overflow-y: auto; padding: 40px;
    border: 1px solid var(--border);
    box-shadow: 0 32px 80px rgba(0,0,0,0.4);
    animation: fadeUp 0.4s cubic-bezier(0.16,1,0.3,1);
  }

  .demo-hero {
    text-align: center; margin-bottom: 36px;
  }
  .demo-logo {
    font-family: var(--font-display); font-size: 42px;
    font-weight: 900; letter-spacing: 2px; margin-bottom: 8px;
  }
  .demo-logo .iq { color: var(--accent); }
  .demo-tagline {
    font-size: 16px; color: var(--text-muted); font-weight: 500;
    margin-bottom: 20px;
  }
  .demo-badge {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 6px 16px; border-radius: 20px;
    background: var(--accent-light); color: var(--accent);
    font-size: 12px; font-weight: 700;
    border: 1px solid rgba(14,165,233,0.25);
  }

  .demo-features-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px; margin-bottom: 32px;
  }
  .demo-feature-card {
    background: var(--surface-2); border: 1px solid var(--border);
    border-radius: 12px; padding: 16px;
    cursor: pointer; transition: all 0.2s;
    display: flex; flex-direction: column; gap: 8px;
  }
  .demo-feature-card:hover {
    border-color: var(--accent); background: var(--accent-light);
    transform: translateY(-2px); box-shadow: 0 8px 24px rgba(14,165,233,0.15);
  }
  .demo-feature-icon { font-size: 28px; animation: float 3s ease infinite; }
  .demo-feature-name { font-size: 13px; font-weight: 700; color: var(--text-primary); }
  .demo-feature-desc { font-size: 12px; color: var(--text-muted); line-height: 1.5; }

  .demo-actions {
    display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;
  }
  .demo-btn-primary {
    padding: 13px 32px; background: var(--accent); color: #fff;
    border: none; border-radius: 10px; font-size: 14px; font-weight: 700;
    cursor: pointer; transition: all 0.15s; font-family: inherit;
    display: flex; align-items: center; gap: 8px;
    animation: pulse-glow 2s infinite;
  }
  .demo-btn-primary:hover { background: var(--accent-dark); transform: translateY(-1px); }
  .demo-btn-ghost {
    padding: 13px 24px; background: var(--surface-2); color: var(--text-secondary);
    border: 1px solid var(--border); border-radius: 10px; font-size: 14px;
    font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: inherit;
  }
  .demo-btn-ghost:hover { border-color: var(--accent); color: var(--accent); }

  /* ── Tour tooltip ── */
  .tour-overlay {
    position: fixed; inset: 0; z-index: 3000; pointer-events: none;
  }
  .tour-backdrop {
    position: absolute; inset: 0;
    background: rgba(0,0,0,0.6);
    pointer-events: all;
  }
  .tour-tooltip {
    position: fixed; z-index: 3001;
    background: var(--surface); border-radius: 14px;
    padding: 22px 24px; width: 320px;
    border: 1px solid var(--border);
    box-shadow: 0 16px 48px rgba(0,0,0,0.3);
    animation: fadeUp 0.25s cubic-bezier(0.16,1,0.3,1);
    pointer-events: all;
  }
  .tour-step-badge {
    font-size: 10px; font-weight: 700; color: var(--accent);
    background: var(--accent-light); padding: 3px 8px;
    border-radius: 20px; border: 1px solid rgba(14,165,233,0.25);
    display: inline-block; margin-bottom: 10px; letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .tour-title { font-size: 16px; font-weight: 800; color: var(--text-primary); margin-bottom: 8px; }
  .tour-desc  { font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 16px; }
  .tour-nav   { display: flex; align-items: center; gap: 8px; }
  .tour-dots  { display: flex; gap: 5px; flex: 1; }
  .tour-dot   { width: 6px; height: 6px; border-radius: 50%; background: var(--border); transition: all 0.2s; }
  .tour-dot.active { background: var(--accent); width: 18px; border-radius: 3px; }
  .tour-btn-next {
    padding: 8px 18px; background: var(--accent); color: #fff;
    border: none; border-radius: 8px; font-size: 13px; font-weight: 700;
    cursor: pointer; font-family: inherit; transition: all 0.15s;
  }
  .tour-btn-next:hover { background: var(--accent-dark); }
  .tour-btn-skip {
    padding: 8px 12px; background: none; color: var(--text-muted);
    border: none; font-size: 12px; cursor: pointer; font-family: inherit;
  }
  .tour-btn-skip:hover { color: var(--text-secondary); }
  .tour-highlight {
    position: fixed; z-index: 2999;
    border-radius: 10px; pointer-events: none;
    box-shadow: 0 0 0 4px var(--accent), 0 0 0 8px rgba(14,165,233,0.2);
    animation: pulse-glow 1.5s infinite;
    transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
  }

  .demo-contact-strip {
    margin-top: 24px; padding: 16px; background: var(--surface-2);
    border: 1px solid var(--border); border-radius: 10px;
    text-align: center; font-size: 13px; color: var(--text-muted);
  }
  .demo-contact-strip a { color: var(--accent); font-weight: 700; text-decoration: none; }
  .demo-contact-strip a:hover { text-decoration: underline; }
`;

// ─── Tour steps ───────────────────────────────────────────────────────────────
const TOUR_STEPS = [
  {
    id: 'dashboard',
    title: '📊 Dashboard',
    desc: 'Your fleet at a glance — current breakdowns, overdue services, priority work orders and service intervals all in one view. Everything updates in real time.',
    nav: 'dashboard',
    selector: '.main-content',
    position: 'center',
  },
  {
    id: 'assets',
    title: '🚛 Assets & Quick Log',
    desc: 'Every machine in your fleet. Tap "🔴 Log Down" on any asset to instantly record a breakdown — it prompts for a reason and logs the time automatically.',
    nav: 'assets',
    subNav: 'units',
    selector: '.main-content',
    position: 'center',
  },
  {
    id: 'maintenance',
    title: '🔧 Maintenance & Calendar',
    desc: 'Scheduled services, work orders and a monthly calendar showing everything due. Use AI to generate service schedules for any machine type in seconds.',
    nav: 'maintenance',
    subNav: 'calendar',
    selector: '.main-content',
    position: 'center',
  },
  {
    id: 'forms',
    title: '📋 Forms & AI Generator',
    desc: 'Prestart checklists and service sheets. Describe any machine and AI generates a complete checklist instantly — then technicians fill them out on their phone.',
    nav: 'forms',
    subNav: 'prestarts',
    selector: '.main-content',
    position: 'center',
  },
  {
    id: 'parts',
    title: '🔩 Parts Inventory',
    desc: 'Track every part in stock with low-stock alerts. Import your existing parts list from Excel, PDF or a photo using AI. Auto-generates a reorder list.',
    nav: 'parts',
    selector: '.main-content',
    position: 'center',
  },
  {
    id: 'depreciation',
    title: '💰 Depreciation Calculator',
    desc: 'AI looks up real Australian market prices for your machine on Machines4U, IronPlanet and Ritchie Bros — tells you if you overpaid and what it\'s worth today.',
    nav: 'assets',
    subNav: 'depreciation',
    selector: '.main-content',
    position: 'center',
  },
  {
    id: 'reports',
    title: '📈 Reports',
    desc: 'Downtime analysis, machine availability and export to PDF or Excel. See which assets are costing the most downtime hours across your fleet.',
    nav: 'reports',
    subNav: 'downtime-log',
    selector: '.main-content',
    position: 'center',
  },
];

// ─── Feature cards for welcome screen ────────────────────────────────────────
const FEATURES = [
  { icon: '📊', name: 'Live Dashboard',       desc: 'Fleet health at a glance — breakdowns, overdue services, priority jobs' },
  { icon: '🚛', name: 'Asset Management',     desc: 'Full fleet register with quick log — mark machines down in one tap' },
  { icon: '🔧', name: 'Maintenance Calendar', desc: 'Service schedules with AI-generated intervals by hours or kilometres' },
  { icon: '📋', name: 'AI Form Builder',      desc: 'Generate prestart checklists for any machine with one sentence' },
  { icon: '🔩', name: 'Parts Inventory',      desc: 'Stock tracking, low-stock alerts and AI import from Excel or photo' },
  { icon: '💰', name: 'Depreciation AI',      desc: 'Real market value from live auction data — know if you overpaid' },
  { icon: '📈', name: 'Reports & Export',     desc: 'Downtime analysis, availability charts, PDF and Excel export' },
  { icon: '💬', name: 'Team Messaging',       desc: 'Direct messages and group chats with photo and file sharing' },
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function DemoTour({ onNavigate, onClose }) {
  const [screen, setScreen] = useState('welcome'); // 'welcome' | 'tour' | null
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!document.getElementById('demo-tour-css')) {
      const s = document.createElement('style'); s.id = 'demo-tour-css'; s.textContent = CSS;
      document.head.appendChild(s);
    }
  }, []);

  const startTour = () => {
    setScreen('tour');
    setStep(0);
    const s = TOUR_STEPS[0];
    if (s.nav) onNavigate(s.nav, s.subNav || null);
  };

  const next = () => {
    if (step < TOUR_STEPS.length - 1) {
      const nextStep = step + 1;
      setStep(nextStep);
      const s = TOUR_STEPS[nextStep];
      if (s.nav) onNavigate(s.nav, s.subNav || null);
    } else {
      // Tour complete
      setScreen(null);
      onClose();
    }
  };

  const skip = () => { setScreen(null); onClose(); };

  if (!screen) return null;

  // ── Welcome screen ──
  if (screen === 'welcome') {
    return (
      <div className="demo-overlay" onClick={e => e.target === e.currentTarget && skip()}>
        <div className="demo-welcome">
          {/* Hero */}
          <div className="demo-hero">
            <div className="demo-logo">MECH<span className="iq">IQ</span></div>
            <div className="demo-tagline">Fleet Maintenance Management — Built for Australian Industry</div>
            <div className="demo-badge">
              <span>🎯</span> You're exploring the interactive demo
            </div>
          </div>

          {/* Features grid */}
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>What MechIQ does</div>
          <div className="demo-features-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="demo-feature-card" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="demo-feature-icon" style={{ animationDelay: `${i * 0.3}s` }}>{f.icon}</div>
                <div className="demo-feature-name">{f.name}</div>
                <div className="demo-feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>

          {/* Stats strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 28 }}>
            {[['8', 'Demo Assets'], ['14', 'Service Schedules'], ['5', 'Work Orders']].map(([val, label]) => (
              <div key={label} style={{ textAlign: 'center', padding: '14px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>{val}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="demo-actions">
            <button className="demo-btn-primary" onClick={startTour}>
              ▶ Start Guided Tour
            </button>
            <button className="demo-btn-ghost" onClick={skip}>
              Explore on my own
            </button>
          </div>

          {/* Contact strip */}
          <div className="demo-contact-strip">
            Ready to get started? Contact us at <a href="mailto:info@mechiq.com.au">info@mechiq.com.au</a>
          </div>
        </div>
      </div>
    );
  }

  // ── Guided tour ──
  if (screen === 'tour') {
    const current = TOUR_STEPS[step];

    // Position tooltip — always bottom-left on desktop, bottom-center on mobile
    const isMobile = window.innerWidth < 768;
    const tooltipStyle = isMobile
      ? { bottom: 80, left: '50%', transform: 'translateX(-50%)' }
      : { bottom: 40, left: 220 + 20 };

    return (
      <div className="tour-overlay">
        <div className="tour-backdrop" onClick={skip} />
        <div className="tour-tooltip" style={tooltipStyle}>
          <div className="tour-step-badge">Step {step + 1} of {TOUR_STEPS.length}</div>
          <div className="tour-title">{current.title}</div>
          <div className="tour-desc">{current.desc}</div>
          <div className="tour-nav">
            <button className="tour-btn-skip" onClick={skip}>Skip tour</button>
            <div className="tour-dots">
              {TOUR_STEPS.map((_, i) => (
                <div key={i} className={`tour-dot${i === step ? ' active' : ''}`} />
              ))}
            </div>
            <button className="tour-btn-next" onClick={next}>
              {step === TOUR_STEPS.length - 1 ? '✓ Done' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
