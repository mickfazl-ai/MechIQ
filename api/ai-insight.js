import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorised' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  try {
    // Strip any tools param that causes issues
    const { tools, ...bodyWithoutTools } = req.body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(bodyWithoutTools),
    });

    const data = await response.json();

    // Log errors from Anthropic for debugging
    if (data.error) {
      console.error('Anthropic API error:', JSON.stringify(data.error));
    }

    return res.status(response.status).json(data);
  } catch (err) {
    console.error('Proxy error:', err.message);
    return res.status(500).json({ error: 'Upstream API error', detail: err.message });
  }
}
