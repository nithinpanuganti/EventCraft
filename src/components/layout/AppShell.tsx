import React from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { AuthProvider } from "./AuthContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="relative flex min-h-screen bg-surface-50 text-surface-900 antialiased selection:bg-primary-100 selection:text-primary-800">
        {/* Layered Liquid Ambient Mesh (Hardware-accelerated, zero animation cost, strict containment) */}
        <div
          className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
          style={{ transform: "translate3d(0,0,0)", willChange: "transform", contain: "strict" }}
          aria-hidden="true"
        >
          {/* Top-Right Luminous Violet Light Field */}
          <div className="absolute -top-36 right-10 h-[640px] w-[640px] rounded-full bg-gradient-to-br from-primary-400/20 via-primary-300/10 to-transparent blur-[130px]" />
          
          {/* Mid-Left Cool Indigo & Lavender Field */}
          <div className="absolute top-1/4 -left-28 h-[560px] w-[560px] rounded-full bg-gradient-to-tr from-accent-400/16 via-primary-300/10 to-transparent blur-[120px]" />
          
          {/* Bottom-Center Warm Amber & Violet Accent Field */}
          <div className="absolute -bottom-32 right-1/4 h-[580px] w-[580px] rounded-full bg-gradient-to-tl from-warning-400/10 via-primary-400/10 to-transparent blur-[140px]" />

          {/* Center-Top Subtle Specular Glare Field */}
          <div className="absolute top-0 left-1/3 h-[300px] w-[450px] rounded-full bg-gradient-to-b from-primary-200/20 to-transparent blur-[100px]" />

          {/* Microscopic Refraction Grid Pattern */}
          <div
            className="absolute inset-0 opacity-[0.02] mix-blend-overlay"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, #4c1d95 1px, transparent 0)`,
              backgroundSize: "32px 32px",
            }}
          />
        </div>

        {/* Skip to Main Content Link for Keyboard and Screen Reader Accessibility (WCAG 2.4.1) */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-xl focus:bg-primary-600 focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-white focus:shadow-glass-elevated focus:outline-none focus:ring-2 focus:ring-primary-300 transition-all"
        >
          Skip to main content
        </a>

        {/* Desktop Navigation Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-x-hidden min-w-0">
          <Header />
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 px-4 py-8 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto transition-opacity duration-200 outline-none"
          >
            {children}
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
