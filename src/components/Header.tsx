"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link 
      href={href} 
      className={`relative font-semibold text-[15px] transition-colors duration-300 ${
        active ? "text-white" : "text-white/60 hover:text-white"
      } group`}
    >
      {children}
      <span className={`absolute -bottom-1.5 left-0 h-[2px] rounded-full bg-gradient-to-r from-violet-400 to-cyan-400 transition-all duration-300 ${
        active ? "w-full shadow-[0_0_8px_rgba(167,139,250,0.8)]" : "w-0 group-hover:w-full"
      }`} />
    </Link>
  );
}

function AvatarDropdown({ user, role, onSignOut }: { user: any, role: string | null, onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initial = user?.phone ? user.phone.charAt(0) : "U";

  return (
    <div className="relative flex items-center" ref={dropRef}>
      <button 
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 p-[2px] transition-all hover:scale-105 hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] focus:outline-none"
      >
        {user?.profileImage ? (
          <img src={user.profileImage} alt="Profile" className="h-full w-full rounded-full object-cover shadow-inner" />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-sm font-bold text-white shadow-inner">
            {initial}
          </div>
        )}
      </button>

      <div 
        className={`absolute right-0 top-full mt-3 w-56 origin-top-right rounded-2xl border border-white/10 bg-[#0f0a1e]/95 p-2 shadow-2xl backdrop-blur-xl transition-all duration-300 ${
          open ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"
        }`}
      >
        <div className="px-3 py-2 border-b border-white/10 mb-2">
          <div className="text-xs font-semibold text-white/50 uppercase tracking-wider">{role === "provider" ? "Partner" : "Client"}</div>
          <div className="text-sm font-bold text-white truncate mt-0.5">{user.phone}</div>
        </div>
        
        <Link href="#" className="flex w-full items-center px-3 py-2.5 text-sm font-medium text-white/80 rounded-xl hover:bg-white/10 hover:text-white transition-colors" onClick={() => setOpen(false)}>
          Profile
        </Link>
        <Link href="#" className="flex w-full items-center px-3 py-2.5 text-sm font-medium text-white/80 rounded-xl hover:bg-white/10 hover:text-white transition-colors" onClick={() => setOpen(false)}>
          My Bookings
        </Link>
        <Link href={role === "provider" ? "/provider/dashboard" : "/dashboard"} className="flex w-full items-center px-3 py-2.5 text-sm font-medium text-white/80 rounded-xl hover:bg-white/10 hover:text-white transition-colors" onClick={() => setOpen(false)}>
          Dashboard
        </Link>
        <button onClick={() => { setOpen(false); onSignOut(); }} className="mt-1 flex w-full items-center px-3 py-2.5 text-sm font-medium text-red-400 rounded-xl hover:bg-red-400/10 transition-colors">
          Logout
        </button>
      </div>
    </div>
  );
}

import { PageContainer } from "@/components/PageContainer";

