import React, { useState } from 'react';
import { AppRoute, navigateTo } from '../services/router';
import { Peserta, Terapis } from '../types';
import { ULD_LOGO_BASE64 } from '../constants/logoData';

interface Props {
  currentPath: AppRoute;
  currentUser: {
    role: 'guest' | 'peserta' | 'terapis' | 'admin';
    peserta?: Peserta;
    terapis?: Terapis;
  };
  onLogout: () => void;
}

export const Navbar: React.FC<Props> = ({ currentPath, currentUser, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (path: AppRoute) => {
    navigateTo(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <button 
          onClick={() => {
            if (currentUser.role === 'admin') handleNav('/admin');
            else if (currentUser.role === 'terapis') handleNav('/portal-terapis');
            else handleNav('/');
          }}
          className="text-left group flex items-center gap-2.5 focus:outline-none"
        >
          <img
            src={ULD_LOGO_BASE64}
            alt="Logo ULD"
            className="w-9 h-9 rounded-xl object-contain bg-white shadow-xs p-0.5 border border-sky-200 shrink-0"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/logo-uld.jpg';
            }}
          />
          <div>
            <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 group-hover:text-sky-700 transition-colors block">
              ULD Kota Probolinggo
            </span>
            {currentUser.role === 'admin' && (
              <span className="text-[10px] text-sky-600 font-bold -mt-1 block">Panel Loket Administrasi</span>
            )}
            {currentUser.role === 'terapis' && (
              <span className="text-[10px] text-sky-600 font-bold -mt-1 block">Portal Tenaga Ahli / Psikolog</span>
            )}
            {currentUser.role === 'peserta' && (
              <span className="text-[10px] text-sky-600 font-bold -mt-1 block">Portal Mandiri Siswa Terapi</span>
            )}
          </div>
        </button>

        {/* Zone 2: Navigasi hanya untuk Tamu Publik (Bukan Siswa yang Login) */}
        {currentUser.role === 'guest' && (
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              onClick={() => handleNav('/')}
              className={`transition-colors hover:text-slate-900 whitespace-nowrap ${currentPath === '/' ? 'text-sky-700 font-semibold border-b-2 border-sky-700 pb-1' : ''}`}
            >
              Beranda
            </button>
            <button
              onClick={() => handleNav('/daftar-jadwal')}
              className={`transition-colors hover:text-slate-900 whitespace-nowrap ${currentPath === '/daftar-jadwal' ? 'text-sky-700 font-semibold border-b-2 border-sky-700 pb-1' : ''}`}
            >
              Jadwal Terapi (Publik)
            </button>
            <button
              onClick={() => handleNav('/panduan-layanan')}
              className={`transition-colors hover:text-slate-900 whitespace-nowrap ${currentPath === '/panduan-layanan' ? 'text-sky-700 font-semibold border-b-2 border-sky-700 pb-1' : ''}`}
            >
              Panduan Layanan
            </button>
          </nav>
        )}

        {/* Zone 3: Actions & Log Out */}
        <div className="flex items-center gap-3">
          {currentUser.role === 'guest' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleNav('/login-peserta')}
                className="px-3.5 py-2 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-50 rounded-lg transition-colors whitespace-nowrap"
              >
                Masuk Siswa
              </button>
              <button
                onClick={() => handleNav('/login-terapis')}
                className="hidden sm:inline-flex px-3.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 transition-colors whitespace-nowrap"
              >
                Terapis / Petugas
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-bold text-slate-900 truncate max-w-[150px]">
                  {currentUser.role === 'peserta' && currentUser.peserta?.namaLengkap}
                  {currentUser.role === 'terapis' && currentUser.terapis?.nama}
                  {currentUser.role === 'admin' && 'Petugas Loket ULD'}
                </div>
                <div className="text-[11px] text-sky-600 font-medium">
                  {currentUser.role === 'peserta' && 'Siswa Terdaftar'}
                  {currentUser.role === 'terapis' && currentUser.terapis?.spesialisasiLabel}
                  {currentUser.role === 'admin' && 'Sugeng / Helmi'}
                </div>
              </div>

              <button
                onClick={onLogout}
                className="px-3.5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-sm whitespace-nowrap flex items-center gap-1.5 active:scale-95"
                title="Keluar dan Kembali ke Beranda"
              >
                <span>🚪 Log Out</span>
                <span className="hidden sm:inline">(Ke Beranda)</span>
              </button>
            </div>
          )}

          {/* Mobile hamburger button hanya untuk tamu publik */}
          {currentUser.role === 'guest' && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-700 hover:text-slate-900 focus:outline-none"
              aria-label="Buka menu navigasi"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2 shadow-lg">
          <button
            onClick={() => handleNav('/')}
            className="w-full text-left py-2 px-3 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Beranda
          </button>
          <button
            onClick={() => handleNav('/daftar-jadwal')}
            className="w-full text-left py-2 px-3 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Jadwal Terapi & Peserta Terjadwal
          </button>
          <button
            onClick={() => handleNav('/panduan-layanan')}
            className="w-full text-left py-2 px-3 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Panduan & Alur Layanan
          </button>

          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <button
              onClick={() => handleNav('/login-peserta')}
              className="w-full text-left py-2 px-3 rounded-lg text-sm font-medium text-sky-700 bg-sky-50"
            >
              Masuk Peserta Terdaftar (PIN)
            </button>
            <button
              onClick={() => handleNav('/login-terapis')}
              className="w-full text-left py-2 px-3 rounded-lg text-sm font-medium text-slate-700 bg-slate-100"
            >
              Login Terapis / PLB / Psikolog
            </button>
            <button
              onClick={() => handleNav('/admin')}
              className="w-full text-left py-2 px-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Panel Admin ULD (Verifikasi Berkas)
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
