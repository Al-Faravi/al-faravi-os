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