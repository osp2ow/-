
export const getManagerForDate = (date: Date): string => {
  const day = date.getDay(); // 0 (Sun) to 6 (Sat)
  
  // 월(1), 수(3), 금(5) -> 오세혁
  if (day === 1 || day === 3 || day === 5) {
    return '오세혁';
  }
  
  // 화(2), 목(4), 토(6) -> 한인성
  if (day === 2 || day === 4 || day === 6) {
    return '한인성';
  }

  // 일(0) -> 담당자 없음
  return '담당자 없음';
};

export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getDayOfWeek = (dateString: string): string => {
  if (!dateString) return '';
  const [y, m, d] = dateString.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[date.getDay()];
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
};

export const getTimeSlots = () => {
  const slots = [];
  for (let hour = 9; hour <= 22; hour++) {
    const h = hour.toString().padStart(2, '0');
    slots.push(`${h}:00`);
    slots.push(`${h}:30`);
  }
  return slots;
};

/**
 * Formats a numeric string with thousand separators (commas)
 */
export const formatNumberWithCommas = (value: string): string => {
  const numericValue = value.replace(/[^0-9]/g, '');
  return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Removes commas from a string and converts to number
 */
export const parseFormattedNumber = (value: string): number => {
  return Number(value.replace(/,/g, ''));
};

/**
 * Formats a numeric string into a Korean phone number format (010-XXXX-XXXX)
 */
export const formatPhoneNumber = (value: string): string => {
  const input = value.replace(/\D/g, '');
  let formatted = input;
  
  if (input.length > 3 && input.length <= 7) {
    formatted = `${input.slice(0, 3)}-${input.slice(3)}`;
  } else if (input.length > 7) {
    formatted = `${input.slice(0, 3)}-${input.slice(3, 7)}-${input.slice(7, 11)}`;
  }
  
  return formatted;
};
