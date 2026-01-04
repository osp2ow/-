
export type PaymentMethod = '카드' | '계좌이체' | '현금';

export interface Consultation {
  id: string;
  name: string;
  phone: string;
  part: string;
  content: string;
  date?: string; // 검색 결과 표시용
}

export interface Reservation {
  id: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  part: string;
  isPaid?: boolean;
  isFormSubmitted?: boolean;
  createdAt?: string; // 검색 결과 표시용 (기록된 날짜)
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  date?: string; // 검색 결과 표시용
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
  date?: string; // 검색 결과 표시용
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface PersistentWrapper<T> {
  data: T;
  createdAt: string; 
  deletedAt: string | null;
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
  days: { [date: string]: Omit<DailyReport, 'consultations' | 'reservations' | 'firstLessons' | 'fixedNotice' | 'newNotice' | 'date' | 'manager' | 'shoppingList'> & { manager?: string } };
  masterConsultations: PersistentWrapper<Consultation>[];
  masterReservations: PersistentWrapper<Reservation>[];
  masterFirstLessons: PersistentWrapper<Reservation>[];
  masterFixedNotices: PersistentWrapper<string>[];
  masterNewNotices: PersistentWrapper<string>[];
  masterShoppingList: PersistentWrapper<TodoItem>[];
}
