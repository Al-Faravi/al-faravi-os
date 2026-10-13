import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Bold, Italic, Check, Loader2 } from 'lucide-react';

interface Note {
  id: string;
  content: string;
  bg_color: string;
  created_at?: string;
}

const COLOR_PALETTE = [
  '#FEF3C7', // Warm Yellow
  '#FCE7F3', // Soft Pink
  '#DCFCE7', // Mint Green
  '#E0E7FF', // Indigo Mist
  '#FFEDD5', // Soft Orange
  '#CFFAFE', // Sky Cyan
];

export const StickyNotes: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('dashboard_notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (err) {
      console.error('Error fetching sticky notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const createNote = async (color: string = '#FEF3C7') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newNote = {
        content: '',
        bg_color: color,
        user_id: user.id,
      };

      const { data, error } = await supabase
        .from('dashboard_notes')
        .insert([newNote])
        .select()
        .single();

      if (error) throw error;
      if (data) setNotes([data, ...notes]);
    } catch (err) {
      console.error('Error adding sticky note:', err);
    }
  };

  const updateContent = async (id: string, content: string) => {
    setNotes(notes.map((n) => (n.id === id ? { ...n, content } : n)));
    setSavingId(id);

    try {
      const { error } = await supabase
        .from('dashboard_notes')
        .update({ content })
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating note:', err);
    } finally {
      setTimeout(() => setSavingId(null), 600);
    }
  };

  const updateColor = async (id: string, bg_color: string) => {
    setNotes(notes.map((n) => (n.id === id ? { ...n, bg_color } : n)));
    await supabase.from('dashboard_notes').update({ bg_color }).eq('id', id);
  };

  const deleteNote = async (id: string) => {
    setNotes(notes.filter((n) => n.id !== id));
    await supabase.from('dashboard_notes').delete().eq('id', id);
  };

  const applyFormat = (id: string, format: 'bold' | 'italic') => {
    const el = document.getElementById(`note-body-${id}`);
    if (!el) return;
    document.execCommand(format, false);
    updateContent(id, el.innerHTML);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin text-slate-400" size={24} />
      </div>
    );
  }

  return (
    <div className="my-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Quick Sticky Notes</h2>
          <p className="text-xs text-slate-500 font-medium">Temporary brain-dump & quick reference thoughts</p>
        </div>
        <button
          onClick={() => createNote()}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
        >
          <Plus size={15} /> Add Note
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {notes.map((note) => (
          <div
            key={note.id}
            style={{ backgroundColor: note.bg_color }}
            className="rounded-2xl p-4 shadow-sm border border-black/5 flex flex-col justify-between min-h-[190px] relative transition hover:shadow-md"
          >
            {/* Formatting Toolbar */}
            <div className="flex items-center justify-between gap-1 pb-2 mb-2 border-b border-black/10 text-slate-700">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => applyFormat(note.id, 'bold')}
                  className="p-1 hover:bg-black/10 rounded transition"
                  title="Bold"
                >
                  <Bold size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormat(note.id, 'italic')}
                  className="p-1 hover:bg-black/10 rounded transition"
                  title="Italic"
                >
                  <Italic size={13} />
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                {savingId === note.id ? (
                  <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                    <Check size={11} className="text-emerald-600" /> Saved
                  </span>
                ) : null}
                <button
                  onClick={() => deleteNote(note.id)}
                  className="p-1 text-slate-500 hover:text-rose-600 hover:bg-black/10 rounded transition"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Editable Content Area */}
            <div
              id={`note-body-${note.id}`}
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => updateContent(note.id, e.currentTarget.innerHTML)}
              dangerouslySetInnerHTML={{ __html: note.content }}
              className="text-sm text-slate-800 outline-none flex-grow overflow-y-auto leading-relaxed empty:before:content-['Write_something...'] empty:before:text-slate-400"
            />

            {/* Color Switcher */}
            <div className="flex items-center gap-1.5 pt-3 mt-2 border-t border-black/5">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  style={{ backgroundColor: c }}
                  onClick={() => updateColor(note.id, c)}
                  className={`w-4 h-4 rounded-full border border-black/20 transition ${
                    note.bg_color === c ? 'scale-125 ring-2 ring-black/40' : 'hover:scale-110'
                  }`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};