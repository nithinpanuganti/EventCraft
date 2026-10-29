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

        {/* Desktop Navigation Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-x-hidden min-w-0">
          <Header />
          <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto transition-opacity duration-200">
            {children}
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