export function Header() {
  const { user, role, signOut } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = () => {
    signOut();
    router.push("/");
    setMenuOpen(false);
  };

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => { if (window.innerWidth >= 768) setMenuOpen(false); };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent scroll when mobile menu open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [menuOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-[#05030f]/70 backdrop-blur-2xl border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)] before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-r before:from-violet-500/10 before:via-transparent before:to-cyan-500/10">
        <PageContainer className="flex h-20 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2" onClick={() => setMenuOpen(false)}>
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
              <span className="text-xl font-black text-white">E</span>
            </div>
            <span className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 transition-colors group-hover:from-violet-400 group-hover:to-cyan-400">
              Evigo
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 bg-white/[0.03] px-8 py-2.5 rounded-full border border-white/5 shadow-inner">
            <NavLink href="/explore">Explore</NavLink>
            <NavLink href="/services">Services</NavLink>
            <NavLink href="/#travel-tourism">Travel & Tourism</NavLink>
            <NavLink href="/about">About</NavLink>
            <NavLink href="/contact">Contact</NavLink>
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-5">
            {!user ? (
              <>
                <Link href="/login/client" className="text-[14px] font-semibold text-white/70 hover:text-white transition-colors relative after:absolute after:-bottom-1 after:left-0 after:h-[2px] after:w-0 after:bg-white after:transition-all hover:after:w-full">
                  Login
                </Link>
                <div className="h-5 w-px bg-white/10" />
                <Link href="/partner" className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all hover:scale-105 hover:shadow-[0_0_25px_rgba(56,189,248,0.5)]">
                  Become a Partner
                </Link>
                <Link href="/explore" className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-white text-[#05030f] px-6 py-2.5 font-bold shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]">
                  <span className="relative flex items-center gap-2">
                    Book Now
                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </span>
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Link href="/explore" className="hidden lg:flex group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-white text-[#05030f] px-5 py-2.5 text-sm font-bold shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all hover:scale-105 hover:shadow-[0_0_25px_rgba(255,255,255,0.5)]">
                  Book Service
                </Link>
                <AvatarDropdown user={user} role={role} onSignOut={handleSignOut} />
              </div>
            )}
          </div>

          {/* Mobile hamburger button */}
          <button
            className="md:hidden relative z-[60] flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md transition-colors hover:bg-white/10"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span className={`block h-0.5 w-5 rounded-full bg-white transition-transform duration-300 ${menuOpen ? 'translate-y-2 rotate-45' : ''}`} />
            <span className={`block h-0.5 w-5 rounded-full bg-white transition-opacity duration-300 ${menuOpen ? 'opacity-0' : 'opacity-100'}`} />
            <span className={`block h-0.5 w-5 rounded-full bg-white transition-transform duration-300 ${menuOpen ? '-translate-y-2 -rotate-45' : ''}`} />
          </button>
        </PageContainer>
      </header>

      {/* Mobile Menu Overlay */}
      <div 
        className={`fixed inset-0 z-[55] bg-[#05030f]/80 backdrop-blur-xl transition-opacity duration-300 md:hidden ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMenuOpen(false)}
      />

      {/* Mobile Menu Slide-in Panel */}
      <div 
        className={`fixed top-0 right-0 z-[56] h-full w-[300px] bg-[#0a0616] border-l border-white/10 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-out md:hidden flex flex-col ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 px-6 pt-24 pb-8 overflow-y-auto">
          {user && (
            <div className="mb-8 flex items-center gap-4 rounded-2xl bg-gradient-to-br from-white/[0.05] to-transparent p-4 border border-white/10 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-violet-500 to-cyan-500" />
              {user.profileImage ? (
                <img src={user.profileImage} alt="Profile" className="h-12 w-12 rounded-full object-cover shadow-inner ring-2 ring-white/10" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-lg font-bold text-white shadow-inner ring-2 ring-white/10">
                  {user.phone ? user.phone.charAt(0) : "U"}
                </div>
              )}
              <div>
                <div className="text-[10px] font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 uppercase tracking-widest">{role === "provider" ? "Partner" : "Client"}</div>
                <div className="text-sm font-bold text-white truncate mt-0.5">{user.phone}</div>
              </div>
            </div>
          )}

          <nav className="flex flex-col gap-2">
            <Link href="/explore" className="group flex items-center justify-between text-lg font-bold text-white/80 py-4 border-b border-white/5 hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>
              Explore Services
              <svg className="h-5 w-5 text-white/20 transition-transform group-hover:translate-x-1 group-hover:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
            <Link href="/services" className="group flex items-center justify-between text-lg font-bold text-white/80 py-4 border-b border-white/5 hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>
              All Services
              <svg className="h-5 w-5 text-white/20 transition-transform group-hover:translate-x-1 group-hover:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
            <Link href="/#travel-tourism" className="group flex items-center justify-between text-lg font-bold text-white/80 py-4 border-b border-white/5 hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>
              Travel & Tourism
              <svg className="h-5 w-5 text-white/20 transition-transform group-hover:translate-x-1 group-hover:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
            <Link href="/about" className="group flex items-center justify-between text-lg font-bold text-white/80 py-4 border-b border-white/5 hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>
              About Us
              <svg className="h-5 w-5 text-white/20 transition-transform group-hover:translate-x-1 group-hover:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
            <Link href="/contact" className="group flex items-center justify-between text-lg font-bold text-white/80 py-4 border-b border-white/5 hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>
              Contact
              <svg className="h-5 w-5 text-white/20 transition-transform group-hover:translate-x-1 group-hover:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
            
            {user && (
              <>
                <Link href="#" className="group flex items-center justify-between text-lg font-bold text-white/80 py-4 border-b border-white/5 hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>
                  My Profile
                  <svg className="h-5 w-5 text-white/20 transition-transform group-hover:translate-x-1 group-hover:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
                <Link href={role === "provider" ? "/provider/dashboard" : "/dashboard"} className="group flex items-center justify-between text-lg font-bold text-white/80 py-4 border-b border-white/5 hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>
                  Dashboard
                  <svg className="h-5 w-5 text-white/20 transition-transform group-hover:translate-x-1 group-hover:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
              </>
            )}
          </nav>

          <div className="mt-auto pt-8 flex flex-col gap-4">
            {!user ? (
              <>
                <Link href="/login/client" className="flex w-full items-center justify-center rounded-xl bg-white/5 border border-white/10 px-6 py-4 text-base font-bold text-white transition-colors hover:bg-white/10" onClick={() => setMenuOpen(false)}>
                  Client Login
                </Link>
                <Link href="/partner" className="group relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-6 py-4 text-base font-bold text-white shadow-[0_4px_20px_rgba(139,92,246,0.3)] transition-all hover:shadow-[0_4px_30px_rgba(56,189,248,0.5)]" onClick={() => setMenuOpen(false)}>
                  <span className="absolute inset-0 bg-white/20 translate-y-full transition-transform group-hover:translate-y-0" />
                  <span className="relative">Become a Partner</span>
                </Link>
              </>
            ) : (
              <button onClick={handleSignOut} className="flex w-full items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 px-6 py-4 text-base font-bold text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300">
                Sign Out
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
