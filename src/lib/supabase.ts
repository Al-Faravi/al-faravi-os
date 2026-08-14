/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'

// ==========================================
// 1. MAIN OS DATABASE (আপনার নিজস্ব ভল্ট ও ডাটা)
// ==========================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Main Supabase environment variables. Check your .env file.')
}

// মেইন Supabase ক্লায়েন্ট তৈরি
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // ইউজারের লগইন সেশন ব্রাউজারে ধরে রাখবে
    autoRefreshToken: true,
  }
})

// ==========================================
// 2. WORKSPACE DATABASE (বন্ধুদের জন্য/গেস্ট হাউজ)
// ==========================================
const workspaceUrl = import.meta.env.VITE_WORKSPACE_SUPABASE_URL
const workspaceAnonKey = import.meta.env.VITE_WORKSPACE_SUPABASE_ANON_KEY

if (!workspaceUrl || !workspaceAnonKey) {
  throw new Error('Missing Workspace Supabase environment variables. Check your .env file.')
}

// ওয়ার্কস্পেস Supabase ক্লায়েন্ট তৈরি
export const workspaceSupabase = createClient(workspaceUrl, workspaceAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // মাল্টিপল ডাটাবেস হ্যান্ডেল করার জন্য স্টোরেজ কি (Key) আলাদা করে দেওয়া হলো
    // এতে করে মেইন ডাটাবেস এবং ওয়ার্কস্পেসের লগইন সেশন কনফ্লিক্ট করবে না
    storageKey: 'workspace-auth-token', 
  }
})

// ==========================================
// 3. WORKSPACE ADMIN CLIENT (শুধুমাত্র Workspace Manager-এ ব্যবহারের জন্য)
// ==========================================
const workspaceServiceKey = import.meta.env.VITE_WORKSPACE_SERVICE_KEY;

// যদি সার্ভিস কি না থাকে তবে এরর থ্রো করবে (অপশনাল, তবে ডিবাগিংয়ের জন্য ভালো)
if (!workspaceServiceKey) {
  console.warn('Missing VITE_WORKSPACE_SERVICE_KEY in .env file. Workspace Admin features may not work.');
}

export const workspaceAdmin = createClient(workspaceUrl, workspaceServiceKey || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false // এটি আমাদের লগইন সেশনকে ওভাররাইট করবে না
  }
});