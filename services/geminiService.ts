
import { GoogleGenAI, Type } from "@google/genai";
import { DailyReport } from "../types";

export const generateDailySummary = async (report: DailyReport): Promise<string> => {
  // Use process.env.API_KEY directly for initialization as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    다음은 주니퍼실용음악학원의 일일 결산 내역입니다. 
    오늘의 운영 현황을 한 문장으로 요약하고, 특이사항이나 개선 제안을 간단히 적어주세요.
    
    날짜: ${report.date}
    담당자: ${report.manager}
    상담 건수: ${report.consultations.length}
    체험레슨 예약: ${report.reservations.length}
    총 지출: ${report.expenses.reduce((acc, curr) => acc + curr.amount, 0)}원
    총 매출: ${report.payments.reduce((acc, curr) => acc + curr.amount, 0)}원
    전달사항: ${report.newNotice}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // response.text is a property, not a method.
    return response.text || "요약을 생성할 수 없습니다.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI 분석 중 오류가 발생했습니다.";
  }
};
