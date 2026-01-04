
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Calendar, User, MessageSquare, Clock, CreditCard, ShoppingCart, 
  Plus, Trash2, CheckCircle2, Circle, AlertCircle, TrendingUp,
  Sparkles, CheckSquare, Square, History, ChevronDown, Edit2, Save, X, Search, SearchX
} from 'lucide-react';
import { DailyReport, StateData, Consultation, Reservation, Expense, Payment, TodoItem, PaymentMethod, PersistentWrapper } from './types';
import { getManagerForDate, formatDate, getDayOfWeek, formatCurrency, getTimeSlots, formatNumberWithCommas, parseFormattedNumber, formatPhoneNumber } from './constants';
import SectionCard from './components/SectionCard';
import { generateDailySummary } from './services/geminiService';

const App: React.FC = () => {
  // 1. 상태 관리
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [data, setData] = useState<StateData>(() => {
    const saved = localStorage.getItem('juniper_academy_data_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          days: parsed.days || {},
          masterConsultations: parsed.masterConsultations || [],
          masterReservations: parsed.masterReservations || [],
          masterFirstLessons: parsed.masterFirstLessons || []
        };
      } catch (e) {
        console.error("데이터 복구 실패:", e);
      }
    }
    return { days: {}, masterConsultations: [], masterReservations: [], masterFirstLessons: [] };
  });

  // 검색 상태 관리
  const [searchQueries, setSearchQueries] = useState({
    consultation: '',
    reservation: '',
    firstLesson: '',
    payment: '',
    expense: ''
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>(null);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [suggestedHistory, setSuggestedHistory] = useState<{part: string, lessonType: string, amount: number} | null>(null);

  // 데이터 자동 저장
  useEffect(() => {
    localStorage.setItem('juniper_academy_data_v2', JSON.stringify(data));
  }, [data]);

  // 현재 리포트 조립
  const currentReport = useMemo(() => {
    const dayData = data.days[selectedDate] || {};
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
      fixedNotice: dayData.fixedNotice || '• 원생 출결 체크 필수\n• 연습실 사용 후 소등 확인\n• 마감 전 냉난방기 확인',
      newNotice: dayData.newNotice || '',
      shoppingList: dayData.shoppingList || [],
      payments: dayData.payments || []
    };
  }, [data, selectedDate]);

  // --- 과거 데이터 검색 로직 ---
  const allPastPayments = useMemo(() => {
    const all: (Payment & { date: string })[] = [];
    Object.keys(data.days).forEach(date => {
      data.days[date].payments?.forEach(p => all.push({ ...p, date }));
    });
    return all.sort((a, b) => b.date.localeCompare(a.date));
  }, [data.days]);

  const allPastExpenses = useMemo(() => {
    const all: (Expense & { date: string })[] = [];
    Object.keys(data.days).forEach(date => {
      data.days[date].expenses?.forEach(e => all.push({ ...e, date }));
    });
    return all.sort((a, b) => b.date.localeCompare(a.date));
  }, [data.days]);

  const searchResults = {
    consultation: data.masterConsultations.filter(c => c.data.name.includes(searchQueries.consultation)).map(c => ({ ...c.data, createdAt: c.createdAt })),
    reservation: data.masterReservations.filter(r => r.data.name.includes(searchQueries.reservation)).map(r => ({ ...r.data, createdAt: r.createdAt })),
    firstLesson: data.masterFirstLessons.filter(f => f.data.name.includes(searchQueries.firstLesson)).map(f => ({ ...f.data, createdAt: f.createdAt })),
    payment: allPastPayments.filter(p => p.name.includes(searchQueries.payment)),
    expense: allPastExpenses.filter(e => e.description.includes(searchQueries.expense))
  };

  // 핸들러 함수들
  const updateDayData = useCallback((updates: any) => {
    setData(prev => ({ ...prev, days: { ...prev.days, [selectedDate]: { ...(prev.days[selectedDate] || {}), ...updates } } }));
  }, [selectedDate]);

  const addPersistentItem = (key: 'masterConsultations' | 'masterReservations' | 'masterFirstLessons', item: any) => {
    const finalItem = key === 'masterFirstLessons' ? { ...item, isPaid: false, isFormSubmitted: false } : item;
    setData(prev => ({ ...prev, [key]: [...prev[key], { data: finalItem, createdAt: selectedDate, deletedAt: null }] }));
  };

  const deletePersistentItem = (key: 'masterConsultations' | 'masterReservations' | 'masterFirstLessons', id: string) => {
    setData(prev => ({ ...prev, [key]: prev[key].map(item => (item.data as any).id === id ? { ...item, deletedAt: selectedDate } : item) }));
  };

  const toggleFirstLessonCheck = (id: string, field: 'isPaid' | 'isFormSubmitted') => {
    setData(prev => ({ ...prev, masterFirstLessons: prev.masterFirstLessons.map(item => item.data.id === id ? { ...item, data: { ...item.data, [field]: !item.data[field] } } : item) }));
  };

  const startEditing = (item: any) => { setEditingId(item.id); setEditValues({ ...item }); };
  const saveEdit = (key: string, isPersistent: boolean = false) => {
    if (!editingId || !editValues) return;
    if (isPersistent) {
      const masterKey = key as any;
      setData(prev => ({ ...prev, [masterKey]: prev[masterKey].map((item: any) => item.data.id === editingId ? { ...item, data: { ...editValues } } : item) }));
    } else {
      updateDayData({ [key]: (currentReport as any)[key].map((item: any) => item.id === editingId ? { ...editValues } : item) });
    }
    setEditingId(null); setEditValues(null);
  };

  const handleAiAnalysis = async () => {
    setIsGeneratingSummary(true);
    const summary = await generateDailySummary(currentReport as any);
    setAiSummary(summary);
    setIsGeneratingSummary(false);
  };

  const findHistoryForName = (name: string) => {
    if (!name || name.length < 2) { setSuggestedHistory(null); return; }
    const found = allPastPayments.find(p => p.name.includes(name));
    if (found) setSuggestedHistory({ part: found.part, lessonType: found.lessonType, amount: found.amount });
    else setSuggestedHistory(null);
  };

  const applySuggestion = () => {
    if (suggestedHistory) {
      (document.getElementById('p-part') as HTMLInputElement).value = suggestedHistory.part;
      (document.getElementById('p-lesson-type') as HTMLSelectElement).value = suggestedHistory.lessonType;
      (document.getElementById('p-amount') as HTMLInputElement).value = formatNumberWithCommas(suggestedHistory.amount.toString());
      setSuggestedHistory(null);
    }
  };

  const inputBaseClass = "text-sm p-2 border border-slate-300 rounded bg-white text-slate-900 focus:ring-2 focus:ring-blue-100 outline-none placeholder:text-slate-400 w-full";
  const searchInputClass = "text-xs p-1.5 pl-8 border border-slate-300 rounded-full bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-200 w-full transition-all";

  const renderSearchHeader = (key: keyof typeof searchQueries, placeholder: string) => (
    <div className="relative group">
      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
      <input 
        type="text" 
        placeholder={placeholder}
        className={searchInputClass}
        value={searchQueries[key]}
        onChange={(e) => setSearchQueries({ ...searchQueries, [key]: e.target.value })}
      />
      {searchQueries[key] && (
        <button onClick={() => setSearchQueries({ ...searchQueries, [key]: '' })} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
          <X size={12} />
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">J</div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">주니퍼실용음악학원</h1>
              <p className="text-xs text-slate-500 font-medium tracking-wider">학원 일일 결산 관리 시스템</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-white rounded-lg px-3 py-2 border border-slate-300 focus-within:ring-2 focus-within:ring-blue-100 transition shadow-sm">
              <Calendar className="w-4 h-4 text-slate-500 mr-2" />
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent border-none focus:outline-none text-sm font-semibold text-slate-800" />
              <span className="ml-2 pl-2 border-l border-slate-200 text-sm font-bold text-blue-600">{getDayOfWeek(selectedDate)}요일</span>
            </div>
            <div className="flex items-center bg-blue-50 text-blue-700 rounded-lg border border-blue-100 shadow-sm relative overflow-hidden">
              <div className="flex items-center pl-3 py-2">
                <User className="w-4 h-4 mr-2 shrink-0" />
                <select value={currentReport.manager} onChange={(e) => updateDayData({ manager: e.target.value })} className="bg-transparent border-none focus:outline-none text-sm font-bold pr-8 appearance-none cursor-pointer">
                  <option value="오세혁">오세혁</option><option value="한인성">한인성</option><option value="담당자 없음">담당자 없음</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2 pointer-events-none opacity-50" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* 상담 내역 */}
            <SectionCard title="상담 내역" icon={<MessageSquare className="w-5 h-5" />} headerAction={renderSearchHeader('consultation', '이름으로 과거 상담 검색...')}>
              <div className="space-y-4">
                {(searchQueries.consultation ? searchResults.consultation : currentReport.consultations).map((c: any) => (
                  <div key={c.id} className={`p-4 rounded-lg border shadow-sm transition-colors ${searchQueries.consultation ? 'bg-blue-50/30 border-blue-100' : 'bg-white border-slate-200 hover:border-blue-100'}`}>
                    <div className="flex justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-slate-900">{c.name}</span>
                          <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-semibold">{c.part}</span>
                          <span className="text-[10px] text-slate-400 font-bold ml-auto">최초기록: {c.createdAt}</span>
                        </div>
                        <div className="text-xs text-slate-500 mb-2">{c.phone}</div>
                        <p className="text-sm text-slate-700 leading-relaxed">{c.content}</p>
                      </div>
                      {!searchQueries.consultation && (
                        <div className="flex flex-col gap-2 ml-4">
                          <button onClick={() => startEditing(c)} className="text-slate-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => deletePersistentItem('masterConsultations', c.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {!searchQueries.consultation && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 pt-2 border-t border-slate-100">
                      <div className="md:col-span-2"><input id="c-name" placeholder="이름" className={inputBaseClass} /></div>
                      <div className="md:col-span-3"><input id="c-phone" placeholder="전화번호" className={inputBaseClass} onInput={(e) => e.currentTarget.value = formatPhoneNumber(e.currentTarget.value)} /></div>
                      <div className="md:col-span-2"><input id="c-part" placeholder="파트" className={inputBaseClass} /></div>
                      <div className="md:col-span-5"><input id="c-content" placeholder="상담내용" className={inputBaseClass} /></div>
                    </div>
                    <button onClick={() => {
                      const name = (document.getElementById('c-name') as HTMLInputElement).value;
                      const phone = (document.getElementById('c-phone') as HTMLInputElement).value;
                      const part = (document.getElementById('c-part') as HTMLInputElement).value;
                      const content = (document.getElementById('c-content') as HTMLInputElement).value;
                      if (name) { addPersistentItem('masterConsultations', { id: Date.now().toString(), name, phone, part, content }); ['c-name', 'c-phone', 'c-part', 'c-content'].forEach(id => (document.getElementById(id) as HTMLInputElement).value = ''); }
                    }} className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white py-2.5 rounded-lg transition text-sm font-bold shadow-sm">
                      <Plus className="w-4 h-4" /> 새로운 상담 추가
                    </button>
                  </>
                )}
              </div>
            </SectionCard>

            {/* 체험레슨 예약 */}
            <SectionCard title="체험레슨 예약" icon={<Clock className="w-5 h-5" />} headerAction={renderSearchHeader('reservation', '이름으로 과거 예약 검색...')}>
              <div className="space-y-4">
                {(searchQueries.reservation ? searchResults.reservation : currentReport.reservations).map((r: any) => (
                  <div key={r.id} className={`p-4 rounded-lg border shadow-sm transition-colors ${searchQueries.reservation ? 'bg-orange-50/30 border-orange-100' : 'bg-white border-orange-100'}`}>
                    <div className="flex justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-slate-900">{r.name}</span>
                          <span className="text-xs bg-orange-50 border border-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">{r.part}</span>
                          <span className="text-[10px] text-slate-400 font-bold ml-auto">최초기록: {r.createdAt}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                          <span className="font-bold flex items-center gap-1 bg-orange-50 px-2 py-1 rounded text-orange-700"><Calendar className="w-3 h-3" /> 예약일: {r.date}</span>
                          <span className="font-bold flex items-center gap-1 bg-orange-50 px-2 py-1 rounded text-orange-700"><Clock className="w-3 h-3" /> 시간: {r.time}</span>
                          <span className="font-medium">{r.phone}</span>
                        </div>
                      </div>
                      {!searchQueries.reservation && (
                        <div className="flex flex-col gap-2 ml-4">
                          <button onClick={() => startEditing(r)} className="text-slate-400 hover:text-orange-600"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => deletePersistentItem('masterReservations', r.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {!searchQueries.reservation && (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-2 border-t border-slate-100">
                      <input id="r-date" type="date" className={inputBaseClass} />
                      <select id="r-time" className={inputBaseClass}><option value="">시간 선택</option>{getTimeSlots().map(t => <option key={t} value={t}>{t}</option>)}</select>
                      <input id="r-name" placeholder="이름" className={inputBaseClass} />
                      <input id="r-phone" placeholder="전화번호" className={inputBaseClass} onInput={(e) => e.currentTarget.value = formatPhoneNumber(e.currentTarget.value)} />
                      <input id="r-part" placeholder="파트" className={inputBaseClass} />
                    </div>
                    <button onClick={() => {
                      const date = (document.getElementById('r-date') as HTMLInputElement).value;
                      const time = (document.getElementById('r-time') as HTMLSelectElement).value;
                      const name = (document.getElementById('r-name') as HTMLInputElement).value;
                      const phone = (document.getElementById('r-phone') as HTMLInputElement).value;
                      const part = (document.getElementById('r-part') as HTMLInputElement).value;
                      if (name && time) { addPersistentItem('masterReservations', { id: Date.now().toString(), date, time, name, phone, part }); ['r-date', 'r-name', 'r-phone', 'r-part'].forEach(id => (document.getElementById(id) as HTMLInputElement).value = ''); (document.getElementById('r-time') as HTMLSelectElement).value = ''; }
                    }} className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white py-2.5 rounded-lg transition text-sm font-bold shadow-md shadow-orange-100">
                      <Plus className="w-4 h-4" /> 체험레슨 추가
                    </button>
                  </>
                )}
              </div>
            </SectionCard>

            {/* 첫수업 예약 */}
            <SectionCard title="첫수업 예약" icon={<Sparkles className="w-5 h-5" />} headerAction={renderSearchHeader('firstLesson', '이름으로 과거 개강 검색...')}>
              <div className="space-y-4">
                {(searchQueries.firstLesson ? searchResults.firstLesson : currentReport.firstLessons).map((r: any) => (
                  <div key={r.id} className={`p-4 rounded-lg border shadow-sm transition-all ${searchQueries.firstLesson ? 'bg-emerald-50/30 border-emerald-100' : 'bg-white border-emerald-100 hover:border-emerald-200'}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-slate-900">{r.name}</span>
                          <span className="text-xs bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">{r.part}</span>
                          <span className="text-[10px] text-slate-400 font-bold ml-auto">최초기록: {r.createdAt}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mb-3">
                          <span className="font-bold flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded text-emerald-700"><Calendar className="w-3 h-3" /> 개강일: {r.date}</span>
                          <span className="font-bold flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded text-emerald-700"><Clock className="w-3 h-3" /> 시간: {r.time}</span>
                          <span className="font-medium">{r.phone}</span>
                        </div>
                        <div className="flex items-center gap-4 p-2 bg-slate-50 rounded-lg border border-slate-100 w-fit">
                          <button onClick={() => toggleFirstLessonCheck(r.id, 'isPaid')} className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${r.isPaid ? 'text-blue-600' : 'text-slate-400'}`}>{r.isPaid ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}결제 완료</button>
                          <button onClick={() => toggleFirstLessonCheck(r.id, 'isFormSubmitted')} className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${r.isFormSubmitted ? 'text-emerald-600' : 'text-slate-400'}`}>{r.isFormSubmitted ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}원서 작성</button>
                        </div>
                      </div>
                      {!searchQueries.firstLesson && (
                        <div className="flex flex-col gap-2 ml-4">
                          <button onClick={() => startEditing(r)} className="text-slate-400 hover:text-emerald-600"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => deletePersistentItem('masterFirstLessons', r.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {!searchQueries.firstLesson && (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-2 border-t border-slate-100">
                      <input id="f-date" type="date" className={inputBaseClass} />
                      <select id="f-time" className={inputBaseClass}><option value="">시간 선택</option>{getTimeSlots().map(t => <option key={t} value={t}>{t}</option>)}</select>
                      <input id="f-name" placeholder="이름" className={inputBaseClass} />
                      <input id="f-phone" placeholder="전화번호" className={inputBaseClass} onInput={(e) => e.currentTarget.value = formatPhoneNumber(e.currentTarget.value)} />
                      <input id="f-part" placeholder="파트" className={inputBaseClass} />
                    </div>
                    <button onClick={() => {
                      const date = (document.getElementById('f-date') as HTMLInputElement).value;
                      const time = (document.getElementById('f-time') as HTMLSelectElement).value;
                      const name = (document.getElementById('f-name') as HTMLInputElement).value;
                      const phone = (document.getElementById('f-phone') as HTMLInputElement).value;
                      const part = (document.getElementById('f-part') as HTMLInputElement).value;
                      if (name && time) { addPersistentItem('masterFirstLessons', { id: Date.now().toString(), date, time, name, phone, part }); ['f-date', 'f-name', 'f-phone', 'f-part'].forEach(id => (document.getElementById(id) as HTMLInputElement).value = ''); (document.getElementById('f-time') as HTMLSelectElement).value = ''; }
                    }} className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg transition text-sm font-bold shadow-md shadow-emerald-100">
                      <Plus className="w-4 h-4" /> 첫수업 예약 추가
                    </button>
                  </>
                )}
              </div>
            </SectionCard>

            {/* 결제 내역 */}
            <SectionCard title="결제 내역" icon={<CreditCard className="w-5 h-5" />} headerAction={renderSearchHeader('payment', '이름으로 전체 결제 이력 검색...')}>
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2 px-2">
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-tighter">{searchQueries.payment ? '검색된 결제 내역' : '당일 매출 총액'}</span>
                  <span className="font-black text-blue-600 text-xl">{formatCurrency((searchQueries.payment ? searchResults.payment : currentReport.payments).reduce((acc: any, p: any) => acc + p.amount, 0))}</span>
                </div>
                {(searchQueries.payment ? searchResults.payment : currentReport.payments).map((p: any) => (
                  <div key={p.id} className={`p-4 rounded-lg border shadow-sm transition-all ${searchQueries.payment ? 'bg-indigo-50/30 border-indigo-100' : 'bg-white border-slate-200 hover:border-blue-200'}`}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 truncate">{p.name}</span>
                            <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-semibold">{p.part}</span>
                            <span className="text-[10px] bg-indigo-50 px-1.5 py-0.5 rounded text-indigo-700 border border-indigo-100 font-bold">{p.lessonType}</span>
                            <span className="text-[10px] text-slate-400 font-medium">({p.method})</span>
                            {searchQueries.payment && <span className="text-[10px] text-blue-500 font-black ml-auto bg-blue-50 px-2 py-0.5 rounded-full">{p.date} 결제</span>}
                          </div>
                          <div className="text-sm font-bold text-blue-700 mt-0.5">{formatCurrency(p.amount)}</div>
                        </div>
                      </div>
                      {!searchQueries.payment && (
                        <>
                          <div className="flex items-center gap-4 mx-4 shrink-0 px-3 py-1 bg-slate-50 rounded-lg border border-slate-100">
                            <button onClick={() => { const updated = currentReport.payments.map((pay: any) => pay.id === p.id ? { ...pay, isClbiz: !pay.isClbiz } : pay); updateDayData({ payments: updated }); }} className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${p.isClbiz ? 'text-blue-600' : 'text-slate-400'}`}>{p.isClbiz ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}클비즈</button>
                            <button onClick={() => { const updated = currentReport.payments.map((pay: any) => pay.id === p.id ? { ...pay, isJournal: !pay.isJournal } : pay); updateDayData({ payments: updated }); }} className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${p.isJournal ? 'text-emerald-600' : 'text-slate-400'}`}>{p.isJournal ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}일지</button>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => startEditing(p)} className="text-slate-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => { const updated = currentReport.payments.filter((pay: any) => pay.id !== p.id); updateDayData({ payments: updated }); }} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {!searchQueries.payment && (
                  <>
                    <div className="relative pt-2 border-t border-slate-100">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        <div className="relative">
                          <input id="p-name" placeholder="이름" className={inputBaseClass} onChange={(e) => findHistoryForName(e.target.value)} />
                          {suggestedHistory && (
                            <div className="absolute z-50 left-0 top-full mt-1 w-[280px] bg-white border border-blue-200 rounded-lg shadow-xl p-3 animate-in fade-in slide-in-from-top-1">
                              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-1"><History size={10} /> 이전 결제 정보 불러오기</p>
                              <div className="space-y-1.5 mb-3">
                                <div className="flex justify-between text-xs"><span className="text-slate-400">파트:</span><span className="font-bold text-slate-700">{suggestedHistory.part}</span></div>
                                <div className="flex justify-between text-xs"><span className="text-slate-400">유형:</span><span className="font-bold text-slate-700">{suggestedHistory.lessonType}</span></div>
                                <div className="flex justify-between text-xs"><span className="text-slate-400">금액:</span><span className="font-bold text-blue-600">{formatCurrency(suggestedHistory.amount)}</span></div>
                              </div>
                              <button onClick={applySuggestion} className="w-full py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-xs font-bold transition flex items-center justify-center gap-1">자동 입력 적용</button>
                            </div>
                          )}
                        </div>
                        <input id="p-part" placeholder="파트" className={inputBaseClass} /><select id="p-lesson-type" className={inputBaseClass}><option value="취미">취미</option><option value="입시">입시</option><option value="전문">전문</option><option value="그룹">그룹</option></select><input id="p-amount" type="text" placeholder="금액" className={inputBaseClass} onInput={(e) => e.currentTarget.value = formatNumberWithCommas(e.currentTarget.value)} /><select id="p-method" className={inputBaseClass}><option value="카드">카드</option><option value="계좌이체">계좌이체</option><option value="현금">현금</option></select>
                      </div>
                    </div>
                    <button onClick={() => {
                      const nInput = document.getElementById('p-name') as HTMLInputElement; const pInput = document.getElementById('p-part') as HTMLInputElement; const tInput = document.getElementById('p-lesson-type') as HTMLSelectElement; const aInput = document.getElementById('p-amount') as HTMLInputElement; const mInput = document.getElementById('p-method') as HTMLSelectElement;
                      if (nInput.value && aInput.value) { updateDayData({ payments: [...currentReport.payments, { id: Date.now().toString(), name: nInput.value, part: pInput.value, lessonType: tInput.value, amount: parseFormattedNumber(aInput.value), method: mInput.value as PaymentMethod, isClbiz: false, isJournal: false }] }); [nInput, pInput, aInput].forEach(el => el.value = ''); setSuggestedHistory(null); }
                    }} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg transition text-sm font-bold shadow-md shadow-blue-100">
                      <Plus className="w-4 h-4" /> 결제 기록 추가
                    </button>
                  </>
                )}
              </div>
            </SectionCard>
          </div>

          <div className="space-y-8">
            {/* AI 요약 */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={120} /></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-400" /><h2 className="font-bold text-lg">AI 운영 분석</h2></div><button onClick={handleAiAnalysis} disabled={isGeneratingSummary} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition px-4 py-1.5 rounded-full text-sm font-medium shadow-sm flex items-center gap-2">{isGeneratingSummary ? '분석 중...' : '분석 생성'}</button></div>
                <div className="bg-slate-700/50 backdrop-blur-sm rounded-xl p-4 border border-slate-600"><p className="text-slate-100 text-sm leading-relaxed whitespace-pre-wrap">{aiSummary || '기록된 데이터를 바탕으로 AI가 분석을 시작합니다.'}</p></div>
              </div>
            </div>

            <SectionCard title="전달사항" icon={<AlertCircle className="w-5 h-5" />}>
               <div className="space-y-6">
                 <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block px-1">고정 전달사항</label><textarea value={currentReport.fixedNotice} onChange={(e) => updateDayData({ fixedNotice: e.target.value })} rows={4} className="w-full text-sm p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 font-medium shadow-sm" /></div>
                 <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block px-1">새로운 전달사항</label><textarea value={currentReport.newNotice} onChange={(e) => updateDayData({ newNotice: e.target.value })} placeholder="오늘의 특이사항을 적어주세요..." rows={6} className="w-full text-sm p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 shadow-sm" /></div>
               </div>
            </SectionCard>

            <SectionCard title="살 것" icon={<ShoppingCart className="w-5 h-5" />}>
              <div className="space-y-3">
                {currentReport.shoppingList.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between group px-1">
                    <button onClick={() => { const updated = currentReport.shoppingList.map((i: any) => i.id === item.id ? { ...i, completed: !i.completed } : i); updateDayData({ shoppingList: updated }); }} className="flex items-center gap-3 text-sm text-slate-700 hover:text-slate-900 transition text-left">{item.completed ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : <Circle className="w-5 h-5 text-slate-300 shrink-0" />}<span className={item.completed ? 'line-through text-slate-400 font-medium' : 'font-bold'}>{item.text}</span></button>
                    <button onClick={() => { const updated = currentReport.shoppingList.filter((i: any) => i.id !== item.id); updateDayData({ shoppingList: updated }); }} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                <div className="flex gap-2 pt-2"><input id="shop-input" placeholder="물품명..." className={`${inputBaseClass} flex-1`} onKeyDown={(e) => { if (e.key === 'Enter') { const val = e.currentTarget.value; if (val) { updateDayData({ shoppingList: [...currentReport.shoppingList, { id: Date.now().toString(), text: val, completed: false }] }); e.currentTarget.value = ''; } } }} /><button onClick={() => { const input = document.getElementById('shop-input') as HTMLInputElement; if (input.value) { updateDayData({ shoppingList: [...currentReport.shoppingList, { id: Date.now().toString(), text: input.value, completed: false }] }); input.value = ''; } }} className="bg-slate-900 p-2.5 rounded text-white hover:bg-black transition shadow-sm"><Plus className="w-4 h-4" /></button></div>
              </div>
            </SectionCard>

            <SectionCard title="지출 내역" icon={<CreditCard className="w-5 h-5" />} headerAction={renderSearchHeader('expense', '지출 내용으로 과거 검색...')}>
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-1 px-2">
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-tighter">{searchQueries.expense ? '검색된 지출 내역' : '당일 총 지출'}</span>
                  <span className="font-black text-red-500 text-xl">{formatCurrency((searchQueries.expense ? searchResults.expense : currentReport.expenses).reduce((acc: any, e: any) => acc + e.amount, 0))}</span>
                </div>
                {(searchQueries.expense ? searchResults.expense : currentReport.expenses).map((e: any) => (
                  <div key={e.id} className={`p-3 rounded-lg border shadow-sm transition-all ${searchQueries.expense ? 'bg-red-50/30 border-red-100' : 'bg-white border-red-100 hover:border-red-200'}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm font-black text-red-600">{formatCurrency(e.amount)}</div>
                        <div className="text-xs text-slate-600 font-medium">{e.description}</div>
                        {searchQueries.expense && <div className="text-[10px] text-red-400 font-bold mt-1">{e.date} 기록됨</div>}
                      </div>
                      {!searchQueries.expense && (
                        <div className="flex items-center gap-2">
                          <button onClick={() => startEditing(e)} className="text-slate-400 hover:text-red-600"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => { const updated = currentReport.expenses.filter((exp: any) => exp.id !== e.id); updateDayData({ expenses: updated }); }} className="text-slate-200 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {!searchQueries.expense && (
                  <>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100"><input id="e-amount" type="text" placeholder="금액" className={inputBaseClass} onInput={(e) => e.currentTarget.value = formatNumberWithCommas(e.currentTarget.value)} /><input id="e-desc" placeholder="지출 내용" className={inputBaseClass} /></div>
                    <button onClick={() => {
                      const aRaw = (document.getElementById('e-amount') as HTMLInputElement).value; const desc = (document.getElementById('e-desc') as HTMLInputElement).value;
                      if (aRaw) { updateDayData({ expenses: [...currentReport.expenses, { id: Date.now().toString(), amount: parseFormattedNumber(aRaw), description: desc }] }); ['e-amount', 'e-desc'].forEach(id => (document.getElementById(id) as HTMLInputElement).value = ''); }
                    }} className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 py-2.5 rounded-lg transition text-sm font-bold hover:bg-red-100 shadow-sm"><Plus className="w-4 h-4" /> 지출 추가</button>
                  </>
                )}
              </div>
            </SectionCard>
          </div>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-2xl flex justify-center z-40">
        <div className="max-w-6xl w-full flex items-center justify-between px-4">
          <div className="hidden md:flex items-center gap-8 border-r border-slate-100 pr-10">
            <div className="flex flex-col"><span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">일일 매출</span><span className="text-lg font-black text-blue-600">{formatCurrency(currentReport.payments.reduce((a:any,b:any)=>a+b.amount,0))}</span></div>
            <div className="flex flex-col"><span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">일일 지출</span><span className="text-lg font-black text-red-500">{formatCurrency(currentReport.expenses.reduce((a:any,b:any)=>a+b.amount,0))}</span></div>
          </div>
          <div className="flex items-center gap-6">
             <div className="flex flex-col items-end mr-2"><span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">실시간 정산 순익</span><span className={`text-2xl font-black ${(currentReport.payments.reduce((a:any,b:any)=>a+b.amount,0) - currentReport.expenses.reduce((a:any,b:any)=>a+b.amount,0)) >= 0 ? 'text-blue-800' : 'text-red-800'}`}>{formatCurrency(currentReport.payments.reduce((a:any,b:any)=>a+b.amount,0) - currentReport.expenses.reduce((a:any,b:any)=>a+b.amount,0))}</span></div>
             <div className="flex gap-2">
               <button onClick={() => window.print()} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-sm font-bold transition flex items-center gap-2 shadow-sm">PDF 출력</button>
              <div className="flex flex-col justify-center items-center">
                <div className="text-[9px] text-slate-400 font-bold mb-1">실시간 자동 저장됨</div>
                <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 flex items-center gap-2 shadow-inner"><CheckCircle2 size={16} /><span className="text-xs font-bold">Cloud Synced</span></div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
