import React, { useState } from 'react';

const CYAN = '#00c2e0';
const BORDER = '#1a2f2f';
const CARD = '#0d1515';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    content: `By accessing or using Mech IQ ("the Software"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you must not use the Software. These Terms constitute a legally binding agreement between you and Coastline Mechanical ("we", "us", "our").`,
  },
  {
    title: '2. Intellectual Property',
    content: `The Software, including all source code, design, features, functionality, content, branding, and the "Mech IQ" name and logo, are the exclusive intellectual property of Coastline Mechanical and are protected by Australian and international copyright, trademark, and other intellectual property laws.

You may not copy, modify, distribute, sell, sublicense, reverse-engineer, or create derivative works based on the Software without our express written permission. Unauthorised use constitutes an infringement of our intellectual property rights.`,
  },
  {
    title: '3. Licence to Use',
    content: `Subject to your compliance with these Terms and payment of applicable subscription fees, we grant you a limited, non-exclusive, non-transferable, revocable licence to access and use the Software solely for your internal business operations.

This licence does not include the right to: resell or commercially exploit the Software; access the Software to build a competitive product; scrape, data-mine, or harvest data from the Software; or remove any copyright, trademark, or other proprietary notices.`,
  },
  {
    title: '4. Subscriptions & Billing',
    content: `Access to Mech IQ is provided on a subscription basis. Subscription fees are billed in advance on a monthly or annual basis. All fees are in Australian Dollars (AUD) and are non-refundable except as required by Australian Consumer Law.

We reserve the right to modify subscription pricing with 30 days' written notice. Continued use of the Software after a price change constitutes acceptance of the new pricing.`,
  },
  {
    title: '5. Your Data',
    content: `You retain full ownership of all data you input into Mech IQ ("Your Data"). We do not claim any intellectual property rights over Your Data.

You grant us a limited licence to store, process, and display Your Data solely for the purpose of providing the Software to you. We will not sell, share, or use Your Data for any purpose other than operating the Software.

You are responsible for maintaining the accuracy of Your Data and for ensuring you have the right to upload any data you input into the Software.`,
  },
  {
    title: '6. Data Security & Backups',
    content: `We take reasonable technical and organisational measures to protect Your Data against unauthorised access, loss, or destruction. Your Data is stored on Supabase infrastructure hosted on Amazon Web Services (AWS) with industry-standard encryption at rest and in transit.

While we maintain automated backups, you are encouraged to regularly export your data using the built-in Data Export feature. We are not liable for data loss caused by events beyond our reasonable control, including but not limited to infrastructure outages, cyberattacks, or force majeure events.`,
  },
  {
    title: '7. Acceptable Use',
    content: `You agree not to use the Software to: violate any applicable law or regulation; upload malicious code, viruses, or harmful content; interfere with or disrupt the integrity or performance of the Software; attempt to gain unauthorised access to any part of the Software or its infrastructure; impersonate any person or entity; or engage in any activity that could harm us, our users, or third parties.

We reserve the right to suspend or terminate your account immediately if we determine, in our sole discretion, that you have violated this clause.`,
  },
  {
    title: '8. Multi-Tenancy & Data Isolation',
    content: `The Software is operated as a multi-tenant platform. Each company account is logically isolated and cannot access the data of other company accounts. We implement company-level data segregation using unique company identifiers on all database records.

You must not attempt to access, modify, or interfere with data belonging to other company accounts.`,
  },
  {
    title: '9. Disclaimers',
    content: `The Software is provided "as is" and "as available" without warranties of any kind, either express or implied, to the fullest extent permitted by law. We do not warrant that the Software will be uninterrupted, error-free, or completely secure.

The depreciation calculations, AI-generated predictions, and market valuations provided by the Software are estimates only and should not be relied upon as professional financial, accounting, or legal advice. You should seek independent professional advice for financial decisions.`,
  },
  {
    title: '10. Limitation of Liability',
    content: `To the fullest extent permitted by Australian law, Coastline Mechanical shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, goodwill, or business interruption, arising from your use of or inability to use the Software.

Our total cumulative liability to you for any claims arising from these Terms or your use of the Software shall not exceed the total amount paid by you in the 12 months preceding the claim.`,
  },
  {
    title: '11. Privacy',
    content: `Our collection and use of personal information in connection with the Software is governed by our Privacy Policy, which is incorporated into these Terms by reference. By using the Software, you consent to the collection and use of your personal information as described in the Privacy Policy.

We comply with the Australian Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs).`,
  },
  {
    title: '12. Termination',
    content: `Either party may terminate these Terms at any time. Upon termination, your right to use the Software will immediately cease. You may export your data at any time before termination using the Data Export feature.

Following termination, we will retain Your Data for 30 days, after which it may be permanently deleted. We are not responsible for any data that cannot be recovered after this period.`,
  },
  {
    title: '13. Governing Law',
    content: `These Terms are governed by and construed in accordance with the laws of Western Australia, Australia. Any disputes arising from these Terms or your use of the Software shall be subject to the exclusive jurisdiction of the courts of Western Australia.`,
  },
  {
    title: '14. Changes to Terms',
    content: `We reserve the right to modify these Terms at any time. We will notify you of material changes by email or through a notice within the Software at least 14 days before the changes take effect. Your continued use of the Software after the effective date of any changes constitutes your acceptance of the revised Terms.`,
  },
  {
    title: '15. Contact',
    content: `If you have any questions about these Terms, please contact us at:

Coastline Mechanical
Website: coastlinemm.com.au
Email: noreply@coastlinemm.com.au`,
  },
];

