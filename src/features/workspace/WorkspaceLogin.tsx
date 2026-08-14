// src/features/workspace/WorkspaceLogin.tsx
import React, { useState } from 'react';
import { workspaceSupabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

export default function WorkspaceLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // মেইন ডাটাবেসের বদলে নতুন workspace ডাটাবেসে লগইন রিকোয়েস্ট যাবে
    const { error } = await workspaceSupabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      navigate('/workspace/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="bg-gray-800 p-8 rounded-xl w-96 shadow-2xl border border-gray-700">
        <div className="flex flex-col items-center mb-6">
          <BookOpen className="w-12 h-12 text-blue-500 mb-2" />
          <h2 className="text-2xl font-bold">Study Workspace</h2>
          <p className="text-gray-400 text-sm">Collaborative Learning Portal</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email Address"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            {loading ? 'Entering...' : 'Join Workspace'}
          </button>
        </form>
      </div>
    </div>
  );
}