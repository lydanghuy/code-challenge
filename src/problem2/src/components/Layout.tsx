import { type ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Background with abstract shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50" />
        <div className="absolute top-40 -right-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-40 left-1/2 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl opacity-50 transform -translate-x-1/2" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-lg">
        {children}
      </div>
    </div>
  );
};
