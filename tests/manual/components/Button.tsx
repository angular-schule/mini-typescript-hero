import React from 'react';

export const Button: React.FC<{ onClick?: () => void; children: React.ReactNode }> = ({ onClick, children }) => {
  return <button onClick={onClick}>{children}</button>;
};
