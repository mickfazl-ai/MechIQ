import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Html5QrcodeScanner } from 'html5-qrcode';

function Scanner({ userRole, onAssetFound }) {
  const [manualEntry, setManualEntry] = useState('');
  const [assets, setAssets] = useState([]);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (userRole?.company_id) fetchAssets();
  }, [userRole]);

  useEffect(() => {
    if (!scanning) return;

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: 250, facingMode: 'environment' },
      false
    );

    scanner.render(
      (decodedText) => {
        try { scanner.clear(); } catch {}
        setScanning(false);
        handleQrResult(decodedText);
      },
      () => {}
    );

    return () => {
      try { scanner.clear(); } catch {}
    };
  }, [scanning]);

  const handleQrResult = (decodedText) => {
    setError('');
    try {
      // Handle /asset/{id} path format
      const url = new URL(decodedText);
      const parts = url.pathname.split('/');
      const assetIndex = parts.indexOf('asset');
      if (assetIndex !== -1 && parts[assetIndex + 1]) {
        onAssetFound(parts[assetIndex + 1]);
        return;
      }
      setError('QR code not recognised. Try manual entry.');
    } catch {
      // Not a URL - try matching asset directly
      const found = assets.find(a =>
        a.id === decodedText ||
        a.asset_number?.toLowerCase() === decodedText.toLowerCase()
      );
      if (found) onAssetFound(found.id);
      else setError('QR code not recognised. Try manual entry.');
    }
  };

  const fetchAssets = async () => {
    const { data } = await supabase.from('assets').select('id, name, asset_number, type, location').eq('company_id', userRole.company_id);
    setAssets(data || []);
  };

  const handleManualSearch = () => {
    const found = assets.find(a =>
      a.asset_number?.toLowerCase() === manualEntry.toLowerCase() ||
      a.name?.toLowerCase() === manualEntry.toLowerCase()
    );
    if (found) onAssetFound(found.id);
    else setError('Asset not found. Try the asset number (e.g. AST-0001) or name.');
  };

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '6px' }}>
          <span style={{ color: 'white' }}>MAINTAIN</span><span style={{ color: '#00c2e0' }}>IQ</span>
        </div>
        <p style={{ color: '#a0b0b0', margin: '0' }}>Scan a machine QR code to begin</p>
      </div>

      {!scanning ? (
        <button
          onClick={() => { setScanning(true); setError(''); }}
          style={{ width: '100%', padding: '20px', backgroundColor: '#00c2e0', color: '#0a0f0f', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '20px' }}
        >
          📷 Scan QR Code
        </button>
      ) : (
        <div style={{ marginBottom: '20px' }}>
          <div id="qr-reader" style={{ borderRadius: '8px', overflow: 'hidden', width: '100%' }} />
          <button
            onClick={() => { try { } catch {} setScanning(false); }}
            style={{ width: '100%', marginTop: '10px', padding: '10px', backgroundColor: 'transparent', color: '#a0b0b0', border: '1px solid #1a2f2f', borderRadius: '4px', cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#1a2f2f' }} />
        <span style={{ color: '#a0b0b0', fontSize: '13px' }}>or enter manually</span>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#1a2f2f' }} />
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <input
          placeholder="Asset number or machine name (e.g. AST-0001)"
          value={manualEntry}
          onChange={e => { setManualEntry(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleManualSearch()}
          style={{ flex: 1, padding: '12px', backgroundColor: '#0d1515', color: 'white', border: '1px solid #1a2f2f', borderRadius: '4px', fontSize: '14px', fontFamily: 'Barlow, sans-serif' }}
        />
        <button onClick={handleManualSearch} className="btn-primary" style={{ padding: '12px 16px' }}>Go</button>
      </div>

      {error && <p style={{ color: '#e94560', fontSize: '13px', marginBottom: '15px' }}>{error}</p>}

      <div style={{ marginTop: '25px' }}>
        <p style={{ color: '#a0b0b0', fontSize: '12px', marginBottom: '10px' }}>OR SELECT A MACHINE:</p>
        {assets.map(a => (
          <div key={a.id} onClick={() => onAssetFound(a.id)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#0d1515', borderRadius: '6px', marginBottom: '8px', border: '1px solid #1a2f2f', cursor: 'pointer' }}>
            <div>
              <div style={{ color: '#00c2e0', fontSize: '12px' }}>{a.asset_number}</div>
              <div style={{ color: 'white', fontWeight: 'bold' }}>{a.name}</div>
              <div style={{ color: '#a0b0b0', fontSize: '12px' }}>{a.type} · {a.location}</div>
            </div>
            <span style={{ color: '#00c2e0', fontSize: '20px' }}>→</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Scanner;
