// src/features/workspace/WorkspaceManager.tsx
import React, { useState, useEffect } from 'react';
import { workspaceAdmin } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, FolderOpen } from 'lucide-react';

export default function WorkspaceManager() {
  const [groups, setGroups] = useState<any[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    const { data } = await workspaceAdmin.from('study_groups').select('*');
    if (data) setGroups(data);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName) return;
    setLoading(true);
    const { error } = await workspaceAdmin.from('study_groups').insert([{ name: newGroupName }]);
    if (!error) {
      setNewGroupName('');
      fetchGroups();
    }
    setLoading(false);
  };

  return (
    <div className="p-8 text-white max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between border-b border-gray-700 pb-4">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-500" />
          <h1 className="text-3xl font-bold">My Workspaces</h1>
        </div>
      </div>

      {/* Create Group */}
      <form onSubmit={handleCreateGroup} className="flex gap-4 mb-8">
        <input 
          type="text" placeholder="Enter New Group Name (e.g. BCS Batch 2)" 
          value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} 
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-3 text-white" 
        />
        <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 px-6 rounded-lg font-semibold flex items-center gap-2">
          <Plus className="w-5 h-5" /> Create Group
        </button>
      </form>

      {/* Group List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {groups.map(group => (
          <div 
            key={group.id} 
            onClick={() => navigate(`/workspace-manager/group/${group.id}`)}
            className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-blue-500 cursor-pointer transition-all group flex flex-col justify-between h-40"
          >
            <div>
              <FolderOpen className="w-8 h-8 text-yellow-500 mb-3" />
              <h2 className="text-xl font-bold text-white group-hover:text-blue-400">{group.name}</h2>
            </div>
            <p className="text-sm text-gray-400">Click to manage courses & members</p>
          </div>
        ))}
      </div>
    </div>
  );
}