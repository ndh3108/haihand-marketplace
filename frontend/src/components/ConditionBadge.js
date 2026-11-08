import React from 'react';

export const ConditionBadge = ({ condition, className = '' }) => {
  const styles = {
    'Mới': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Như mới': 'bg-blue-100 text-blue-700 border-blue-200',
    'Đã qua sử dụng': 'bg-stone-100 text-stone-700 border-stone-200',
    'Cũ': 'bg-amber-100 text-amber-800 border-amber-200'
  };

  const currentStyle = styles[condition] || styles['Đã qua sử dụng'];

  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${currentStyle} ${className}`}>
      {condition}
    </span>
  );
};
