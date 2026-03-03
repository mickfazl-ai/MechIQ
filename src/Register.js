import React, { useState } from 'react';
import { supabase } from './supabase';

const PLANS = [
  {
    id: 'trial',
    name: 'Free Trial',
    price: 'Free',
    period: '14 days',
    color: '#00c2e0',
    badge: 'TRY FREE',
    description: 'Full access to all features for 14 days. No credit card required.',
    features: [
      '✓ Up to 10 assets',
      '✓ Up to 3 users',
      '✓ All features included',
      '✓ Downtime & availability tracking',
      '✓ Form builder',
      '✓ Reports',
      '✓ QR scanning',
    ],
    asset_limit: 10,
    user_limit: 3,
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 'TBD',
    period: '/month',
    color: '#00c264',
    badge: 'POPULAR',
    description: 'Perfect for small teams managing a fleet of assets.',
    features: [
      '✓ Up to 25 assets',
      '✓ Up to 5 users',
      '✓ Downtime & availability tracking',
      '✓ Prestart checklists',
      '✓ Maintenance tracking',
      '✓ QR scanning',
      '✗ Reports (upgrade to unlock)',
      '✗ Priority support',
    ],
    asset_limit: 25,
    user_limit: 5,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 'TBD',
    period: '/month',
    color: '#a855f7',
    badge: 'BEST VALUE',
    description: 'For growing operations that need full visibility and reporting.',
    features: [
      '✓ Up to 50 assets',
      '✓ Up to 15 users',
      '✓ All features included',
      '✓ Downtime & availability tracking',
      '✓ Form builder',
      '✓ Full reports & analytics',
      '✓ Priority support',
      '✓ QR scanning',
    ],
    asset_limit: 50,
    user_limit: 15,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Contact Us',
    period: '',
    color: '#f0a500',
    badge: 'CUSTOM',
    description: 'Unlimited scale for large operations with custom requirements.',
    features: [
      '✓ Unlimited assets',
      '✓ Unlimited users',
      '✓ All features included',
      '✓ Downtime & availability tracking',
      '✓ Form builder',
      '✓ Full reports & analytics',
      '✓ Priority support',
      '✓ Dedicated onboarding',
    ],
    asset_limit: 9999,
    user_limit: 9999,
  },
];

const INDUSTRIES = [
  'Mining', 'Construction', 'Agriculture', 'Transport & Logistics',
  'Manufacturing', 'Oil & Gas', 'Civil Engineering', 'Forestry', 'Other'
];

