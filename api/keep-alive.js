import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // আপনার .env ফাইল অনুযায়ী সঠিক Variable নামগুলো ব্যবহার করা হয়েছে
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ 
      status: 'Failed', 
      error: 'Supabase Credentials Missing in Vercel Environment Variables.' 
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // ডাটাবেসকে জাগিয়ে রাখার জন্য আপনার lms_courses টেবিল থেকে জাস্ট ১টি আইডি কল করা হলো
    const { data, error } = await supabase.from('lms_courses').select('id').limit(1);
    
    if (error) throw error;
    
    return res.status(200).json({ 
      status: 'Success', 
      message: 'Supabase is Awake and Active!', 
      timestamp: new Date().toISOString() 
    });

  } catch (error) {
    return res.status(500).json({ 
      status: 'Error', 
      error: error.message 
    });
  }
}