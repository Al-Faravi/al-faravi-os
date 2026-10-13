import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, Plus, Trash2, ExternalLink, FileText, 
  Video, Code, Loader2, BookOpen, GripVertical, CheckCircle2, Circle 
} from 'lucide-react';

// ১. @dnd-kit ইমপোর্টসমূহ
import { 
  DndContext, closestCenter, 
  PointerSensor, useSensor, useSensors 
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { SortableItem } from '../../components/ui/SortableItem';

interface Resource {
  id: string;
  chapter_id: string;
  title: string;
  url: string;
  type: string;
  order_index?: number;
}

export default function BcsWorkspace() {
  const { chapterId } = useParams<{ chapterId: string }>();

  // মাউস/টাচ সেন্সর (৮ পিক্সেল টানলে ড্র্যাগ শুরু হবে)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<Resource[]>([]);
  const [showForm, setShowForm] = useState(false);
  
  // নতুন রিসোর্স ফর্ম স্টেট
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState('Doc');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (chapterId) {
      fetchResources();
    }
  }, [chapterId]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bcs_resources')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setResources(data || []);
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoading(false);
    }
  };

  // ২. Drag & Drop হ্যান্ডলার (রিসোর্স রিঅর্ডার ও Supabase আপডেট)
  const handleResourceDragEnd = async (event: any) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setResources((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);

        // Supabase-এ bcs_resources টেবিলের order_index আপডেট করা
        const updates = newItems.map((item, index) => ({
          id: item.id,
          title: item.title,
          url: item.url,
          type: item.type,
          chapter_id: item.chapter_id,
          order_index: index,
        }));

        supabase.from('bcs_resources').upsert(updates).then(({ error }) => {
          if (error) console.error("BCS Resource Reorder Error:", error);
        });

        return newItems;
      });
    }
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !url) return;
    setIsSaving(true);

    try {
      const { data, error } = await supabase.from('bcs_resources').insert([{
        chapter_id: chapterId,
        title,
        url,
        type,
        order_index: resources.length
      }]).select().single();

      if (error) throw error;
      if (data) setResources([...resources, data]);

      setTitle('');
      setUrl('');
      setShowForm(false);
    } catch (error) {
      console.error('Error adding resource:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!window.confirm('Delete this resource?')) return;
    try {
      await supabase.from('bcs_resources').delete().eq('id', id);
      setResources(resources.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting resource:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#02C2D5]" size={40} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto text-[#020F33] mb-28">
      {/* Header */}
      <div className="mb-8">
        <Link to="/bcs" className="inline-flex items-center gap-2 text-sm font-bold text-[#475569] hover:text-[#020F33] transition-colors mb-4">
          <ArrowLeft size={16} /> Back to BCS Mission Control
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black">Chapter Resources & Study Materials</h1>
            <p className="text-[#475569] mt-1 font-medium text-sm">Organize notes, video links, and reference materials.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-[#020F33] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#02C2D5] hover:text-[#020F33] transition-all flex items-center gap-2 shadow-md"
          >
            <Plus size={18} /> {showForm ? 'Cancel' : 'Add Resource'}
          </button>
        </div>
      </div>

      {/* Add Resource Form */}
      {showForm && (
        <form onSubmit={handleAddResource} className="bg-white border border-[#E2E8F0] p-6 rounded-3xl shadow-lg mb-8">
          <h3 className="text-lg font-bold mb-4">Add New Study Material</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-bold text-[#475569] mb-1">Title</label>
              <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Important PDF Note" className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#02C2D5]" />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#475569] mb-1">URL / Link</label>
              <input type="url" required value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#02C2D5]" />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#475569] mb-1">Type</label>
              <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#02C2D5]">
                <option value="Doc">Doc / PDF</option>
                <option value="Video">Video</option>
                <option value="Github">Github / Code</option>
                <option value="Link">External Link</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={isSaving} className="bg-[#020F33] hover:bg-[#02C2D5] text-white hover:text-[#020F33] font-bold py-2.5 px-6 rounded-xl transition-all text-sm flex items-center gap-2">
            {isSaving ? <Loader2 className="animate-spin" size={16} /> : 'Save Resource'}
          </button>
        </form>
      )}

      {/* ۳. DndContext এবং SortableContext দিয়ে রিসোর্স লিস্ট রেন্ডার */}
      {resources.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-[#E2E8F0]">
          <BookOpen size={40} className="mx-auto mb-3 text-[#475569] opacity-30" />
          <p className="text-[#475569] font-bold">No resources added yet.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleResourceDragEnd}>
          <SortableContext items={resources.map(r => r.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {resources.map((resource) => (
                <SortableItem key={resource.id} id={resource.id}>
                  <div className="flex items-center justify-between p-4 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm hover:border-[#02C2D5] transition-all group">
                    <div className="flex items-center gap-3">
                      <span className="cursor-grab active:cursor-grabbing text-slate-300 group-hover:text-slate-500 p-1">
                        <GripVertical size={18} />
                      </span>
                      <div>
                        <h4 className="font-bold text-[#020F33] text-sm md:text-base">{resource.title}</h4>
                        <span className="text-xs text-[#475569] uppercase tracking-wider font-semibold">{resource.type}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={resource.url} target="_blank" rel="noreferrer" className="p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#020F33] hover:text-[#02C2D5] transition-colors">
                        <ExternalLink size={16} />
                      </a>
                      <button onClick={() => handleDeleteResource(resource.id)} className="p-2 text-[#475569] hover:text-rose-500 hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}