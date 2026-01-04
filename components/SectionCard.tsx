
import React from 'react';

interface SectionCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode; // 헤더 우측에 추가할 액션 (검색창 등)
}

const SectionCard: React.FC<SectionCardProps> = ({ title, icon, children, className = "", headerAction }) => {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-blue-600">{icon}</span>
          <h3 className="font-bold text-slate-800">{title}</h3>
        </div>
        {headerAction && (
          <div className="flex-1 max-w-[200px] ml-4">
            {headerAction}
          </div>
        )}
      </div>
      <div className="p-5">
        {children}
      </div>
    </div>
  );
};

export default SectionCard;
