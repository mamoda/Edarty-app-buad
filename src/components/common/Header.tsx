// Header.tsx
import React from 'react';

interface HeaderProps {
  // أضف props هنا
}

export default function Header({}: HeaderProps) {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Header</h1>
      <p>جاري التطوير...</p>
    </div>
  );
}
