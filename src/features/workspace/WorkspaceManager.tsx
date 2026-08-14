// src/features/workspace/WorkspaceManager.tsx
import React, { useState, useEffect } from 'react';
import { supabase, workspaceSupabase } from '../../lib/supabase';
import { Users, Send, Plus, RefreshCw, BookOpen } from 'lucide-react';

export default function WorkspaceManager() {
  const [groups, setGroups] = useState<any[]>([]);
  const [myCourses, setMyCourses] = useState<any[]>([]);
  
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [loading, setLoading] = useState(false);

  // পেজ লোড হওয়ার সময় দুই ডাটাবেস থেকে ডাটা আনা হবে
  useEffect(() => {
    fetchGroups();
    fetchMyCourses();
  }, []);

  // Workspace Database থেকে গ্রুপগুলো আনবে
  const fetchGroups = async () => {
    const { data, error } = await workspaceSupabase.from('study_groups').select('*');
    if (!error && data) setGroups(data);
  };

  // Main OS Database থেকে আপনার তৈরি করা LMS কোর্সগুলো আনবে
  const fetchMyCourses = async () => {
    const { data, error } = await supabase.from('lms_courses').select('*');
    if (!error && data) setMyCourses(data);
  };

  // ১. নতুন গ্রুপ তৈরি করা (Workspace DB তে)
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName) return;
    
    setLoading(true);
    const { error } = await workspaceSupabase.from('study_groups').insert([{ name: newGroupName }]);
    
    if (error) {
      alert('Error creating group: ' + error.message);
    } else {
      setNewGroupName('');
      fetchGroups(); // লিস্ট আপডেট
      alert('✅ Study Group Created Successfully!');
    }
    setLoading(false);
  };

  // ২. দ্য আল্টিমেট ব্রিজ: মেইন ডাটাবেস থেকে কোর্স Workspace-এ পুশ করা
  const handlePushCourse = async () => {
    if (!selectedCourse || !selectedGroup) {
      alert('Please select both a course and a group!');
      return;
    }

    setLoading(true);
    try {
      // ধাপ ১: Main OS থেকে পুরো কোর্সের ডাটা টেনে আনা
      const { data: courseData, error: fetchError } = await supabase
        .from('lms_courses')
        .select('*')
        .eq('id', selectedCourse)
        .single();

      if (fetchError) throw fetchError;

      // ধাপ ২: Workspace DB তে ডাটা পুশ (Push) করা
      const { error: pushError } = await workspaceSupabase
        .from('shared_contents')
        .insert([{
          group_id: selectedGroup,
          title: courseData.title || 'Untitled Course',
          content_type: 'lms_course',
          content_data: courseData // পুরো কোর্সটা JSON হিসেবে সেভ হয়ে গেলো!
        }]);

      if (pushError) throw pushError;

      alert('🚀 Course successfully pushed to Workspace!');
    } catch (error: any) {
      alert('Error pushing course: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="p-8 text-white max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-3 border-b border-gray-700 pb-4">
        <Users className="w-8 h-8 text-blue-500" />
        <h1 className="text-3xl font-bold">Workspace Manager</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* অংশ ১: Create Study Group */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-400" /> Create New Study Group
          </h2>
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <input
              type="text"
              placeholder="e.g. BCS Batch 1"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg w-full font-semibold transition-colors"
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </form>
        </div>

        {/* অংশ ২: Push Content Bridge */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-400" /> Push Course to Workspace
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Select Course (From Main OS)</label>
              <select 
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white"
              >
                <option value="">-- Choose a course --</option>
                {myCourses.map(course => (
                  <option key={course.id} value={course.id}>{course.title || 'Untitled'}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Select Target Group (In Workspace)</label>
              <select 
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white"
              >
                <option value="">-- Choose a group --</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handlePushCourse}
              disabled={loading || !selectedCourse || !selectedGroup}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg w-full font-semibold transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /> 
              {loading ? 'Pushing Data...' : 'Push to Workspace'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}