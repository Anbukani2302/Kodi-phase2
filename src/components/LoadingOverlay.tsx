// components/LoadingOverlay.tsx
// Simple loading overlay to prevent white screens

import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  show: boolean;
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  show, 
  message = 'Loading...', 
  size = 'md' 
}) => {
  // Don't render if not showing
  if (!show) return null;

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className="fixed inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className={`${sizeClasses[size]} text-blue-600 animate-spin`} />
        {message && (
          <p className="text-gray-600 text-sm font-medium">{message}</p>
        )}
      </div>
    </div>
  );
};

export default LoadingOverlay;
