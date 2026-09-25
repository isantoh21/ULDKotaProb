/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAppRouter, navigateTo } from './services/router';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { SimulasiAkunBar } from './components/SimulasiAkunBar';
import { Home } from './pages/Home';
import { GuestAsesmen } from './pages/GuestAsesmen';
import { TiketAsesmen } from './pages/TiketAsesmen';
import { LoginPeserta } from './pages/LoginPeserta';
import { PortalPeserta } from './pages/PortalPeserta';
import { DaftarJadwal } from './pages/DaftarJadwal';
import { LoginTerapis } from './pages/LoginTerapis';
import { PortalTerapis } from './pages/PortalTerapis';
import { AdminDashboard } from './pages/AdminDashboard';
import { PanduanLayanan } from './pages/PanduanLayanan';
import { Peserta, Terapis, UserRole } from './types';
import { db } from './services/supabase';

interface CurrentUserState {
  role: UserRole;
  peserta?: Peserta;
  terapis?: Terapis;
}

const SESSION_KEY = 'uld_prob_active_session_v1';

export default function App() {
  const { route, navigate } = useAppRouter();
  const [isMobileFrameMode, setIsMobileFrameMode] = useState<boolean>(false);

  // Restore session or default to guest
  const [currentUser, setCurrentUser] = useState<CurrentUserState>(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return { role: 'guest' };
  });

  useEffect(() => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
  }, [currentUser]);

  const handleLogout = () => {
    setCurrentUser({ role: 'guest' });
    navigate('/');
  };

  const handleSwitchUser = (role: UserRole, data?: Peserta | Terapis) => {
    if (role === 'peserta') {
      setCurrentUser({ role: 'peserta', peserta: data as Peserta });
    } else if (role === 'terapis') {
      setCurrentUser({ role: 'terapis', terapis: data as Terapis });
    } else if (role === 'admin') {
      setCurrentUser({ role: 'admin' });
    } else {
      setCurrentUser({ role: 'guest' });
    }
  };

  // Render current active page based on clean URL route
  const renderCurrentPage = () => {
    // ATURAN USER 1: Setelah login terapis, psikolog atau admin HANYA bisa melihat lamannya di panel kerja masing-masing.
    // Atau log out untuk kembali ke beranda.
    if (currentUser.role === 'admin') {
      return (
        <AdminDashboard 
          onLogout={handleLogout} 
        />
      );
    }

    if (currentUser.role === 'peserta' && currentUser.peserta) {
      return (
        <PortalPeserta 
          peserta={currentUser.peserta} 
          onLogout={handleLogout} 
        />
      );
    }

    if (currentUser.role === 'terapis' && currentUser.terapis) {
      return (
        <PortalTerapis 
          terapis={currentUser.terapis} 
          onLogout={handleLogout} 
          initialTab={route.path === '/log-aktivitas' && currentUser.terapis.spesialisasi === 'psikolog' ? 'log_aktivitas' : undefined}
        />
      );
    }

    switch (route.path) {
      case '/':
        return <Home />;

      case '/asesmen-guest':
        // Halaman asesmen guest ditiadakan sesuai instruksi user, dialihkan ke jadwal publik
        return <DaftarJadwal currentPeserta={currentUser.peserta} />;

      case '/tiket-asesmen':
        return <TiketAsesmen guestId={route.params.id} />;

      case '/login-peserta':
        return (
          <LoginPeserta 
            onLoginSuccess={(peserta) => {
              setCurrentUser({ role: 'peserta', peserta });
            }} 
          />
        );

      case '/portal-peserta':
        if (currentUser.role !== 'peserta' || !currentUser.peserta) {
          // If not logged in as peserta, show login
          return (
            <LoginPeserta 
              onLoginSuccess={(peserta) => {
                setCurrentUser({ role: 'peserta', peserta });
              }} 
            />
          );
        }
        return <PortalPeserta peserta={currentUser.peserta} onLogout={handleLogout} />;

      case '/daftar-jadwal':
        return <DaftarJadwal currentPeserta={currentUser.peserta} />;

      case '/login-terapis':
        return (
          <LoginTerapis 
            onLoginSuccess={(terapis) => {
              setCurrentUser({ role: 'terapis', terapis });
            }} 
          />
        );

      case '/portal-terapis':
        if (currentUser.role !== 'terapis' || !currentUser.terapis) {
          return (
            <LoginTerapis 
              onLoginSuccess={(terapis) => {
                setCurrentUser({ role: 'terapis', terapis });
              }} 
            />
          );
        }
        return <PortalTerapis terapis={currentUser.terapis} onLogout={handleLogout} />;

      case '/admin':
        return <AdminDashboard onLogout={handleLogout} />;

      case '/log-aktivitas':
        // ATURAN USER 2: Log Aktivitas cuma boleh diakses dan diperiksa oleh Psikolog
        if (currentUser.role === 'terapis' && currentUser.terapis?.spesialisasi === 'psikolog') {
          return <PortalTerapis terapis={currentUser.terapis} onLogout={handleLogout} initialTab="log_aktivitas" />;
        }
        return (
          <LoginTerapis 
            onLoginSuccess={(terapis) => {
              setCurrentUser({ role: 'terapis', terapis });
            }} 
          />
        );

      case '/panduan-layanan':
        return <PanduanLayanan />;

      default:
        return <Home />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans selection:bg-teal-700 selection:text-white">
      {/* Top Demo Simulation Bar - disembunyikan saat siswa login agar fokus dan panel admin tidak terlihat */}
      {currentUser.role !== 'peserta' && (
        <SimulasiAkunBar 
          currentUser={currentUser} 
          onSwitchUser={handleSwitchUser} 
        />
      )}

      {/* Floating Toggle: Mobile App Experience Mode */}
      <div className="fixed top-12 right-4 z-40 hidden lg:block no-print">
        <button
          onClick={() => setIsMobileFrameMode(!isMobileFrameMode)}
          className="px-3 py-1.5 rounded-full bg-slate-900/90 text-white hover:bg-slate-800 text-[11px] font-semibold shadow-lg backdrop-blur flex items-center gap-1.5 transition-all"
        >
          <span>{isMobileFrameMode ? '💻 Beralih ke Tampilan Web Luas' : '📱 Pratinjau Tampilan HP Mobile Native'}</span>
        </button>
      </div>

      {/* Layout wrapper: Supports normal full responsive web OR smartphone frame preview */}
      {isMobileFrameMode ? (
        <div className="py-8 px-4 flex items-center justify-center min-h-[calc(100vh-40px)]">
          {/* Smartphone Frame */}
          <div className="w-full max-w-[420px] bg-slate-900 p-3 rounded-[44px] shadow-2xl border-4 border-slate-700 relative overflow-hidden">
            {/* Phone Notch/Speaker */}
            <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-2 flex items-center justify-center">
              <span className="w-3 h-3 rounded-full bg-slate-900 inline-block mr-2"></span>
              <span className="w-8 h-1 bg-slate-700 rounded-full inline-block"></span>
            </div>

            {/* Inner Phone Screen */}
            <div className="bg-slate-50 rounded-[34px] overflow-y-auto max-h-[800px] flex flex-col relative shadow-inner">
              <Navbar 
                currentPath={route.path} 
                currentUser={currentUser} 
                onLogout={handleLogout} 
              />
              <main className="p-4 flex-1">
                {renderCurrentPage()}
              </main>
              <BottomNav 
                currentPath={route.path} 
                currentUser={currentUser} 
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col min-h-screen">
          {/* Top Bar with 3-Zone Contract */}
          <Navbar 
            currentPath={route.path} 
            currentUser={currentUser} 
            onLogout={handleLogout} 
          />

          {/* Main Route Content */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6 pb-20">
            {renderCurrentPage()}
          </main>

          {/* Mobile Bottom Tab Bar */}
          <BottomNav 
            currentPath={route.path} 
            currentUser={currentUser} 
          />

          {/* Clean Footer */}
          <footer className="bg-white border-t border-slate-200 text-slate-500 text-xs py-8 px-4 text-center space-y-2 no-print">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-left">
                <span className="font-bold text-slate-800">Unit Layanan Disabilitas (ULD) Kota Probolinggo</span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Layanan Publik Inklusif Terpadu Pemerintah Kota Probolinggo, Jawa Timur
                </p>
              </div>

              {currentUser.role !== 'admin' && currentUser.role !== 'terapis' && currentUser.role !== 'peserta' ? (
                <div className="flex items-center gap-4 text-slate-600 text-[11px]">
                  <button onClick={() => navigateTo('/')} className="hover:text-slate-900">Beranda</button>
                  <span>·</span>
                  <button onClick={() => navigateTo('/daftar-jadwal')} className="hover:text-slate-900">Jadwal Terapi (Publik)</button>
                  <span>·</span>
                  <button onClick={() => navigateTo('/panduan-layanan')} className="hover:text-slate-900">Panduan Layanan</button>
                </div>
              ) : (
                <button 
                  onClick={handleLogout} 
                  className="text-red-700 hover:text-red-800 font-bold text-xs flex items-center gap-1"
                >
                  <span>🚪 Log Out / Kembali ke Beranda</span>
                </button>
              )}
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}
