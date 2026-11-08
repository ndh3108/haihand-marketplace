import React from 'react';

export const Button = ({ variant = 'primary', className = '', children, ...props }) => {
  const baseStyle = "inline-flex items-center justify-center font-semibold rounded-lg px-4 py-2 transition-colors";
  
  const variants = {
    primary: "bg-[#FACC15] hover:bg-[#EAB308] text-[#1C1917]",
    secondary: "bg-white hover:bg-stone-100 text-[#1C1917] border border-[#E7E5E4]",
    dark: "bg-[#1C1917] hover:bg-stone-800 text-white"
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
