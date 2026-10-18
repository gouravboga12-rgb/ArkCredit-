import React from 'react';
import { Outlet } from 'react-router-dom';
import { PhoneFrame } from './PhoneFrame';

interface ConsumerLayoutProps {
  children?: React.ReactNode;
}

export const ConsumerLayout: React.FC<ConsumerLayoutProps> = ({ children }) => {
  return (
    <PhoneFrame>
      {children || <Outlet />}
    </PhoneFrame>
  );
};
