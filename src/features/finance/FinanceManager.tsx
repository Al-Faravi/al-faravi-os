import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Wallet, TrendingUp, TrendingDown, Plus, Trash2, 
  Loader2, DollarSign, Activity 
} from 'lucide-react';

interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  created_at: string;
}

export default function FinanceManager() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('Food & Dining');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) return;

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('transactions')
        .insert([{
          user_id: user.id,
          title,
          amount: parseFloat(amount),
          type,
          category
        }]);

      if (error) throw error;
      
      await fetchTransactions();
      
      // Reset form
      setShowForm(false);
      setTitle('');
      setAmount('');
      setType('expense');
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Failed to save transaction!');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      setTransactions(transactions.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  // Calculations
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpense;

  return (
    <div className="p-6 md:p-12 max-w-5xl mx-auto text-[#020F33] mb-20">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Wallet className="text-[#02C2D5]" /> Finance Tracker
          </h1>
          <p className="text-[#475569] mt-1">Manage your income & expenses.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          style={{ backgroundColor: '#020F33', color: '#FFFFFF' }}
          className="px-5 py-2.5 rounded-xl font-bold hover:!bg-[#02C2D5] hover:!text-[#020F33] transition-all flex items-center gap-2 shadow-lg"
        >
          <Plus size={18} /> {showForm ? 'Cancel' : 'New Entry'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#020F33] text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={80} /></div>
          <p className="text-[#02C2D5] font-semibold text-sm mb-1 uppercase tracking-wider">Total Balance</p>
          <h2 className="text-4xl font-extrabold">৳ {balance.toLocaleString()}</h2>
        </div>
        <div className="bg-white border border-[#E2E8F0] p-6 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#A3D803]/10 flex items-center justify-center text-[#A3D803]">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[#475569] font-medium text-sm">Total Income</p>
            <h3 className="text-2xl font-bold text-[#020F33]">৳ {totalIncome.toLocaleString()}</h3>
          </div>
        </div>
        <div className="bg-white border border-[#E2E8F0] p-6 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
            <TrendingDown size={24} />
          </div>
          <div>
            <p className="text-[#475569] font-medium text-sm">Total Expense</p>
            <h3 className="text-2xl font-bold text-[#020F33]">৳ {totalExpense.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white border border-[#E2E8F0] p-6 rounded-3xl shadow-sm mb-8 animate-in fade-in slide-in-from-top-4">
          
          <div className="flex gap-2 mb-6 bg-[#F8FAFC] p-1.5 rounded-xl border border-[#E2E8F0] w-fit">
            <button type="button" onClick={() => setType('expense')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${type === 'expense' ? 'bg-[#020F33] text-white shadow' : 'text-[#475569] hover:text-[#020F33]'}`}>
              <TrendingDown size={16} /> Expense
            </button>
            <button type="button" onClick={() => setType('income')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${type === 'income' ? 'bg-[#020F33] text-white shadow' : 'text-[#475569] hover:text-[#020F33]'}`}>
              <TrendingUp size={16} /> Income
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold mb-2">Title / Description</label>
              <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Salary, Groceries" className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#02C2D5]" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Amount (৳)</label>
              <input type="number" required min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#02C2D5]" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#02C2D5]">
                {type === 'expense' ? (
                  <>
                    <option>Food & Dining</option>
                    <option>Transportation</option>
                    <option>Shopping</option>
                    <option>Bills & Utilities</option>
                    <option>Entertainment</option>
                    <option>Other Expense</option>
                  </>
                ) : (
                  <>
                    <option>Salary</option>
                    <option>Freelance / Project</option>
                    <option>Investment Return</option>
                    <option>Other Income</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <button type="submit" disabled={isSaving} style={{ backgroundColor: '#020F33', color: '#FFFFFF' }} className="hover:!bg-[#02C2D5] hover:!text-[#020F33] font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 w-full md:w-auto">
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : 'Save Transaction'}
          </button>
        </form>
      )}

      {/* Transaction List */}
      <div className="bg-white border border-[#E2E8F0] rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center">
          <h3 className="font-bold text-[#020F33] flex items-center gap-2">
            <Activity size={18} className="text-[#02C2D5]" /> Recent History
          </h3>
        </div>
        
        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[#02C2D5]" size={32} /></div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16 text-[#475569]">
            <Wallet size={40} className="mx-auto mb-4 opacity-30 text-[#020F33]" />
            <p className="font-medium">No transactions found. Start tracking!</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E2E8F0]">
            {transactions.map((t) => (
              <div key={t.id} className="p-4 px-6 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors group">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${t.type === 'income' ? 'bg-[#A3D803]/10 text-[#A3D803]' : 'bg-rose-50 text-rose-500'}`}>
                    {t.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                  </div>
                  <div>
                    <h4 className="font-bold text-[#020F33]">{t.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-[#475569] mt-0.5">
                      <span className="font-medium bg-[#E2E8F0] px-2 py-0.5 rounded-md">{t.category}</span>
                      <span>{new Date(t.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className={`font-bold text-lg ${t.type === 'income' ? 'text-[#A3D803]' : 'text-rose-500'}`}>
                    {t.type === 'income' ? '+' : '-'}৳{t.amount.toLocaleString()}
                  </span>
                  <button onClick={() => handleDelete(t.id)} className="p-1.5 text-[#475569] hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}