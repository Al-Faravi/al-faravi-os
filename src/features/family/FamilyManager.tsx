import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Users, Plus, Phone, Droplet, MapPin, 
  Calendar, Gift, Heart, Loader2, Trash2, Search, X
} from 'lucide-react';

interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  phone: string;
  blood_group: string;
  location: string;
}

interface FamilyEvent {
  id: string;
  title: string;
  event_date: string;
  event_type: string;
}

export default function FamilyManager() {
  const [activeTab, setActiveTab] = useState<'directory' | 'events'>('directory');
  const [loading, setLoading] = useState(true);
  
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal States
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [mName, setMName] = useState('');
  const [mRelation, setMRelation] = useState('');
  const [mPhone, setMPhone] = useState('');
  const [mBlood, setMBlood] = useState('');
  const [mLocation, setMLocation] = useState('');

  const [showEventModal, setShowEventModal] = useState(false);
  const [eTitle, setETitle] = useState('');
  const [eDate, setEDate] = useState('');
  const [eType, setEType] = useState('Birthday');
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchFamilyData();
  }, []);

  const fetchFamilyData = async () => {
    setLoading(true);
    try {
      const [membersRes, eventsRes] = await Promise.all([
        supabase.from('family_members').select('*').order('name', { ascending: true }),
        supabase.from('family_events').select('*').order('event_date', { ascending: true })
      ]);
      setMembers(membersRes.data || []);
      setEvents(eventsRes.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('family_members').insert([{
        user_id: user?.id, name: mName, relation: mRelation, phone: mPhone, blood_group: mBlood, location: mLocation
      }]);
      setShowMemberModal(false);
      setMName(''); setMRelation(''); setMPhone(''); setMBlood(''); setMLocation('');
      fetchFamilyData();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('family_events').insert([{
        user_id: user?.id, title: eTitle, event_date: eDate, event_type: eType
      }]);
      setShowEventModal(false);
      setETitle(''); setEDate(''); setEType('Birthday');
      fetchFamilyData();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteMember = async (id: string) => {
    if(!window.confirm('Delete this contact?')) return;
    await supabase.from('family_members').delete().eq('id', id);
    setMembers(members.filter(m => m.id !== id));
  };

  const deleteEvent = async (id: string) => {
    if(!window.confirm('Delete this event?')) return;
    await supabase.from('family_events').delete().eq('id', id);
    setEvents(events.filter(e => e.id !== id));
  };

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.blood_group.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold flex items-center gap-3 tracking-tight">
            <Users className="text-[#02C2D5] w-10 h-10" /> 
            Family Portal
          </h1>
          <p className="text-[#475569] mt-2 font-medium">Digital Hub for Relatives & Cousins.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={() => setShowMemberModal(true)} className="flex-1 md:flex-none bg-[#020F33] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#02C2D5] hover:text-[#020F33] transition-all flex items-center justify-center gap-2 shadow-md">
            <Plus size={18} /> Contact
          </button>
          <button onClick={() => setShowEventModal(true)} className="flex-1 md:flex-none bg-white border border-[#E2E8F0] text-[#020F33] px-5 py-2.5 rounded-xl font-bold hover:border-[#02C2D5] transition-all flex items-center justify-center gap-2 shadow-sm">
            <Calendar size={18} /> Event
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-white p-1.5 rounded-2xl border border-[#E2E8F0] w-fit shadow-sm">
        <button onClick={() => setActiveTab('directory')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'directory' ? 'bg-[#020F33] text-white shadow-md' : 'text-[#475569] hover:text-[#020F33]'}`}><Users size={16} /> Directory</button>
        <button onClick={() => setActiveTab('events')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'events' ? 'bg-[#020F33] text-white shadow-md' : 'text-[#475569] hover:text-[#020F33]'}`}><Calendar size={16} /> Important Dates</button>
      </div>

      {activeTab === 'directory' ? (
        <>
          <div className="mb-6 relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={18} />
            <input type="text" placeholder="Search by name or blood group (e.g. O+)" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#02C2D5] focus:outline-none font-medium" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredMembers.map(member => (
              <div key={member.id} className="bg-white border border-[#E2E8F0] p-6 rounded-3xl shadow-sm hover:shadow-md transition-all group relative">
                <button onClick={() => deleteMember(member.id)} className="absolute top-4 right-4 text-[#CBD5E1] hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                <h3 className="text-xl font-bold text-[#020F33] mb-1">{member.name}</h3>
                <p className="text-xs font-black uppercase tracking-wider text-[#02C2D5] mb-4">{member.relation}</p>
                <div className="space-y-3">
                  {member.phone && <a href={`tel:${member.phone}`} className="flex items-center gap-3 text-sm font-medium text-[#475569] hover:text-[#020F33]"><div className="w-8 h-8 rounded-full bg-[#F8FAFC] flex items-center justify-center text-[#020F33]"><Phone size={14}/></div> {member.phone}</a>}
                  {member.blood_group && <div className="flex items-center gap-3 text-sm font-medium text-[#475569]"><div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500"><Droplet size={14}/></div> Blood: <span className="font-bold text-rose-600">{member.blood_group}</span></div>}
                  {member.location && <div className="flex items-center gap-3 text-sm font-medium text-[#475569]"><div className="w-8 h-8 rounded-full bg-[#F8FAFC] flex items-center justify-center text-[#020F33]"><MapPin size={14}/></div> {member.location}</div>}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {events.map(event => {
            const isBirthday = event.event_type === 'Birthday';
            return (
              <div key={event.id} className="bg-white border border-[#E2E8F0] p-6 rounded-3xl shadow-sm hover:shadow-md transition-all group flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isBirthday ? 'bg-amber-100 text-amber-600' : 'bg-pink-100 text-pink-600'}`}>
                  {isBirthday ? <Gift size={24} /> : <Heart size={24} />}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black uppercase tracking-wider text-[#475569] mb-1">{event.event_type}</p>
                  <h3 className="text-lg font-bold text-[#020F33] leading-tight mb-2">{event.title}</h3>
                  <p className="text-sm font-medium text-[#02C2D5]">{new Date(event.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                <button onClick={() => deleteEvent(event.id)} className="text-[#CBD5E1] hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Member Modal */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-[#020F33]/60 backdrop-blur-sm flex justify-center items-center z-[999] p-4">
          <form onSubmit={handleAddMember} className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Add Family Member</h3>
              <button type="button" onClick={() => setShowMemberModal(false)} className="text-[#475569] hover:text-rose-500"><X size={20}/></button>
            </div>
            <div className="space-y-4 mb-6">
              <input type="text" required value={mName} onChange={e=>setMName(e.target.value)} placeholder="Full Name" className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#02C2D5] outline-none" />
              <input type="text" required value={mRelation} onChange={e=>setMRelation(e.target.value)} placeholder="Relation (e.g. Cousin, Uncle)" className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#02C2D5] outline-none" />
              <div className="grid grid-cols-2 gap-4">
                <input type="tel" value={mPhone} onChange={e=>setMPhone(e.target.value)} placeholder="Phone Number" className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#02C2D5] outline-none" />
                <select value={mBlood} onChange={e=>setMBlood(e.target.value)} className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#02C2D5] outline-none text-[#475569]">
                  <option value="">Blood Group</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <input type="text" value={mLocation} onChange={e=>setMLocation(e.target.value)} placeholder="Location / Address" className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#02C2D5] outline-none" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={()=>setShowMemberModal(false)} className="flex-1 py-3 font-bold text-[#475569] bg-[#F8FAFC] rounded-xl hover:bg-[#E2E8F0]">Cancel</button>
              <button type="submit" disabled={isSaving} className="flex-1 py-3 font-bold text-white bg-[#020F33] rounded-xl hover:bg-[#02C2D5] hover:text-[#020F33] flex justify-center">{isSaving ? <Loader2 className="animate-spin" size={20}/> : 'Save'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Add Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-[#020F33]/60 backdrop-blur-sm flex justify-center items-center z-[999] p-4">
          <form onSubmit={handleAddEvent} className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Add Important Date</h3>
              <button type="button" onClick={() => setShowEventModal(false)} className="text-[#475569] hover:text-rose-500"><X size={20}/></button>
            </div>
            <div className="space-y-4 mb-6">
              <input type="text" required value={eTitle} onChange={e=>setETitle(e.target.value)} placeholder="Event Title (e.g. Sajjad's Birthday)" className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#02C2D5] outline-none" />
              <input type="date" required value={eDate} onChange={e=>setEDate(e.target.value)} className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#02C2D5] outline-none text-[#475569]" />
              <select value={eType} onChange={e=>setEType(e.target.value)} className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#02C2D5] outline-none text-[#475569]">
                <option value="Birthday">Birthday</option>
                <option value="Anniversary">Anniversary</option>
                <option value="Memorial">Memorial</option>
                <option value="Other">Other Event</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={()=>setShowEventModal(false)} className="flex-1 py-3 font-bold text-[#475569] bg-[#F8FAFC] rounded-xl hover:bg-[#E2E8F0]">Cancel</button>
              <button type="submit" disabled={isSaving} className="flex-1 py-3 font-bold text-white bg-[#020F33] rounded-xl hover:bg-[#02C2D5] hover:text-[#020F33] flex justify-center">{isSaving ? <Loader2 className="animate-spin" size={20}/> : 'Save'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}