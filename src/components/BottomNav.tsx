import React from 'react';
import { AppRoute, navigateTo } from '../services/router';
import { Peserta, Terapis } from '../types';

interface Props {
  currentPath: AppRoute;
  currentUser: {
    role: 'guest' | 'peserta' | 'terapis' | 'admin';
    peserta?: Peserta;
    terapis?: Terapis;
  };
}

export const BottomNav: React.FC<Props> = ({ currentPath, currentUser }) => {
  // Sesuai aturan: Tenaga ahli, admin, dan siswa yang login hanya fokus pada portal masing-masing tanpa navigasi publik
  if (currentUser.role === 'admin' || currentUser.role === 'terapis' || currentUser.role === 'peserta') {
    return null;
  }

  return (
    <nav 
      aria-label="Navigasi Bawah Mobile" 
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] no-print"
    >
      <div className="grid grid-cols-4 items-center h-16 max-w-md mx-auto px-2">
        {/* Tab 1: Home */}
        <button
          onClick={() => navigateTo('/')}
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] transition-colors ${currentPath === '/' ? 'text-sky-700 font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={currentPath === '/' ? 2.5 : 2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-[10px] tracking-tight">Beranda</span>
        </button>

        {/* Tab 2: Panduan Layanan */}
        <button
          onClick={() => navigateTo('/panduan-layanan')}
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] transition-colors ${currentPath === '/panduan-layanan' ? 'text-sky-700 font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={currentPath === '/panduan-layanan' ? 2.5 : 2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="text-[10px] tracking-tight">Panduan</span>
        </button>

        {/* Tab 3: Jadwal Terapi */}
        <button
          onClick={() => navigateTo('/daftar-jadwal')}
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] transition-colors ${currentPath === '/daftar-jadwal' ? 'text-sky-700 font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={currentPath === '/daftar-jadwal' ? 2.5 : 2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-[10px] tracking-tight">Jadwal</span>
        </button>

        {/* Tab 4: Portal Role Dynamic (Guest Masuk) */}
        <button
          onClick={() => navigateTo('/login-peserta')}
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] transition-colors ${currentPath === '/login-peserta' ? 'text-sky-700 font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-[10px] tracking-tight">Masuk</span>
        </button>
      </div>
    </nav>
  );
};
