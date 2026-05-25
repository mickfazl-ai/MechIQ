import React, { useState } from 'react';
import { supabase } from './supabase';

const INDUSTRIES = [
  'Mining', 'Construction', 'Agriculture', 'Transport & Logistics',
  'Manufacturing', 'Oil & Gas', 'Civil Engineering', 'Forestry', 'Other'
];

function Signup({ onBackToLogin }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    companyName: '', abn: '', industry: '', address: '',
    contactName: '', phone: '', email: '', password: '', confirmPassword: ''
  });

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

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
    setError('');
    setStep(2);
  };

  const handleSignup = async () => {
    const err = validateStep2();
    if (err) { setError(err); return; }
    setLoading(true);
    setError('');
    try {
      // Create auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password
      });
      if (authError) throw authError;

      // Create company with status: pending
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: form.companyName,
          abn: form.abn,
          industry: form.industry,
          address: form.address,
          contact_name: form.contactName,
          phone: form.phone,
          status: 'pending',
          asset_limit: 10,
          features: {
            dashboard: true, assets: true, downtime: true,
            maintenance: true, prestart: true, scanner: true,
            reports: true, users: true, form_builder: true
          }
        })
        .select().single();
      if (companyError) throw companyError;

      // Create user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          email: form.email,
          name: form.contactName,
          role: 'admin',
          company_id: company.id
        });
      if (roleError) throw roleError;

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const inputStyle = {
    width: '100%', padding: '11px 14px', backgroundColor: '#0d1515',
    color: 'white', border: '1px solid #1a2f2f', borderRadius: '6px',
    fontSize: '14px', fontFamily: 'Barlow, sans-serif', boxSizing: 'border-box'
  };

  const labelStyle = { color: '#a0b0b0', fontSize: '12px', display: 'block', marginBottom: '5px' };

  const fieldStyle = { marginBottom: '14px' };

  if (success) return (
    <div className="login-page">
      <div className="login-card" style={{ textAlign: 'center' }}>
        <h1 className="login-title">MAINTAIN<span>IQ</span></h1>
        <div style={{ fontSize: '48px', margin: '20px 0' }}>⏳</div>
        <h2 style={{ color: '#00c2e0', marginBottom: '12px' }}>Registration Submitted</h2>
        <p style={{ color: '#a0b0b0', marginBottom: '8px', fontSize: '14px' }}>
          Thanks <strong style={{ color: 'white' }}>{form.contactName}</strong>! Your account for <strong style={{ color: 'white' }}>{form.companyName}</strong> is pending approval.
        </p>
        <p style={{ color: '#a0b0b0', marginBottom: '24px', fontSize: '14px' }}>
          You'll receive an email once your account has been activated.
        </p>
        <button className="btn-login" onClick={onBackToLogin}>Back to Login</button>
      </div>
    </div>
  );

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: '460px' }}>
        <h1 className="login-title">MAINTAIN<span>IQ</span></h1>
        <p className="login-subtitle">
          {step === 1 ? 'Company Registration — Step 1 of 2' : 'Account Setup — Step 2 of 2'}
        </p>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', justifyContent: 'center' }}>
          {[1, 2].map(s => (
            <div key={s} style={{
              width: '32px', height: '4px', borderRadius: '2px',
              backgroundColor: s <= step ? '#00c2e0' : '#1a2f2f'
            }} />
          ))}
        </div>

        {step === 1 && (
          <div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Company Name *</label>
              <input style={inputStyle} placeholder="e.g. Acme Engineering" value={form.companyName} onChange={e => set('companyName', e.target.value)} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>ABN</label>
              <input style={inputStyle} placeholder="e.g. 12 345 678 901" value={form.abn} onChange={e => set('abn', e.target.value)} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Industry *</label>
              <select style={inputStyle} value={form.industry} onChange={e => set('industry', e.target.value)}>
                <option value="">Select industry...</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Address</label>
              <input style={inputStyle} placeholder="e.g. 123 Main St, Perth WA" value={form.address} onChange={e => set('address', e.target.value)} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Primary Contact Name *</label>
              <input style={inputStyle} placeholder="e.g. John Smith" value={form.contactName} onChange={e => set('contactName', e.target.value)} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Phone *</label>
              <input style={inputStyle} placeholder="e.g. 0412 345 678" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            {error && <p className="login-error">{error}</p>}
            <button className="btn-login" onClick={handleNext}>Next →</button>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ padding: '12px', backgroundColor: '#0d1515', borderRadius: '6px', marginBottom: '18px', border: '1px solid #1a2f2f' }}>
              <div style={{ color: '#00c2e0', fontWeight: 700, marginBottom: '4px' }}>{form.companyName}</div>
              <div style={{ color: '#a0b0b0', fontSize: '12px' }}>{form.industry} · {form.contactName}</div>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Email *</label>
              <input style={inputStyle} type="email" placeholder="you@company.com" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Password *</label>
              <input style={inputStyle} type="password" placeholder="Min 6 characters" value={form.password} onChange={e => set('password', e.target.value)} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Confirm Password *</label>
              <input style={inputStyle} type="password" placeholder="Repeat password" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} />
            </div>
            {error && <p className="login-error">{error}</p>}
            <button className="btn-login" onClick={handleSignup} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Registration'}
            </button>
            <button onClick={() => { setStep(1); setError(''); }} style={{
              width: '100%', marginTop: '10px', padding: '11px', background: 'transparent',
              border: '1px solid #1a2f2f', color: '#a0b0b0', borderRadius: '6px', cursor: 'pointer'
            }}>← Back</button>
          </div>
        )}

        <p style={{ textAlign: 'center', marginTop: '20px', color: '#a0b0b0', fontSize: '14px' }}>
          Already have an account?{' '}
          <span style={{ color: '#00c2e0', cursor: 'pointer' }} onClick={onBackToLogin}>Log in</span>
        </p>
      </div>
    </div>
  );
}

export default Signup;