export default function TermsOfService() {
  const [openSection, setOpenSection] = useState(null);
  const effectiveDate = 'March 2025';

  const cardStyle = {
    background: CARD,
    border: `1px solid ${BORDER}`,
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
  };

  return (
    <div style={{ fontFamily: 'Barlow, sans-serif', color: '#e0eaea', padding: '24px 28px', maxWidth: 860 }}>

      {/* Header */}
      <div className="page-header" style={{ marginBottom: 8 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Terms of Service</h1>
      </div>
      <p style={{ color: '#8fa8a8', fontSize: 13, marginBottom: 28 }}>
        Effective date: {effectiveDate} &nbsp;·&nbsp; Mech IQ by Coastline Mechanical
      </p>

      {/* Intro card */}
      <div style={{ background: '#060b0b', border: `1px solid ${CYAN}22`, borderRadius: 10, padding: '16px 20px', marginBottom: 24 }}>
        <p style={{ margin: 0, color: '#c8dada', fontSize: 13, lineHeight: 1.7 }}>
          Please read these Terms of Service carefully before using Mech IQ. These Terms govern your use of the software and form a binding legal agreement between you and Coastline Mechanical. By creating an account or using the Software, you confirm that you have read, understood, and agree to these Terms.
        </p>
      </div>

      {/* Accordion sections */}
      {SECTIONS.map((section, i) => {
        const isOpen = openSection === i;
        return (
          <div key={i} style={cardStyle}>
            <button
              onClick={() => setOpenSection(isOpen ? null : i)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'Barlow, sans-serif',
                textAlign: 'left',
              }}
            >
              <span style={{ color: isOpen ? CYAN : '#e0eaea', fontSize: 14, fontWeight: isOpen ? 700 : 600 }}>
                {section.title}
              </span>
              <span style={{ color: CYAN, fontSize: 16, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0, marginLeft: 12 }}>
                ▾
              </span>
            </button>
            {isOpen && (
              <div style={{ padding: '0 20px 18px', borderTop: `1px solid ${BORDER}` }}>
                {section.content.split('\n\n').map((para, pi) => (
                  <p key={pi} style={{ color: '#c8dada', fontSize: 13, lineHeight: 1.75, margin: pi === 0 ? '14px 0 0' : '12px 0 0', whiteSpace: 'pre-line' }}>
                    {para}
                  </p>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Footer */}
      <div style={{ marginTop: 28, padding: '16px 20px', background: '#060b0b', border: `1px solid ${BORDER}`, borderRadius: 10 }}>
        <p style={{ margin: 0, color: '#4a6a6a', fontSize: 11, textAlign: 'center' }}>
          © {new Date().getFullYear()} Coastline Mechanical. All rights reserved. Mech IQ is a registered product of Coastline Mechanical.
          These Terms were last updated {effectiveDate}.
        </p>
      </div>
    </div>
  );
}
