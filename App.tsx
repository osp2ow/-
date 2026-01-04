
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Calendar, User, MessageSquare, Clock, CreditCard, ShoppingCart, 
  Plus, Trash2, CheckCircle2, Circle, AlertCircle, TrendingUp,
  Sparkles, CheckSquare, Square, History, ChevronDown, Edit2, Save, X, Search, SearchX
} from 'lucide-react';
import { DailyReport, StateData, Consultation, Reservation, Expense, Payment, TodoItem, PaymentMethod, PersistentWrapper } from './types';
import { getManagerForDate, formatDate, getDayOfWeek, formatCurrency, getTimeSlots, formatNumberWithCommas, parseFormattedNumber, formatPhoneNumber } from './constants';
import SectionCard from './components/SectionCard';

const App: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  
  // 수정 모드 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  // 신규 입력을 위한 임시 날짜 상태 (UI 반영용)
  const [newResDate, setNewResDate] = useState<string>('');
  const [newFirstDate, setNewFirstDate] = useState<string>('');

  // 검색 쿼리 상태 (5개 섹션)
  const [searchQueries, setSearchQueries] = useState({
    consultation: '',
    reservation: '',
    firstLesson: '',
    payment: '',
    expense: ''
  });

  const [data, setData] = useState<StateData>(() => {
    const saved = localStorage.getItem('juniper_academy_v4');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          days: parsed.days || {},
          masterConsultations: parsed.masterConsultations || [],
          masterReservations: parsed.masterReservations || [],
          masterFirstLessons: parsed.masterFirstLessons || [],
          masterFixedNotices: parsed.masterFixedNotices || [],
          masterNewNotices: parsed.masterNewNotices || [],
          masterShoppingList: parsed.masterShoppingList || []
        };
      } catch (e) {
        console.error("복구 실패:", e);
      }
    }
    return { 
      days: {}, 
      masterConsultations: [], 
      masterReservations: [], 
      masterFirstLessons: [],
      masterFixedNotices: [],
      masterNewNotices: [],
      masterShoppingList: []
    };
  });

  useEffect(() => {
    localStorage.setItem('juniper_academy_v4', JSON.stringify(data));
  }, [data]);

  const getActiveNotice = (list: PersistentWrapper<string>[], date: string) => {
    const valid = list.filter(n => n.createdAt <= date && (n.deletedAt === null || n.deletedAt > date));
    if (valid.length === 0) return '';
    return [...valid].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0].data;
  };

  const currentReport = useMemo(() => {
    const dayData = (data.days[selectedDate] || {}) as any;
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    
    const filterPersistent = (list: PersistentWrapper<any>[]) => 
      list.filter(item => item.createdAt <= selectedDate && (item.deletedAt === null || item.deletedAt > selectedDate))
          .map(item => ({ ...item.data, createdAt: item.createdAt }));

    return {
      date: selectedDate,
      manager: dayData.manager || getManagerForDate(dateObj),
      consultations: filterPersistent(data.masterConsultations),
      reservations: filterPersistent(data.masterReservations),
      firstLessons: filterPersistent(data.masterFirstLessons),
      expenses: dayData.expenses || [],
      fixedNotice: getActiveNotice(data.masterFixedNotices, selectedDate),
      newNotice: getActiveNotice(data.masterNewNotices, selectedDate),
      shoppingList: filterPersistent(data.masterShoppingList),
      payments: dayData.payments || []
    };
  }, [data, selectedDate]);

  // --- 전역 검색 로직 ---
  const filterByQuery = (list: any[], query: string) => {
    if (!query.trim()) return list;
    const q = query.toLowerCase().replace(/-/g, '');
    return list.filter(item => {
      const name = (item.name || '').toLowerCase();
      const phone = (item.phone || '').replace(/-/g, '');
      const content = (item.content || '').toLowerCase();
      const part = (item.part || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();
      
      return name.includes(q) || 
             phone.includes(q) || 
             content.includes(q) || 
             part.includes(q) || 
             desc.includes(q);
    });
  };

  const searchedConsultations = useMemo(() => {
    if (!searchQueries.consultation) return currentReport.consultations;
    const all = data.masterConsultations.map(cw => ({ ...cw.data, date: cw.createdAt }));
    return filterByQuery(all, searchQueries.consultation);
  }, [data.masterConsultations, searchQueries.consultation, currentReport.consultations]);

  const searchedReservations = useMemo(() => {
    if (!searchQueries.reservation) return currentReport.reservations;
    const all = data.masterReservations.map(rw => ({ ...rw.data, createdAt: rw.createdAt }));
    return filterByQuery(all, searchQueries.reservation);
  }, [data.masterReservations, searchQueries.reservation, currentReport.reservations]);

  const searchedFirstLessons = useMemo(() => {
    if (!searchQueries.firstLesson) return currentReport.firstLessons;
    const all = data.masterFirstLessons.map(fw => ({ ...fw.data, createdAt: fw.createdAt }));
    return filterByQuery(all, searchQueries.firstLesson);
  }, [data.masterFirstLessons, searchQueries.firstLesson, currentReport.firstLessons]);

  const searchedPayments = useMemo(() => {
    if (!searchQueries.payment) return currentReport.payments;
    const results: Payment[] = [];
    Object.entries(data.days).forEach(([date, dayData]: [string, any]) => {
      if (dayData.payments) {
        dayData.payments.forEach((p: Payment) => results.push({ ...p, date }));
      }
    });
    return filterByQuery(results, searchQueries.payment).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [data.days, searchQueries.payment, currentReport.payments]);

  const searchedExpenses = useMemo(() => {
    if (!searchQueries.expense) return currentReport.expenses;
    const results: Expense[] = [];
    Object.entries(data.days).forEach(([date, dayData]: [string, any]) => {
      if (dayData.expenses) {
        dayData.expenses.forEach((e: Expense) => results.push({ ...e, date }));
      }
    });
    return filterByQuery(results, searchQueries.expense).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [data.days, searchQueries.expense, currentReport.expenses]);

  const updateDayData = useCallback((updates: any) => {
    setData(prev => ({ ...prev, days: { ...prev.days, [selectedDate]: { ...(prev.days[selectedDate] || {}), ...updates } } }));
  }, [selectedDate]);

  const handleNoticeChange = (key: 'masterFixedNotices' | 'masterNewNotices', value: string) => {
    setData(prev => {
      const newList = [...prev[key]];
      const existingIdx = newList.findIndex(n => n.createdAt === selectedDate);
      if (existingIdx > -1) {
        newList[existingIdx] = { ...newList[existingIdx], data: value, deletedAt: null };
      } else {
        newList.push({ data: value, createdAt: selectedDate, deletedAt: null });
      }
      return { ...prev, [key]: newList };
    });
  };

  const handleNoticeDelete = (key: 'masterFixedNotices' | 'masterNewNotices') => {
    setData(prev => ({
      ...prev,
      [key]: prev[key].map(n => n.createdAt <= selectedDate && (n.deletedAt === null || n.deletedAt > selectedDate) 
        ? { ...n, deletedAt: selectedDate } 
        : n
      )
    }));
  };

  const addPersistentItem = (key: 'masterConsultations' | 'masterReservations' | 'masterFirstLessons' | 'masterShoppingList', item: any) => {
    const finalItem = key === 'masterFirstLessons' ? { ...item, isPaid: false, isFormSubmitted: false } : item;
    setData(prev => ({ ...prev, [key]: [...prev[key], { data: finalItem, createdAt: selectedDate, deletedAt: null }] }));
  };

  const deletePersistentItem = (key: 'masterConsultations' | 'masterReservations' | 'masterFirstLessons' | 'masterShoppingList', id: string) => {
    setData(prev => ({ ...prev, [key]: prev[key].map(item => (item.data as any).id === id ? { ...item, deletedAt: selectedDate } : item) }));
  };

  const togglePersistentCheck = (key: 'masterFirstLessons' | 'masterShoppingList', id: string, field: string) => {
    setData(prev => ({ 
      ...prev, 
      [key]: prev[key].map(item => 
        (item.data as any).id === id ? { ...item, data: { ...item.data, [field]: !(item.data as any)[field] } } : item
      ) 
    }));
  };

  const startEditing = (item: any) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const savePersistentEdit = (key: 'masterConsultations' | 'masterReservations' | 'masterFirstLessons') => {
    if (!editForm) return;
    setData(prev => ({
      ...prev,
      [key]: prev[key].map(item => item.data.id === editForm.id ? { ...item, data: { ...editForm } } : item)
    }));
    cancelEditing();
  };

  const savePaymentEdit = () => {
    if (!editForm) return;
    const targetDate = editForm.date || selectedDate;
    const dayData = (data.days[targetDate] || {}) as any;
    const updated = (dayData.payments || []).map((p: any) => p.id === editForm.id ? { ...editForm } : p);
    
    setData(prev => ({
      ...prev,
      days: { ...prev.days, [targetDate]: { ...dayData, payments: updated } }
    }));
    cancelEditing();
  };

  const inputBaseClass = "text-sm p-2 border border-slate-300 rounded bg-white text-slate-900 focus:ring-2 focus:ring-blue-200 outline-none w-full transition-all";

  const renderSearchInput = (key: keyof typeof searchQueries) => (
    <div className="relative flex items-center w-full no-print">
      <Search size={14} className="absolute left-3 text-slate-400" />
      <input 
        type="text" 
        placeholder="전체 검색..." 
        className="w-full pl-9 pr-3 py-1.5 text-[11px] text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none"
        value={searchQueries[key]}
        onChange={(e) => setSearchQueries(prev => ({ ...prev, [key]: e.target.value }))}
      />
      {searchQueries[key] && (
        <button onClick={() => setSearchQueries(prev => ({ ...prev, [key]: '' }))} className="absolute right-2 text-slate-300 hover:text-slate-500">
          <X size={12} />
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-4 shadow-sm no-print">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">J</div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">주니퍼실용음악학원</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Daily Operations Management</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-white border-2 border-slate-200 rounded-2xl px-5 py-2 shadow-sm relative h-[64px] min-w-[200px]">
                <Calendar className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase leading-none mb-1">날짜 선택</span>
                  <div className="flex items-center text-base font-black text-slate-800">
                    <span>{selectedDate}</span>
                    <span className="mx-2 text-slate-200">|</span>
                    <span className="text-blue-600">{getDayOfWeek(selectedDate)}요일</span>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 absolute right-4 pointer-events-none opacity-30" />
                <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)} 
                  className="header-date-picker-input absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
                />
            </div>

            <div className="flex items-center bg-white border-2 border-slate-200 rounded-2xl px-5 py-2 shadow-sm relative h-[64px] min-w-[160px]">
                <User className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase leading-none mb-1">오늘의 담당자</span>
                  <select 
                    value={currentReport.manager} 
                    onChange={(e) => updateDayData({ manager: e.target.value })} 
                    className="bg-transparent border-none focus:outline-none text-base font-black text-slate-800 appearance-none cursor-pointer pr-6"
                  >
                    <option value="오세혁">오세혁</option>
                    <option value="한인성">한인성</option>
                    <option value="담당자 없음">담당자 없음</option>
                  </select>
                </div>
                <ChevronDown className="w-4 h-4 absolute right-4 pointer-events-none opacity-30" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
            {/* 상담 내역 */}
            <SectionCard title="상담 내역" icon={<MessageSquare />} headerAction={renderSearchInput('consultation')}>
              <div className="space-y-4">
                {searchedConsultations.map((c: any) => (
                  <div key={c.id} className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm hover:border-blue-300 transition-colors">
                    {editingId === c.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <input className={inputBaseClass} value={editForm.name} onChange={(e)=>setEditForm({...editForm, name: e.target.value})} placeholder="이름" />
                          <input className={inputBaseClass} value={editForm.phone} onChange={(e)=>setEditForm({...editForm, phone: formatPhoneNumber(e.target.value)})} placeholder="전화번호" />
                        </div>
                        <input className={inputBaseClass} value={editForm.part} onChange={(e)=>setEditForm({...editForm, part: e.target.value})} placeholder="파트" />
                        <textarea className={`${inputBaseClass} h-24`} value={editForm.content} onChange={(e)=>setEditForm({...editForm, content: e.target.value})} placeholder="상담 내용" />
                        <div className="flex gap-2">
                          <button onClick={() => savePersistentEdit('masterConsultations')} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-1"><Save size={16}/>저장</button>
                          <button onClick={cancelEditing} className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg font-bold flex items-center justify-center gap-1"><X size={16}/>취소</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-slate-900 text-lg">{c.name}</span>
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-bold">{c.part}</span>
                            {searchQueries.consultation && c.date && (
                              <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full font-bold ml-2">{c.date}</span>
                            )}
                          </div>
                          <div className="text-sm text-slate-500 font-medium mb-3">{c.phone}</div>
                          <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">{c.content}</p>
                        </div>
                        <div className="flex flex-col gap-3 ml-4 no-print">
                          <button onClick={() => startEditing(c)} className="text-slate-300 hover:text-blue-500 transition-colors"><Edit2 size={18} /></button>
                          <button onClick={() => deletePersistentItem('masterConsultations', c.id)} className="text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {!searchQueries.consultation && (
                  <div className="no-print pt-6 border-t border-slate-100">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3">
                      <div className="md:col-span-2"><input id="c-name" placeholder="이름" className={inputBaseClass} /></div>
                      <div className="md:col-span-3"><input id="c-phone" placeholder="전화번호" className={inputBaseClass} onInput={(e)=>e.currentTarget.value = formatPhoneNumber(e.currentTarget.value)} /></div>
                      <div className="md:col-span-2"><input id="c-part" placeholder="파트" className={inputBaseClass} /></div>
                      <div className="md:col-span-5"><input id="c-content" placeholder="상담 내용" className={inputBaseClass} /></div>
                    </div>
                    <button onClick={() => {
                      const name = (document.getElementById('c-name') as HTMLInputElement).value;
                      const phone = (document.getElementById('c-phone') as HTMLInputElement).value;
                      const part = (document.getElementById('c-part') as HTMLInputElement).value;
                      const content = (document.getElementById('c-content') as HTMLInputElement).value;
                      if (name) { addPersistentItem('masterConsultations', { id: Date.now().toString(), name, phone, part, content }); ['c-name', 'c-phone', 'c-part', 'c-content'].forEach(id => (document.getElementById(id) as HTMLInputElement).value = ''); }
                    }} className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white py-3 rounded-xl font-bold shadow-md">
                      <Plus size={20} /> 상담 내역 추가
                    </button>
                  </div>
                )}
              </div>
            </SectionCard>

            {/* 체험레슨 예약 */}
            <SectionCard title="체험레슨 예약" icon={<Clock />} headerAction={renderSearchInput('reservation')}>
              <div className="space-y-4">
                {searchedReservations.map((r: any) => (
                  <div key={r.id} className="p-5 rounded-xl border border-orange-200 bg-white shadow-sm hover:border-orange-300 transition-colors">
                    {editingId === r.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative">
                             <input type="date" className={`${inputBaseClass} header-date-picker-input absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer`} value={editForm.date} onChange={(e)=>setEditForm({...editForm, date: e.target.value})} />
                             <div className="p-2 border border-slate-300 rounded bg-white text-slate-900 text-sm flex items-center justify-between pointer-events-none">
                               {editForm.date || '날짜 선택'} <Calendar size={14} className="text-slate-400" />
                             </div>
                          </div>
                          <select className={inputBaseClass} value={editForm.time} onChange={(e)=>setEditForm({...editForm, time: e.target.value})}><option value="">시간</option>{getTimeSlots().map(t => <option key={t} value={t}>{t}</option>)}</select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input className={inputBaseClass} value={editForm.name} onChange={(e)=>setEditForm({...editForm, name: e.target.value})} placeholder="이름" />
                          <input className={inputBaseClass} value={editForm.phone} onChange={(e)=>setEditForm({...editForm, phone: formatPhoneNumber(e.target.value)})} placeholder="전화번호" />
                        </div>
                        <input className={inputBaseClass} value={editForm.part} onChange={(e)=>setEditForm({...editForm, part: e.target.value})} placeholder="파트/선생님" />
                        <div className="flex gap-2">
                          <button onClick={() => savePersistentEdit('masterReservations')} className="flex-1 bg-orange-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-1"><Save size={16}/>저장</button>
                          <button onClick={cancelEditing} className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg font-bold flex items-center justify-center gap-1"><X size={16}/>취소</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="font-bold text-slate-900 text-lg">{r.name}</span>
                            <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-md font-bold">{r.part}</span>
                            {searchQueries.reservation && r.createdAt && (
                              <span className="text-[10px] bg-orange-100 text-orange-400 px-2 py-0.5 rounded-full font-bold">기록일: {r.createdAt}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 text-sm">
                            <span className="flex items-center gap-1.5 font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg">
                              <Calendar size={14} /> {r.date} ({getDayOfWeek(r.date)})
                            </span>
                            <span className="flex items-center gap-1.5 font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg"><Clock size={14} /> {r.time}</span>
                            <span className="flex items-center gap-1.5 font-medium text-slate-500 px-3 py-1.5">{r.phone}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-3 ml-4 no-print">
                          <button onClick={() => startEditing(r)} className="text-slate-300 hover:text-blue-500 transition-colors"><Edit2 size={18} /></button>
                          <button onClick={() => deletePersistentItem('masterReservations', r.id)} className="text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {!searchQueries.reservation && (
                  <div className="no-print pt-6 border-t border-slate-100">
                    <div className="grid grid-cols-2 md:grid-cols-12 gap-3 mb-3">
                      <div className="relative md:col-span-3">
                        <input id="r-date" type="date" value={newResDate} onChange={(e) => setNewResDate(e.target.value)} className="header-date-picker-input absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" />
                        <div className={`${inputBaseClass} flex justify-between items-center bg-white`}>
                          <span className={newResDate ? "text-slate-900" : "text-slate-400"}>
                            {newResDate || '날짜 선택'}
                          </span>
                          <Calendar size={14} className="text-slate-400" />
                        </div>
                      </div>
                      <div className="relative md:col-span-2">
                        <select id="r-time" className={`${inputBaseClass} appearance-none pr-8`}><option value="">시간</option>{getTimeSlots().map(t => <option key={t} value={t}>{t}</option>)}</select>
                        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                      <div className="md:col-span-2"><input id="r-name" placeholder="이름" className={inputBaseClass} /></div>
                      <div className="md:col-span-3"><input id="r-phone" placeholder="전화번호" className={inputBaseClass} onInput={(e)=>e.currentTarget.value = formatPhoneNumber(e.currentTarget.value)} /></div>
                      <div className="md:col-span-2"><input id="r-part" placeholder="파트/선생님" className={inputBaseClass} /></div>
                    </div>
                    <button onClick={() => {
                      const date = (document.getElementById('r-date') as HTMLInputElement).value;
                      const time = (document.getElementById('r-time') as HTMLSelectElement).value;
                      const name = (document.getElementById('r-name') as HTMLInputElement).value;
                      const phone = (document.getElementById('r-phone') as HTMLInputElement).value;
                      const part = (document.getElementById('r-part') as HTMLInputElement).value;
                      if (name && time && date) { 
                        addPersistentItem('masterReservations', { id: Date.now().toString(), date, time, name, phone, part }); 
                        ['r-name', 'r-phone', 'r-part'].forEach(id => (document.getElementById(id) as HTMLInputElement).value = '');
                        (document.getElementById('r-time') as HTMLSelectElement).value = '';
                        setNewResDate('');
                      }
                    }} className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-bold shadow-md">
                      <Plus size={20} /> 체험레슨 예약 추가
                    </button>
                  </div>
                )}
              </div>
            </SectionCard>

            {/* 첫 수업 예약 */}
            <SectionCard title="첫 수업 예약" icon={<Sparkles className="w-5 h-5" />} headerAction={renderSearchInput('firstLesson')}>
              <div className="space-y-4">
                {searchedFirstLessons.map((f: any) => (
                  <div key={f.id} className="p-5 rounded-xl border border-emerald-200 bg-white shadow-sm hover:border-emerald-300 transition-all">
                    {editingId === f.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative">
                            <input type="date" className={`${inputBaseClass} header-date-picker-input absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer`} value={editForm.date} onChange={(e)=>setEditForm({...editForm, date: e.target.value})} />
                            <div className="p-2 border border-slate-300 rounded bg-white text-slate-900 text-sm flex items-center justify-between pointer-events-none">
                               {editForm.date || '날짜 선택'} <Calendar size={14} className="text-slate-400" />
                            </div>
                          </div>
                          <select className={inputBaseClass} value={editForm.time} onChange={(e)=>setEditForm({...editForm, time: e.target.value})}><option value="">시간</option>{getTimeSlots().map(t => <option key={t} value={t}>{t}</option>)}</select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input className={inputBaseClass} value={editForm.name} onChange={(e)=>setEditForm({...editForm, name: e.target.value})} placeholder="이름" />
                          <input className={inputBaseClass} value={editForm.phone} onChange={(e)=>setEditForm({...editForm, phone: formatPhoneNumber(e.target.value)})} placeholder="전화번호" />
                        </div>
                        <input className={inputBaseClass} value={editForm.part} onChange={(e)=>setEditForm({...editForm, part: e.target.value})} placeholder="파트/선생님" />
                        <div className="flex gap-2">
                          <button onClick={() => savePersistentEdit('masterFirstLessons')} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-1"><Save size={16}/>저장</button>
                          <button onClick={cancelEditing} className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg font-bold flex items-center justify-center gap-1"><X size={16}/>취소</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="font-bold text-slate-900 text-lg">{f.name}</span>
                            <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md font-bold">{f.part}</span>
                            {searchQueries.firstLesson && f.createdAt && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-500 px-2 py-0.5 rounded-full font-bold ml-2">기록일: {f.createdAt}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm mb-4">
                            <span className="flex items-center gap-1.5 font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
                              <Calendar size={14} /> 개강일: {f.date} ({getDayOfWeek(f.date)})
                            </span>
                            <span className="flex items-center gap-1.5 font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg"><Clock size={14} /> 시간: {f.time}</span>
                            <span className="flex items-center gap-1.5 font-medium text-slate-500 px-3 py-1.5">{f.phone}</span>
                          </div>
                          <div className="flex items-center gap-4 p-2 bg-slate-50 rounded-lg border border-slate-100 w-fit no-print">
                            <button onClick={() => togglePersistentCheck('masterFirstLessons', f.id, 'isPaid')} className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${f.isPaid ? 'text-blue-600' : 'text-slate-400'}`}>{f.isPaid ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}결제 완료</button>
                            <button onClick={() => togglePersistentCheck('masterFirstLessons', f.id, 'isFormSubmitted')} className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${f.isFormSubmitted ? 'text-emerald-600' : 'text-slate-400'}`}>{f.isFormSubmitted ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}원서 작성</button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-3 ml-4 no-print">
                          <button onClick={() => startEditing(f)} className="text-slate-300 hover:text-blue-500 transition-colors"><Edit2 size={18} /></button>
                          <button onClick={() => deletePersistentItem('masterFirstLessons', f.id)} className="text-slate-200 hover:text-red-500 ml-4 no-print transition-colors"><Trash2 size={18} /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {!searchQueries.firstLesson && (
                  <div className="no-print pt-6 border-t border-slate-100">
                    <div className="grid grid-cols-2 md:grid-cols-12 gap-3 mb-3">
                      <div className="relative md:col-span-3">
                        <input id="f-date" type="date" value={newFirstDate} onChange={(e) => setNewFirstDate(e.target.value)} className="header-date-picker-input absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" />
                        <div className={`${inputBaseClass} flex justify-between items-center bg-white`}>
                          <span className={newFirstDate ? "text-slate-900" : "text-slate-400"}>
                            {newFirstDate || '날짜 선택'}
                          </span>
                          <Calendar size={14} className="text-slate-400" />
                        </div>
                      </div>
                      <div className="relative md:col-span-2">
                        <select id="f-time" className={`${inputBaseClass} appearance-none pr-8`}><option value="">시간</option>{getTimeSlots().map(t => <option key={t} value={t}>{t}</option>)}</select>
                        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                      <div className="md:col-span-2"><input id="f-name" placeholder="이름" className={inputBaseClass} /></div>
                      <div className="md:col-span-3"><input id="f-phone" placeholder="전화번호" className={inputBaseClass} onInput={(e)=>e.currentTarget.value = formatPhoneNumber(e.currentTarget.value)} /></div>
                      <div className="md:col-span-2"><input id="f-part" placeholder="파트/선생님" className={inputBaseClass} /></div>
                    </div>
                    <button onClick={() => {
                      const date = (document.getElementById('f-date') as HTMLInputElement).value;
                      const time = (document.getElementById('f-time') as HTMLSelectElement).value;
                      const name = (document.getElementById('f-name') as HTMLInputElement).value;
                      const phone = (document.getElementById('f-phone') as HTMLInputElement).value;
                      const part = (document.getElementById('f-part') as HTMLInputElement).value;
                      if (name && time && date) { 
                        addPersistentItem('masterFirstLessons', { id: Date.now().toString(), date, time, name, phone, part }); 
                        ['f-name', 'f-phone', 'f-part'].forEach(id => (document.getElementById(id) as HTMLInputElement).value = '');
                        (document.getElementById('f-time') as HTMLSelectElement).value = '';
                        setNewFirstDate('');
                      }
                    }} className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold shadow-md">
                      <Plus size={20} /> 첫 수업 예약 추가
                    </button>
                  </div>
                )}
              </div>
            </SectionCard>

            {/* 결제 내역 */}
            <SectionCard title="결제 내역" icon={<CreditCard />} headerAction={renderSearchInput('payment')}>
              <div className="space-y-4">
                {!searchQueries.payment && (
                  <div className="flex justify-between items-center px-4 py-3 bg-blue-50 rounded-xl border border-blue-100 mb-2">
                    <span className="text-sm font-bold text-blue-600 uppercase tracking-widest">일일 총 매출액</span>
                    <span className="font-black text-blue-800 text-2xl">{formatCurrency(currentReport.payments.reduce((a:any,p:any)=>a+p.amount,0))}</span>
                  </div>
                )}
                {searchedPayments.length === 0 && searchQueries.payment ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-300">
                    <SearchX size={48} className="mb-2 opacity-20" />
                    <p className="text-sm font-medium">검색 결과가 없습니다.</p>
                  </div>
                ) : (
                  searchedPayments.map((p: any) => (
                    <div key={p.id} className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-400 transition-all shadow-sm">
                      {editingId === p.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <input className={inputBaseClass} value={editForm.name} onChange={(e)=>setEditForm({...editForm, name: e.target.value})} placeholder="이름" />
                            <input className={inputBaseClass} value={editForm.part} onChange={(e)=>setEditForm({...editForm, part: e.target.value})} placeholder="파트" />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <select className={inputBaseClass} value={editForm.lessonType} onChange={(e)=>setEditForm({...editForm, lessonType: e.target.value})}><option value="취미">취미</option><option value="입시">입시</option><option value="전문">전문</option><option value="그룹">그룹</option></select>
                            <input className={inputBaseClass} value={formatNumberWithCommas(editForm.amount.toString())} onChange={(e)=>setEditForm({...editForm, amount: parseFormattedNumber(e.target.value)})} placeholder="금액" />
                            <select className={inputBaseClass} value={editForm.method} onChange={(e)=>setEditForm({...editForm, method: e.target.value as PaymentMethod})}><option value="카드">카드</option><option value="계좌이체">계좌이체</option><option value="현금">현금</option></select>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={savePaymentEdit} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-1"><Save size={16}/>저장</button>
                            <button onClick={cancelEditing} className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg font-bold flex items-center justify-center gap-1"><X size={16}/>취소</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-black text-xs">{p.method[0]}</div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-slate-800 text-lg">{p.name}</span>
                                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full font-bold text-slate-500 uppercase">{p.part}</span>
                                <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-bold uppercase">{p.lessonType}</span>
                                {searchQueries.payment && p.date && (
                                  <span className="text-[10px] bg-blue-50 text-blue-400 px-2 py-0.5 rounded-full font-bold ml-2">{p.date}</span>
                                )}
                              </div>
                              <div className="text-base font-black text-blue-700 mt-1">{formatCurrency(p.amount)} <span className="text-xs font-normal text-slate-400 ml-1">({p.method})</span></div>
                            </div>
                          </div>
                          {!searchQueries.payment && (
                            <div className="flex items-center gap-3 no-print">
                              <div className="flex gap-1.5">
                                <button onClick={() => { const updated = currentReport.payments.map((pay: any) => pay.id === p.id ? { ...pay, isClbiz: !pay.isClbiz } : pay); updateDayData({ payments: updated }); }} className={`text-[10px] font-black px-3 py-1.5 rounded-lg border transition-all ${p.isClbiz ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-300 border-slate-200 hover:border-blue-200'}`}>클비즈</button>
                                <button onClick={() => { const updated = currentReport.payments.map((pay: any) => pay.id === p.id ? { ...pay, isJournal: !pay.isJournal } : pay); updateDayData({ payments: updated }); }} className={`text-[10px] font-black px-3 py-1.5 rounded-lg border transition-all ${p.isJournal ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-300 border-slate-200 hover:border-emerald-200'}`}>일지</button>
                              </div>
                              <div className="flex gap-2 ml-2">
                                <button onClick={() => startEditing(p)} className="text-slate-300 hover:text-blue-500 transition-colors"><Edit2 size={18} /></button>
                                <button onClick={() => { const updated = currentReport.payments.filter((pay: any) => pay.id !== p.id); updateDayData({ payments: updated }); }} className="text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
                {!searchQueries.payment && (
                  <div className="no-print pt-6 border-t border-slate-100">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                      <input id="p-name" placeholder="이름" className={inputBaseClass} />
                      <input id="p-part" placeholder="파트" className={inputBaseClass} />
                      <div className="relative">
                        <select id="p-lesson-type" className={`${inputBaseClass} appearance-none pr-8`}><option value="취미">취미</option><option value="입시">입시</option><option value="전문">전문</option><option value="그룹">그룹</option></select>
                        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                      <input id="p-amount" placeholder="금액" className={inputBaseClass} onInput={(e)=>e.currentTarget.value = formatNumberWithCommas(e.currentTarget.value)} />
                      <div className="relative">
                        <select id="p-method" className={`${inputBaseClass} appearance-none pr-8`}><option value="카드">카드</option><option value="계좌이체">계좌이체</option><option value="현금">현금</option></select>
                        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <button onClick={() => {
                      const n = document.getElementById('p-name') as HTMLInputElement; const p = document.getElementById('p-part') as HTMLInputElement; const t = document.getElementById('p-lesson-type') as HTMLSelectElement; const a = document.getElementById('p-amount') as HTMLInputElement; const m = document.getElementById('p-method') as HTMLSelectElement;
                      if (n.value && a.value) { updateDayData({ payments: [...currentReport.payments, { id: Date.now().toString(), name: n.value, part: p.value, lessonType: t.value, amount: parseFormattedNumber(a.value), method: m.value as PaymentMethod, isClbiz: false, isJournal: false }] }); n.value = ''; p.value = ''; a.value = ''; }
                    }} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-100">
                      <Plus size={20} className="inline mr-1" /> 결제 등록
                    </button>
                  </div>
                )}
              </div>
            </SectionCard>
          </div>

          <div className="space-y-10">
            {/* 전달사항 */}
            <SectionCard title="전달사항" icon={<AlertCircle />}>
              <div className="space-y-8">
                <div className="group">
                  <div className="flex justify-between items-center mb-2 px-1">
                    <label className="text-xs font-black text-slate-900 uppercase tracking-widest">고정 전달사항</label>
                    <button onClick={() => handleNoticeDelete('masterFixedNotices')} className="text-[10px] text-red-400 font-bold hover:underline opacity-0 group-hover:opacity-100 transition-opacity no-print">지우기</button>
                  </div>
                  <textarea 
                    value={currentReport.fixedNotice} 
                    onChange={(e) => handleNoticeChange('masterFixedNotices', e.target.value)} 
                    placeholder="매일 공지되어야 할 내용을 적어주세요..."
                    rows={4} 
                    className="w-full text-sm p-4 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 outline-none text-slate-800 font-medium shadow-inner transition-all"
                  />
                </div>
                <div className="group">
                  <div className="flex justify-between items-center mb-2 px-1">
                    <label className="text-xs font-black text-slate-900 uppercase tracking-widest">새로운 전달사항</label>
                    <button onClick={() => handleNoticeDelete('masterNewNotices')} className="text-[10px] text-red-400 font-bold hover:underline opacity-0 group-hover:opacity-100 transition-opacity no-print">지우기</button>
                  </div>
                  <textarea 
                    value={currentReport.newNotice} 
                    onChange={(e) => handleNoticeChange('masterNewNotices', e.target.value)} 
                    placeholder="오늘 기록하면 삭제 전까지 매일 리스트에 유지됩니다..."
                    rows={6} 
                    className="w-full text-sm p-4 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 outline-none text-slate-800 font-medium shadow-inner transition-all"
                  />
                </div>
              </div>
            </SectionCard>

            {/* 살 것 */}
            <SectionCard title="살 것" icon={<ShoppingCart />}>
              <div className="space-y-4">
                {currentReport.shoppingList.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between group px-1">
                    <button onClick={() => togglePersistentCheck('masterShoppingList', item.id, 'completed')} className={`flex items-center gap-3 text-sm transition-all ${item.completed ? 'text-slate-300' : 'text-slate-800 font-black'}`}>
                      {item.completed ? <CheckCircle2 className="w-6 h-6 text-emerald-400" /> : <Circle className="w-6 h-6 text-slate-200" />}
                      <span className={item.completed ? 'line-through' : ''}>{item.text}</span>
                    </button>
                    <button onClick={() => deletePersistentItem('masterShoppingList', item.id)} className="text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition no-print"><Trash2 size={16} /></button>
                  </div>
                ))}
                <div className="flex gap-2 no-print pt-2">
                  <input id="shop-input" placeholder="필요한 물품 입력..." className={inputBaseClass} onKeyDown={(e) => { if (e.key === 'Enter') { const val = e.currentTarget.value; if (val) { addPersistentItem('masterShoppingList', { id: Date.now().toString(), text: val, completed: false }); e.currentTarget.value = ''; } } }} />
                  <button onClick={() => { const input = document.getElementById('shop-input') as HTMLInputElement; if (input.value) { addPersistentItem('masterShoppingList', { id: Date.now().toString(), text: input.value, completed: false }); input.value = ''; } }} className="bg-slate-900 p-3 rounded-xl text-white hover:bg-black transition"><Plus size={18} /></button>
                </div>
              </div>
            </SectionCard>

            {/* 지출 내역 */}
            <SectionCard title="지출 내역" icon={<CreditCard />} headerAction={renderSearchInput('expense')}>
              <div className="space-y-4">
                {!searchQueries.expense && (
                  <div className="flex justify-between items-center px-4 py-3 bg-red-50 rounded-xl border border-red-100">
                    <span className="text-xs font-bold text-red-600 uppercase tracking-widest">일일 총 지출액</span>
                    <span className="font-black text-red-700 text-xl">{formatCurrency(currentReport.expenses.reduce((acc: any, e: any) => acc + e.amount, 0))}</span>
                  </div>
                )}
                {searchedExpenses.map((e: any) => (
                  <div key={e.id} className="p-4 rounded-xl bg-white border border-red-100 flex justify-between items-center group shadow-sm">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-red-600">{formatCurrency(e.amount)}</span>
                        {searchQueries.expense && e.date && (
                          <span className="text-[10px] bg-red-50 text-red-300 px-2 py-0.5 rounded-full font-bold">{e.date}</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 font-bold">{e.description}</div>
                    </div>
                    {!searchQueries.expense && (
                      <button onClick={() => { const updated = currentReport.expenses.filter((exp: any) => exp.id !== e.id); updateDayData({ expenses: updated }); }} className="text-red-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition no-print"><Trash2 size={16} /></button>
                    )}
                  </div>
                ))}
                {!searchQueries.expense && (
                  <div className="no-print pt-4 border-t border-slate-100">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <input id="e-amount" placeholder="금액" className={inputBaseClass} onInput={(e)=>e.currentTarget.value = formatNumberWithCommas(e.currentTarget.value)} />
                      <input id="e-desc" placeholder="지출 내용" className={inputBaseClass} />
                    </div>
                    <button onClick={() => {
                      const a = (document.getElementById('e-amount') as HTMLInputElement).value; const d = (document.getElementById('e-desc') as HTMLInputElement).value;
                      if (a) { updateDayData({ expenses: [...currentReport.expenses, { id: Date.now().toString(), amount: parseFormattedNumber(a), description: d }] }); (document.getElementById('e-amount') as HTMLInputElement).value = ''; (document.getElementById('e-desc') as HTMLInputElement).value = ''; }
                    }} className="w-full bg-white border-2 border-red-100 text-red-600 py-3 rounded-xl text-sm font-black hover:bg-red-50 transition">지출 항목 추가</button>
                  </div>
                )}
              </div>
            </SectionCard>
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-6 shadow-2xl flex justify-center z-40 no-print">
        <div className="max-w-6xl w-full flex items-center justify-between px-4">
          <div className="flex gap-12">
            <div className="flex flex-col"><span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">총 매출</span><span className="text-2xl font-black text-blue-600">{formatCurrency(currentReport.payments.reduce((a:any,p:any)=>a+p.amount,0))}</span></div>
            <div className="flex flex-col"><span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">총 지출</span><span className="text-2xl font-black text-red-500">{formatCurrency(currentReport.expenses.reduce((a:any,e:any)=>a+e.amount,0))}</span></div>
          </div>
          <div className="flex items-center gap-6">
             <button onClick={() => window.print()} className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-base font-black hover:bg-black transition-all shadow-xl hover:-translate-y-1 active:translate-y-0">결산 보고서 출력 (PDF)</button>
             <div className="flex flex-col items-center">
               <div className="flex items-center gap-2 text-emerald-600 mb-1">
                 <CheckCircle2 size={18} /><span className="text-xs font-black uppercase">Auto Saved</span>
               </div>
               <span className="text-[9px] text-slate-300 font-bold">Real-time Cloud Sync</span>
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
