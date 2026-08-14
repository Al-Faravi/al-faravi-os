// src/features/workspace/WorkspaceDashboard.tsx
import React, { useState, useEffect } from 'react';
import { workspaceSupabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { BookOpen, LogOut, Folder, FileText, Plus } from 'lucide-react';

export default function WorkspaceDashboard() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [contents, setContents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // নতুন নোট অ্যাড করার স্টেট
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  useEffect(() => {
    fetchMyGroups();
  }, []);

  const fetchMyGroups = async () => {
    setLoading(true);
    // 🛡️ RLS Magic: ইউজার শুধু তার নিজের গ্রুপগুলোই পাবে!
    const { data, error } = await workspaceSupabase.from('study_groups').select('*');
    
    if (data && data.length > 0) {
      setGroups(data);
      setSelectedGroup(data[0]); 
      fetchContents(data[0].id);
    }
    setLoading(false);
  };

  const fetchContents = async (groupId: string) => {
    const { data } = await workspaceSupabase
      .from('shared_contents')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });
    if (data) setContents(data);
  };

  const handleGroupClick = (group: any) => {
    setSelectedGroup(group);
    setShowNoteForm(false);
    fetchContents(group.id);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle || !noteContent || !selectedGroup) return;

    // বন্ধুরা গ্রুপের ভেতরে নিজেদের নোট পুশ করছে (CRUD)
    const { error } = await workspaceSupabase.from('shared_contents').insert([{
      group_id: selectedGroup.id,
      title: noteTitle,
      content_type: 'shared_note',
      content_data: { text: noteContent }
    }]);

    if (!error) {
      setNoteTitle('');
      setNoteContent('');
      setShowNoteForm(false);
      fetchContents(selectedGroup.id); // রিফ্রেশ লিস্ট
    } else {
      alert('Error saving note: ' + error.message);
    }
  };

  const handleLogout = async () => {
    await workspaceSupabase.auth.signOut();
    navigate('/workspace/login');
  };

  if (loading) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading your workspace...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col md:flex-row">
      
      {/* Sidebar: Group List */}
      <div className="w-full md:w-64 bg-gray-800 border-r border-gray-700 p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-8 text-blue-500 font-bold text-xl">
          <BookOpen />
          <span>Study Portal</span>
        </div>
        
        <div className="flex-1 space-y-2">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">My Groups</p>
          {groups.length === 0 ? (
            <p className="text-sm text-gray-500">No groups assigned yet.</p>
          ) : (
            groups.map(group => (
              <button
                key={group.id}
                onClick={() => handleGroupClick(group)}
                className={`w-full text-left flex items-center gap-2 p-3 rounded-lg transition-colors ${selectedGroup?.id === group.id ? 'bg-blue-600 text-white' : 'hover:bg-gray-700 text-gray-300'}`}
              >
                <Folder className="w-4 h-4" />
                <span className="truncate">{group.name}</span>
              </button>
            ))
          )}
        </div>

        <button onClick={handleLogout} className="mt-4 flex items-center gap-2 text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-colors">
          <LogOut className="w-5 h-5" /> Logout
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8">
        {selectedGroup ? (
          <>
            <div className="flex justify-between items-end border-b border-gray-700 pb-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold">{selectedGroup.name}</h1>
                <p className="text-gray-400 mt-1">Study materials & collaborative notes</p>
              </div>
              <button 
                onClick={() => setShowNoteForm(!showNoteForm)}
                className="bg-gray-800 border border-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> {showNoteForm ? 'Cancel' : 'Add Note'}
              </button>
            </div>

            {/* Note Creation Form (বন্ধুদের CRUD) */}
            {showNoteForm && (
              <form onSubmit={handleAddNote} className="bg-gray-800 p-6 rounded-xl border border-gray-700 mb-8 space-y-4">
                <h3 className="text-lg font-semibold text-blue-400 mb-2">Share a Note with Group</h3>
                <input type="text" placeholder="Note Title" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white" required />
                <textarea placeholder="Write your content here..." value={noteContent} onChange={(e) => setNoteContent(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white h-32" required />
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-bold">Save Note</button>
              </form>
            )}

            {/* Shared Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {contents.length === 0 ? (
                <div className="col-span-full p-8 text-center bg-gray-800 rounded-xl border border-gray-700 border-dashed">
                  <p className="text-gray-400">No courses or notes have been uploaded to this group yet.</p>
                </div>
              ) : (
                contents.map(item => (
                  <div key={item.id} className="bg-gray-800 p-5 rounded-xl border border-gray-700 hover:border-blue-500 transition-all cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className={`p-3 rounded-lg ${item.content_type === 'lms_course' ? 'bg-green-500/20' : 'bg-blue-500/20'}`}>
                        <FileText className={`w-6 h-6 ${item.content_type === 'lms_course' ? 'text-green-400' : 'text-blue-400'}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{item.title}</h3>
                        <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300 mt-2 inline-block">
                          {item.content_type === 'lms_course' ? 'Course Module' : 'Group Note'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a group from the sidebar to view materials.
          </div>
        )}
      </div>
    </div>
  );
}