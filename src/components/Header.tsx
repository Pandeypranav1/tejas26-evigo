"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

function isActiveNavPath(pathname: string, href: string) {
  return (
    pathname === href ||
    (href === "/events" && pathname.startsWith("/events")) ||
    (href === "/travel-tourism" && (pathname.startsWith("/travel-tourism") || pathname.startsWith("/services/tourism"))) ||
    (href === "/hotels" && pathname.startsWith("/hotels"))
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = isActiveNavPath(pathname, href);
  return (
    <Link
      href={href}
      className={`group relative whitespace-nowrap text-[13px] font-semibold transition-colors duration-300 ${active ? "text-orange-400" : "text-white/75 hover:text-white"}`}
    >
      {children}
      <span className={`absolute -bottom-2 left-0 h-0.5 rounded-full bg-orange-400 transition-all duration-300 ${active ? "w-full" : "w-0 group-hover:w-full"}`} />
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

  const initial = user?.email ? user.email.charAt(0).toUpperCase() : "U";

  return (
    <div className="relative flex items-center" ref={dropRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 p-[2px] transition-all hover:scale-105 hover:shadow-md focus:outline-none bg-white/10"
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
        className={`absolute right-0 top-full mt-3 w-56 origin-top-right rounded-2xl border border-white/10 bg-[#1E293B] p-2 shadow-xl transition-all duration-300 ${open ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"
          }`}
      >
        <div className="px-3 py-2 border-b border-white/10 mb-2">
          <div className="text-xs font-semibold text-white/50 uppercase tracking-wider">{role === "provider" ? "Partner" : "Client"}</div>
          <div className="text-sm font-bold text-white truncate mt-0.5">{user.email}</div>
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
        <button onClick={() => { setOpen(false); onSignOut(); }} className="mt-1 flex w-full items-center px-3 py-2.5 text-sm font-medium text-red-400 rounded-xl hover:bg-red-500/10 transition-colors">
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
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = () => {
    signOut();
    router.push("/");
    setMenuOpen(false);
  };

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => { if (window.innerWidth >= 1280) setMenuOpen(false); };
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
      <header className="sticky top-0 z-[70] w-full bg-[#0F172A]/95 backdrop-blur-xl border-b border-white/10 shadow-sm">
        <PageContainer className="flex h-20 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2" onClick={() => setMenuOpen(false)}>
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
              <span className="text-xl font-black text-white">E</span>
            </div>
            <span className="text-2xl font-black tracking-tight text-white transition-colors group-hover:text-violet-400">
              Evigo
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden xl:flex items-center gap-4">
            <NavLink href="/">Home</NavLink>
            <NavLink href="/combo-packs">Combo Packs</NavLink>
            <NavLink href="/events">Events &amp; Services</NavLink>
            <NavLink href="/travel-tourism">Travel &amp; Tourism</NavLink>
            <NavLink href="/hotels">Hotels &amp; Venues</NavLink>
            <NavLink href="/about">About</NavLink>
            <NavLink href="/contact">Contact</NavLink>
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden xl:flex items-center gap-3">
            <Link href="/explore" aria-label="Search services" className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </Link>
            {!user ? (
              <>
                <Link href="/login" className="inline-flex items-center justify-center px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition-colors border border-white/20">
                  Login
                </Link>
                <Link href="/explore" className="inline-flex items-center justify-center px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors shadow-sm">
                  Book a Service
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Link href="/explore" className="inline-flex items-center justify-center px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors shadow-sm">
                  Book a Service
                </Link>
                <AvatarDropdown user={user} role={role} onSignOut={handleSignOut} />
              </div>
            )}
          </div>

          {/* Mobile hamburger button */}
          <button
            className="relative z-[60] flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 transition-colors hover:bg-white/20 xl:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
          >
            <span className={`block h-0.5 w-5 rounded-full bg-white transition-transform duration-300 ${menuOpen ? 'translate-y-2 rotate-45' : ''}`} />
            <span className={`block h-0.5 w-5 rounded-full bg-white transition-opacity duration-300 ${menuOpen ? 'opacity-0' : 'opacity-100'}`} />
            <span className={`block h-0.5 w-5 rounded-full bg-white transition-transform duration-300 ${menuOpen ? '-translate-y-2 -rotate-45' : ''}`} />
          </button>
        </PageContainer>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-[55] bg-black/50 backdrop-blur-xl transition-opacity duration-300 xl:hidden ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        onClick={() => setMenuOpen(false)}
      />

      {/* Mobile Menu Slide-in Panel */}
      <div
        id="mobile-navigation"
        className={`fixed top-0 right-0 z-[56] h-full w-[min(340px,88vw)] bg-[#0F172A] border-l border-white/10 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-out xl:hidden flex flex-col ${menuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <div className="flex flex-col flex-1 px-6 pt-24 pb-8 overflow-y-auto">
          {user && (
            <div className="mb-8 flex items-center gap-4 rounded-2xl bg-white/5 p-4 border border-white/10 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-violet-500 to-cyan-500" />
              {user.profileImage ? (
                <img src={user.profileImage} alt="Profile" className="h-12 w-12 rounded-full object-cover shadow-inner ring-2 ring-white/20" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-lg font-bold text-white shadow-inner ring-2 ring-white/20">
                  {user.email ? user.email.charAt(0).toUpperCase() : "U"}
                </div>
              )}
              <div>
                <div className="text-[10px] font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 uppercase tracking-widest">{role === "provider" ? "Partner" : "Client"}</div>
                <div className="text-sm font-bold text-white truncate mt-0.5">{user.email}</div>
              </div>
            </div>
          )}

          <nav className="flex flex-col gap-2">
            <Link href="/explore" aria-label="Search services" className="group flex items-center justify-between border-b border-white/10 py-4 text-lg font-bold text-cyan-300 transition-colors hover:text-white" onClick={() => setMenuOpen(false)}>
              Search services
              <svg className="h-5 w-5 text-cyan-300/70 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35m1.35-5.15a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
              </svg>
            </Link>
            <Link href="/" className={`group flex items-center justify-between py-4 text-lg font-bold transition-colors border-b border-white/10 hover:text-white ${isActiveNavPath(pathname, "/") ? "text-orange-400" : "text-white/80"}`} onClick={() => setMenuOpen(false)}>
              Home
              <svg className="h-5 w-5 text-white/30 transition-transform group-hover:translate-x-1 group-hover:text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
            <Link href="/combo-packs" className={`group flex items-center justify-between py-4 text-lg font-bold transition-colors border-b border-white/10 hover:text-white ${isActiveNavPath(pathname, "/combo-packs") ? "text-orange-400" : "text-white/80"}`} onClick={() => setMenuOpen(false)}>
              <span className="flex items-center gap-2">
                <span>🎁</span>
                <span>Combo Packs</span>
              </span>
              <svg className="h-5 w-5 text-white/30 transition-transform group-hover:translate-x-1 group-hover:text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
            <Link href="/events" className={`group flex items-center justify-between py-4 text-lg font-bold transition-colors border-b border-white/10 hover:text-white ${isActiveNavPath(pathname, "/events") ? "text-orange-400" : "text-white/80"}`} onClick={() => setMenuOpen(false)}>
              Events &amp; Services
              <svg className="h-5 w-5 text-white/30 transition-transform group-hover:translate-x-1 group-hover:text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
            <Link href="/travel-tourism" className={`group flex items-center justify-between py-4 text-lg font-bold transition-colors border-b border-white/10 hover:text-orange-400 ${isActiveNavPath(pathname, "/travel-tourism") ? "text-orange-400" : "text-white/80"}`} onClick={() => setMenuOpen(false)}>
              Travel & Tourism
              <svg className="h-5 w-5 text-white/30 transition-transform group-hover:translate-x-1 group-hover:text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
            <Link href="/hotels" className={`group flex items-center justify-between py-4 text-lg font-bold transition-colors border-b border-white/10 hover:text-white ${isActiveNavPath(pathname, "/hotels") ? "text-orange-400" : "text-white/80"}`} onClick={() => setMenuOpen(false)}>
              Hotels &amp; Venues
              <svg className="h-5 w-5 text-white/30 transition-transform group-hover:translate-x-1 group-hover:text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
            <Link href="/about" className="group flex items-center justify-between text-lg font-bold text-white/80 py-4 border-b border-white/10 hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>
              About
              <svg className="h-5 w-5 text-white/30 transition-transform group-hover:translate-x-1 group-hover:text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
            <Link href="/contact" className="group flex items-center justify-between text-lg font-bold text-white/80 py-4 border-b border-white/10 hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>
              Contact
              <svg className="h-5 w-5 text-white/30 transition-transform group-hover:translate-x-1 group-hover:text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>

            {user && (
              <>
                <Link href="#" className="group flex items-center justify-between text-lg font-bold text-white/80 py-4 border-b border-white/10 hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>
                  My Profile
                  <svg className="h-5 w-5 text-white/30 transition-transform group-hover:translate-x-1 group-hover:text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
                <Link href={role === "provider" ? "/provider/dashboard" : "/dashboard"} className="group flex items-center justify-between text-lg font-bold text-white/80 py-4 border-b border-white/10 hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>
                  Dashboard
                  <svg className="h-5 w-5 text-white/30 transition-transform group-hover:translate-x-1 group-hover:text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
              </>
            )}
          </nav>

          <div className="mt-auto pt-8 flex flex-col gap-4">
            <Link href="/explore" className="flex w-full items-center justify-center rounded-xl bg-orange-500 px-6 py-4 text-base font-bold text-white transition-colors hover:bg-orange-600" onClick={() => setMenuOpen(false)}>
              Book Service
            </Link>
            {!user ? (
              <>
                <Link href="/login" className="flex w-full items-center justify-center rounded-xl bg-white/10 border border-white/20 px-6 py-4 text-base font-bold text-white transition-colors hover:bg-white/20" onClick={() => setMenuOpen(false)}>
                  Login
                </Link>
                <Link href="/partner" className="group relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-6 py-4 text-base font-bold text-white shadow-[0_4px_20px_rgba(139,92,246,0.3)] transition-all hover:shadow-[0_4px_30px_rgba(56,189,248,0.5)]" onClick={() => setMenuOpen(false)}>
                  <span className="absolute inset-0 bg-white/20 translate-y-full transition-transform group-hover:translate-y-0" />
                  <span className="relative">Become a Partner</span>
                </Link>
              </>
            ) : (
              <button onClick={handleSignOut} className="flex w-full items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 px-6 py-4 text-base font-bold text-red-400 transition-colors hover:bg-red-500/20">
                Sign Out
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
