import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getCrossDevicePin } from '../../lib/security';
import { 
  Wallet, TrendingUp, TrendingDown, Plus, Minus, 
  LockKeyhole, Lock, Loader2, Calendar, Trash2, 
  ArrowRightLeft, CheckCircle2, FileText, BarChart3, PieChart as PieIcon
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note: string;
  date: string;
  created_at: string;
}

const COLORS = ['#02C2D5', '#9333ea', '#10b981', '#f59e0b', '#f43f5e', '#6366f1', '#ec4899'];

export default function FinanceManager() {
  const [isCheckingPin, setIsCheckingPin] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [savedPin, setSavedPin] = useState<string | null>(null);
  const [pinError, setPinError] = useState('');

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'transactions' | 'analytics'>('transactions');

  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    checkPinSetup();
  }, []);

  const checkPinSetup = async () => {
    try {
      const pin = await getCrossDevicePin();
      setSavedPin(pin);
    } catch (error) {
      console.error("Error fetching PIN", error);
    } finally {
      setIsCheckingPin(false);
    }
  };

  useEffect(() => {
    if (isUnlocked) fetchTransactions();
  }, [isUnlocked]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    if (pinInput === savedPin) {
      setIsUnlocked(true);
    } else {
      setPinError('Incorrect PIN!');
      setPinInput('');
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('finance_transactions')
        .select('*')
        .eq('user_id', user?.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category || isNaN(Number(amount))) return;

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('finance_transactions').insert([{
        user_id: user?.id,
        type: formType,
        amount: Number(amount),
        category,
        note,
        date
      }]).select().single();

      if (error) throw error;
      setTransactions([data, ...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setShowForm(false);
      setAmount(''); setCategory(''); setNote('');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this transaction?")) return;
    try {
      await supabase.from('finance_transactions').delete().eq('id', id);
      setTransactions(transactions.filter(t => t.id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpense;

  // Prepare Data for Charts (Category wise expense)
  const expenseByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc: any, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {});

  const pieChartData = Object.keys(expenseByCategory).map(cat => ({
    name: cat,
    value: expenseByCategory[cat]
  }));

  const categories = formType === 'income' 
    ? ['Salary', 'Freelance', 'Business', 'Gift', 'Other']
    : ['Food', 'Transport', 'Rent/Bills', 'Shopping', 'Learning', 'Entertainment', 'Health', 'Other'];

  if (isCheckingPin) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>;
  }

  if (!isUnlocked) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-white border border-[#E2E8F0] p-8 md:p-10 rounded-3xl shadow-xl w-full max-w-md text-center">
          <div className="w-20 h-20 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <LockKeyhole size={36} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#020F33] mb-2">Secure Finance</h2>
          <p className="text-sm text-[#475569] mb-8">Enter your OS PIN to unlock your wallet.</p>
          
          <form onSubmit={handlePinSubmit} className="space-y-6">
            <input 
              type="password" 
              maxLength={6}
              inputMode="numeric"
              autoFocus
              value={pinInput}
              onChange={e => setPinInput(e.target.value)}
              placeholder="****"
              className="w-full text-center text-3xl tracking-[1em] font-black bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl py-4 focus:ring-2 focus:ring-[#02C2D5] focus:outline-none"
            />
            {pinError && <p className="text-rose-500 text-xs font-bold mt-2 animate-bounce">{pinError}</p>}
            <button type="submit" className="w-full bg-[#020F33] hover:bg-[#02C2D5] text-white hover:text-[#020F33] py-4 rounded-xl font-bold text-lg transition-colors shadow-md">
              Unlock Wallet
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto text-[#020F33] mb-24 md:mb-10 min-h-screen">
      
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8 bg-white p-5 rounded-3xl border border-[#E2E8F0] shadow-sm">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#020F33] flex items-center gap-3">
            <Wallet className="text-[#02C2D5]" size={28} /> Finance Tracker
          </h1>
          <p className="text-[#475569] font-medium mt-1 text-xs md:text-sm">Manage expenses and analyze your financial flow.</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0] flex-1 md:flex-none">
            <button onClick={() => setActiveTab('transactions')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'transactions' ? 'bg-[#020F33] text-white shadow' : 'text-[#475569]'}`}>Transactions</button>
            <button onClick={() => setActiveTab('analytics')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'analytics' ? 'bg-[#020F33] text-white shadow' : 'text-[#475569]'}`}>Analytics</button>
          </div>
          <button onClick={() => setIsUnlocked(false)} className="p-3 bg-white border border-[#E2E8F0] text-[#475569] hover:bg-rose-50 hover:text-rose-600 rounded-xl font-bold transition-all shadow-sm">
            <Lock size={18} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#020F33] p-6 rounded-3xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#02C2D5] opacity-20 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <p className="text-[#94A3B8] text-sm font-bold uppercase tracking-wider mb-2 relative z-10">Total Balance</p>
          <h2 className={`text-4xl font-black relative z-10 ${balance < 0 ? 'text-rose-400' : 'text-white'}`}>
            ৳ {balance.toLocaleString('en-IN')}
          </h2>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-6 rounded-3xl shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[#475569] text-sm font-bold uppercase tracking-wider">Total Income</p>
            <div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg"><TrendingUp size={16}/></div>
          </div>
          <h2 className="text-2xl font-black text-[#020F33]">৳ {totalIncome.toLocaleString('en-IN')}</h2>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-6 rounded-3xl shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[#475569] text-sm font-bold uppercase tracking-wider">Total Expense</p>
            <div className="p-2 bg-rose-50 text-rose-500 rounded-lg"><TrendingDown size={16}/></div>
          </div>
          <h2 className="text-2xl font-black text-[#020F33]">৳ {totalExpense.toLocaleString('en-IN')}</h2>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 mb-8">
        <button onClick={() => { setFormType('income'); setShowForm(true); }} className="flex-1 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-500 hover:text-white py-3.5 rounded-2xl font-bold transition-all flex justify-center items-center gap-2 shadow-sm">
          <Plus size={18} /> Add Income
        </button>
        <button onClick={() => { setFormType('expense'); setShowForm(true); }} className="flex-1 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-500 hover:text-white py-3.5 rounded-2xl font-bold transition-all flex justify-center items-center gap-2 shadow-sm">
          <Minus size={18} /> Add Expense
        </button>
      </div>

      {/* TAB 1: TRANSACTIONS LIST */}
      {activeTab === 'transactions' && (
        <div className="bg-white border border-[#E2E8F0] rounded-3xl shadow-sm overflow-hidden">
          <div className="p-5 md:p-6 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
            <h3 className="text-lg font-bold flex items-center gap-2 text-[#020F33]"><ArrowRightLeft size={18} className="text-[#02C2D5]"/> Recent Transactions</h3>
          </div>
          
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[#02C2D5]" size={32} /></div>
          ) : transactions.length === 0 ? (
            <div className="text-center p-12 text-[#475569]">
              <CheckCircle2 size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="font-bold">No transactions yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {transactions.map(t => (
                <div key={t.id} className="p-4 md:p-5 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center shrink-0 border ${t.type === 'income' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 'bg-rose-50 text-rose-500 border-rose-100'}`}>
                      {t.type === 'income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-[#020F33] text-sm md:text-base truncate">{t.category}</h4>
                      <p className="text-[10px] md:text-xs font-medium text-[#475569] truncate flex items-center gap-1 mt-0.5">
                        <Calendar size={10}/> {new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {t.note && <><span className="mx-1">•</span> <FileText size={10}/> {t.note}</>}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 md:gap-4 shrink-0 pl-2">
                    <span className={`font-black text-sm md:text-lg ${t.type === 'income' ? 'text-emerald-600' : 'text-[#020F33]'}`}>
                      {t.type === 'income' ? '+' : '-'} ৳{t.amount.toLocaleString('en-IN')}
                    </span>
                    <button onClick={() => handleDelete(t.id)} className="text-[#CBD5E1] hover:text-rose-500 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all bg-white shadow-sm border border-[#E2E8F0]">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ANALYTICS CHARTS */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expense by Category Pie Chart */}
          <div className="bg-white border border-[#E2E8F0] p-6 rounded-3xl shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <PieIcon className="text-[#02C2D5]" size={20} /> Expense Distribution
            </h3>
            {pieChartData.length === 0 ? (
              <p className="text-center text-slate-400 py-20 font-bold">No expense data available for charts.</p>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                      {pieChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `৳ ${Number(value).toLocaleString('en-IN')}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Bar Chart Overview */}
          <div className="bg-white border border-[#E2E8F0] p-6 rounded-3xl shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <BarChart3 className="text-purple-600" size={20} /> Financial Summary
            </h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Income', amount: totalIncome },
                  { name: 'Expense', amount: totalExpense },
                  { name: 'Balance', amount: balance }
                ]}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => `৳ ${Number(value).toLocaleString('en-IN')}`} />
                  <Bar dataKey="amount" fill="#02C2D5" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-[#020F33]/60 backdrop-blur-sm flex justify-center items-end md:items-center z-[999] p-0 md:p-4 pb-20 md:pb-4">
          <form onSubmit={handleSave} className="bg-white p-6 md:p-8 rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-md animate-in slide-in-from-bottom-full md:zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className={`text-xl font-bold flex items-center gap-2 ${formType === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formType === 'income' ? <TrendingUp size={24}/> : <TrendingDown size={24}/>} 
                Add {formType === 'income' ? 'Income' : 'Expense'}
              </h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-[#475569] bg-slate-50 p-2 rounded-full hover:bg-slate-200"><Minus size={18}/></button>
            </div>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-xs font-bold text-[#475569] mb-1.5 ml-1">Amount (৳)</label>
                <input type="number" required autoFocus value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3.5 text-lg font-black focus:ring-2 focus:ring-[#02C2D5] focus:outline-none" />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#475569] mb-1.5 ml-1">Category</label>
                  <select required value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-3 text-sm font-bold focus:ring-2 focus:ring-[#02C2D5] focus:outline-none">
                    <option value="">Select...</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#475569] mb-1.5 ml-1">Date</label>
                  <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-3 text-sm font-bold focus:ring-2 focus:ring-[#02C2D5] focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#475569] mb-1.5 ml-1">Note (Optional)</label>
                <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="What was this for?" className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#02C2D5] focus:outline-none font-medium" />
              </div>
            </div>

            <button type="submit" disabled={isSaving} className={`w-full text-white py-4 rounded-xl font-bold flex justify-center items-center gap-2 shadow-md transition-colors ${formType === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
              {isSaving ? <Loader2 size={18} className="animate-spin"/> : 'Save Transaction'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}