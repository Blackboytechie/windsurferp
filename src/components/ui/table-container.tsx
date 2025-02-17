import React from 'react';

interface TableContainerProps {
  children: React.ReactNode;
}

export function TableContainer({ children }: TableContainerProps) {
  return (
    <div className="w-full overflow-auto rounded-md border">
      <div className="min-w-[800px]">
        {children}
      </div>
    </div>
  );
}
