
export type PaymentMethod = '카드' | '계좌이체' | '현금';

export interface Consultation {
  id: string;
  name: string;
  phone: string;
  part: string;
  content: string;
}

export interface Reservation {
  id: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  part: string;
  isPaid?: boolean;         // 첫수업 결제 여부
  isFormSubmitted?: boolean; // 첫수업 원서 제출 여부
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
}

export interface Payment {
  id: string;
  name: string;
  part: string;
  lessonType: string; 
  amount: number;
  method: PaymentMethod;
  isClbiz: boolean;
  isJournal: boolean;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

// 지속 노출 항목을 위한 래퍼
export interface PersistentWrapper<T> {
  data: T;
  createdAt: string; // YYYY-MM-DD
  deletedAt: string | null; // YYYY-MM-DD 또는 null
}

export interface DailyReport {
  date: string;
  manager: string;
  consultations: Consultation[];
  reservations: Reservation[];
  firstLessons: Reservation[]; 
  expenses: Expense[];
  fixedNotice: string;
  newNotice: string;
  shoppingList: TodoItem[];
  payments: Payment[];
}

export interface StateData {
  days: { [date: string]: Omit<DailyReport, 'consultations' | 'reservations' | 'firstLessons' | 'date' | 'manager'> & { manager?: string } };
  masterConsultations: PersistentWrapper<Consultation>[];
  masterReservations: PersistentWrapper<Reservation>[];
  masterFirstLessons: PersistentWrapper<Reservation>[];
}
