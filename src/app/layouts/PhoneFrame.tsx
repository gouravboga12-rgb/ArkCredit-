import React from 'react';

interface PhoneFrameProps {
  children: React.ReactNode;
}

export const PhoneFrame: React.FC<PhoneFrameProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-akr-bg text-white w-full max-w-md mx-auto flex flex-col relative shadow-2xl">
      {children}
    </div>
  );
};