function Register({ onBackToLogin }) {
  const [step, setStep] = useState('plans');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    companyName: '', abn: '', industry: '', address: '',
    contactName: '', phone: '', email: '', password: '', confirmPassword: ''
  });
  const [formStep, setFormStep] = useState(1);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSelectPlan = (plan) => {
    if (plan.id === 'enterprise') {
      window.location.href = 'mailto:michael@coastlinemm.com.au?subject=Mech IQ Enterprise Enquiry';
      return;
    }
    setSelectedPlan(plan);
    setStep('form');
  };

  const validateStep1 = () => {
    if (!form.companyName) return 'Company name is required';
    if (!form.industry) return 'Please select an industry';
    if (!form.contactName) return 'Contact name is required';
    if (!form.phone) return 'Phone number is required';
    return null;
  };

  const validateStep2 = () => {
    if (!form.email) return 'Email is required';
    if (!form.password || form.password.length < 6) return 'Password must be at least 6 characters';
    if (form.password !== form.confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleNext = () => {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError(''); setFormStep(2);
  };

  const handleSubmit = async () => {
    const err = validateStep2();
    if (err) { setError(err); return; }
    setLoading(true); setError('');
    try {
      const { error: authError } = await supabase.auth.signUp({ email: form.email, password: form.password });
      if (authError) throw authError;

      const features = {
        dashboard: true, assets: true, downtime: true, maintenance: true,
        prestart: true, scanner: true, form_builder: true, users: true,
        reports: selectedPlan.id === 'trial' || selectedPlan.id === 'professional',
      };

      const { data: company, error: companyError } = await supabase.from('companies').insert({
        name: form.companyName, abn: form.abn, industry: form.industry,
        address: form.address, contact_name: form.contactName, phone: form.phone,
        status: 'pending', asset_limit: selectedPlan.asset_limit,
        features, plan: selectedPlan.id,
      }).select().single();
      if (companyError) throw companyError;

      const { error: roleError } = await supabase.from('user_roles').insert({
        email: form.email, name: form.contactName, role: 'admin', company_id: company.id
      });
      if (roleError) throw roleError;

      setStep('success');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const inputStyle = { width: '100%', padding: '11px 14px', backgroundColor: '#0d1515', color: 'white', border: '1px solid #1a2f2f', borderRadius: '6px', fontSize: '14px', fontFamily: 'Barlow, sans-serif', boxSizing: 'border-box' };
  const labelStyle = { color: '#a0b0b0', fontSize: '12px', display: 'block', marginBottom: '5px' };
  const fieldStyle = { marginBottom: '14px' };

  if (step === 'success') return (
    <div className="login-page">
      <div className="login-card" style={{ textAlign: 'center' }}>
        <h1 className="login-title">MECH<span> IQ</span></h1>
        <div style={{ fontSize: '48px', margin: '20px 0' }}>⏳</div>
        <h2 style={{ color: '#00c2e0', marginBottom: '12px' }}>Registration Submitted!</h2>
        <div style={{ backgroundColor: '#0d1515', border: '1px solid #1a2f2f', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
          <div style={{ color: '#a0b0b0', fontSize: '12px', marginBottom: '4px' }}>SELECTED PLAN</div>
          <div style={{ color: selectedPlan.color, fontWeight: 700, fontSize: '16px' }}>{selectedPlan.name}</div>
        </div>
        <p style={{ color: '#a0b0b0', marginBottom: '8px', fontSize: '14px' }}>
          Thanks <strong style={{ color: 'white' }}>{form.contactName}</strong>! Your account for <strong style={{ color: 'white' }}>{form.companyName}</strong> is pending approval.
        </p>
        <p style={{ color: '#a0b0b0', marginBottom: '24px', fontSize: '13px' }}>
          We'll be in touch shortly to confirm your plan and activate your account.
        </p>
        <button className="btn-login" onClick={onBackToLogin}>Back to Login</button>
      </div>
    </div>
  );

  if (step === 'form') return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: '460px' }}>
        <h1 className="login-title">MECH<span> IQ</span></h1>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0d1515', border: `1px solid ${selectedPlan.color}`, borderRadius: '8px', padding: '10px 14px', marginBottom: '20px' }}>
          <div>
            <div style={{ color: selectedPlan.color, fontWeight: 700, fontSize: '14px' }}>{selectedPlan.name} Plan</div>
            <div style={{ color: '#a0b0b0', fontSize: '11px' }}>{selectedPlan.price}{selectedPlan.period}</div>
          </div>
          <button onClick={() => { setStep('plans'); setFormStep(1); setError(''); }} style={{ background: 'transparent', border: 'none', color: '#a0b0b0', cursor: 'pointer', fontSize: '12px' }}>Change ↩</button>
        </div>
        <p className="login-subtitle">{formStep === 1 ? 'Company Details — Step 1 of 2' : 'Account Setup — Step 2 of 2'}</p>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', justifyContent: 'center' }}>
          {[1, 2].map(s => <div key={s} style={{ width: '32px', height: '4px', borderRadius: '2px', backgroundColor: s <= formStep ? selectedPlan.color : '#1a2f2f' }} />)}
        </div>

        {formStep === 1 && (
          <div>
            <div style={fieldStyle}><label style={labelStyle}>Company Name *</label><input style={inputStyle} placeholder="e.g. Acme Engineering" value={form.companyName} onChange={e => set('companyName', e.target.value)} /></div>
            <div style={fieldStyle}><label style={labelStyle}>ABN</label><input style={inputStyle} placeholder="e.g. 12 345 678 901" value={form.abn} onChange={e => set('abn', e.target.value)} /></div>
            <div style={fieldStyle}><label style={labelStyle}>Industry *</label>
              <select style={inputStyle} value={form.industry} onChange={e => set('industry', e.target.value)}>
                <option value="">Select industry...</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div style={fieldStyle}><label style={labelStyle}>Address</label><input style={inputStyle} placeholder="e.g. 123 Main St, Perth WA" value={form.address} onChange={e => set('address', e.target.value)} /></div>
            <div style={fieldStyle}><label style={labelStyle}>Primary Contact Name *</label><input style={inputStyle} placeholder="e.g. John Smith" value={form.contactName} onChange={e => set('contactName', e.target.value)} /></div>
            <div style={fieldStyle}><label style={labelStyle}>Phone *</label><input style={inputStyle} placeholder="e.g. 0412 345 678" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
            {error && <p className="login-error">{error}</p>}
            <button className="btn-login" onClick={handleNext}>Next →</button>
            <button onClick={() => { setStep('plans'); setError(''); }} style={{ width: '100%', marginTop: '10px', padding: '11px', background: 'transparent', border: '1px solid #1a2f2f', color: '#a0b0b0', borderRadius: '6px', cursor: 'pointer' }}>← Back to Plans</button>
          </div>
        )}

        {formStep === 2 && (
          <div>
            <div style={{ padding: '12px', backgroundColor: '#0d1515', borderRadius: '6px', marginBottom: '18px', border: '1px solid #1a2f2f' }}>
              <div style={{ color: '#00c2e0', fontWeight: 700, marginBottom: '4px' }}>{form.companyName}</div>
              <div style={{ color: '#a0b0b0', fontSize: '12px' }}>{form.industry} · {form.contactName}</div>
            </div>
            <div style={fieldStyle}><label style={labelStyle}>Email *</label><input style={inputStyle} type="email" placeholder="you@company.com" value={form.email} onChange={e => set('email', e.target.value)} /></div>
            <div style={fieldStyle}><label style={labelStyle}>Password *</label><input style={inputStyle} type="password" placeholder="Min 6 characters" value={form.password} onChange={e => set('password', e.target.value)} /></div>
            <div style={fieldStyle}><label style={labelStyle}>Confirm Password *</label><input style={inputStyle} type="password" placeholder="Repeat password" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} /></div>
            {error && <p className="login-error">{error}</p>}
            <button className="btn-login" onClick={handleSubmit} disabled={loading}>{loading ? 'Submitting...' : 'Submit Registration'}</button>
            <button onClick={() => { setFormStep(1); setError(''); }} style={{ width: '100%', marginTop: '10px', padding: '11px', background: 'transparent', border: '1px solid #1a2f2f', color: '#a0b0b0', borderRadius: '6px', cursor: 'pointer' }}>← Back</button>
          </div>
        )}
      </div>
    </div>
  );

  // PLAN SELECTION
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0f0f', padding: '40px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 900, margin: '0 0 8px' }}>
          <span style={{ color: 'white' }}>MECH</span><span style={{ color: '#00c2e0' }}> IQ</span>
        </h1>
        <h2 style={{ color: '#fff', fontSize: '22px', margin: '0 0 8px' }}>Choose your plan</h2>
        <p style={{ color: '#a0b0b0', margin: 0, fontSize: '14px' }}>Start with a free trial — no credit card required</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', maxWidth: '1100px', margin: '0 auto 40px' }}>
        {PLANS.map(plan => (
          <div key={plan.id} style={{ backgroundColor: '#0d1515', border: `1px solid ${plan.color}44`, borderRadius: '12px', padding: '28px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '14px', right: '14px', backgroundColor: plan.color + '22', color: plan.color, padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 700 }}>{plan.badge}</div>
            <div style={{ color: plan.color, fontWeight: 900, fontSize: '18px', marginBottom: '6px' }}>{plan.name}</div>
            <div style={{ marginBottom: '6px' }}>
              <span style={{ color: '#fff', fontSize: '28px', fontWeight: 900 }}>{plan.price}</span>
              {plan.period && <span style={{ color: '#a0b0b0', fontSize: '13px' }}> {plan.period}</span>}
            </div>
            <p style={{ color: '#a0b0b0', fontSize: '12px', marginBottom: '20px', lineHeight: 1.5 }}>{plan.description}</p>
            <div style={{ flex: 1, marginBottom: '24px' }}>
              {plan.features.map((f, i) => <div key={i} style={{ fontSize: '13px', marginBottom: '7px', color: f.startsWith('✓') ? '#fff' : '#555' }}>{f}</div>)}
            </div>
            <button onClick={() => handleSelectPlan(plan)} style={{ width: '100%', padding: '13px', border: 'none', borderRadius: '7px', backgroundColor: plan.color, color: plan.id === 'trial' ? '#000' : '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
              {plan.id === 'enterprise' ? 'Contact Us' : plan.id === 'trial' ? 'Start Free Trial' : 'Get Started'}
            </button>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center' }}>
        <button onClick={onBackToLogin} style={{ background: 'transparent', border: 'none', color: '#a0b0b0', cursor: 'pointer', fontSize: '14px' }}>← Back to Login</button>
      </div>
    </div>
  );
}

export default Register;
