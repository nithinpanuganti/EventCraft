import React from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { AuthProvider } from "./AuthContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="relative flex min-h-screen bg-surface-50 text-surface-900 antialiased selection:bg-primary-100 selection:text-primary-800">
        {/* Ambient Liquid Light Canvas (Fixed, lightweight, static optical depth) */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-32 right-1/4 h-[550px] w-[550px] rounded-full bg-gradient-to-br from-primary-400/10 via-primary-300/5 to-transparent blur-[120px]" />
          <div className="absolute top-1/3 -left-24 h-[450px] w-[450px] rounded-full bg-gradient-to-tr from-accent-400/8 via-accent-300/4 to-transparent blur-[100px]" />
          <div className="absolute -bottom-24 right-1/3 h-[500px] w-[500px] rounded-full bg-gradient-to-tl from-warning-400/6 via-primary-400/5 to-transparent blur-[110px]" />
        </div>

        {/* Desktop Navigation Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-x-hidden">
          <Header />
          <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto transition-opacity duration-200">
            {children}
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
