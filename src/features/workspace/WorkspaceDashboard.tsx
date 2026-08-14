// src/features/workspace/WorkspaceDashboard.tsx
import React from 'react';
import { workspaceSupabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function WorkspaceDashboard() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await workspaceSupabase.auth.signOut();
    navigate('/workspace/login');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-800">
          <h1 className="text-3xl font-bold text-blue-500">My Study Groups</h1>
          <button 
            onClick={handleLogout}
            className="bg-red-500/10 text-red-500 px-4 py-2 rounded-lg hover:bg-red-500/20"
          >
            Leave Workspace
          </button>
        </div>
        
        <div className="text-center text-gray-500 mt-20">
          <p>No courses assigned to you yet.</p>
          <p className="text-sm mt-2">Wait for Al Faravi to push a course to this group.</p>
        </div>
      </div>
    </div>
  );
}