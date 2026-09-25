/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAppRouter, navigateTo } from './services/router';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
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

interface CurrentUserState {
  role: UserRole;
  peserta?: Peserta;
  terapis?: Terapis;
}

const SESSION_KEY = 'uld_prob_active_session_v1';

export default function App() {
  const { route, navigate } = useAppRouter();

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

  // Render current active page based on clean URL route
  const renderCurrentPage = () => {
    // Admin hanya bisa melihat panel admin
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
        // Log Aktivitas hanya boleh diakses oleh Psikolog
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
      <div className="flex flex-col min-h-screen">
        <Navbar 
          currentPath={route.path} 
          currentUser={currentUser} 
          onLogout={handleLogout} 
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6 pb-20">
          {renderCurrentPage()}
        </main>

        <BottomNav 
          currentPath={route.path} 
          currentUser={currentUser} 
        />

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
    </div>
  );
}
