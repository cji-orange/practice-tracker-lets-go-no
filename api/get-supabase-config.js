export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase environment variables are not set.');
    return res.status(500).json({ error: 'Server configuration error. Supabase environment variables missing.' });
  }

  res.status(200).json({
    supabaseUrl,
    supabaseAnonKey,
  });
} 