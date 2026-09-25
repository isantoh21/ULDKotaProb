import React, { useState, useEffect, useCallback } from 'react';
import { db, getWIBDate } from '../services/supabase';
import confetti from 'canvas-confetti';

type ConnectionState = 'connected' | 'checking' | 'internet_offline' | 'db_error' | 'local_only';

interface ConnectionInfo {
  state: ConnectionState;
  isOnline: boolean;
  latencyMs: number | null;
  lastCheckedTime: string;
  message: string;
  supabaseUrl: string;
}

export const DatabaseStatusBar: React.FC = () => {
  const [info, setInfo] = useState<ConnectionInfo>({
    state: 'checking',
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    latencyMs: null,
    lastCheckedTime: '',
    message: 'Memeriksa koneksi...',
    supabaseUrl: ''
  });

  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Kredensial editing state dalam modal
  const [showCredsEditor, setShowCredsEditor] = useState<boolean>(false);
  const [editUrl, setEditUrl] = useState<string>('');
  const [editKey, setEditKey] = useState<string>('');

  const checkConnection = useCallback(async (manual = false) => {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const { timeStr } = getWIBDate();
    const supStatus = db.getSupabaseStatus();

    // 1. Jika internet terputus dari sisi browser/OS
    if (!isOnline) {
      setInfo({
        state: 'internet_offline',
        isOnline: false,
        latencyMs: null,
        lastCheckedTime: timeStr,
        message: 'Koneksi internet Anda mati / terputus. Pastikan WiFi atau kabel LAN terhubung.',
        supabaseUrl: supStatus.url
      });
      return;
    }

    // 2. Jika Supabase credentials tidak diatur (Mode lokal offline)
    if (!supStatus.url || !supStatus.hasKey) {
      setInfo({
        state: 'local_only',
        isOnline: true,
        latencyMs: null,
        lastCheckedTime: timeStr,
        message: 'Kredensial Supabase belum dikonfigurasi. Sistem berjalan dalam mode penyimpanan lokal offline browser.',
        supabaseUrl: ''
      });
      return;
    }

    // 3. Uji ping ke Supabase
    if (manual) {
      setInfo(prev => ({ ...prev, state: 'checking' }));
    }

    const startTime = performance.now();
    try {
      const res = await db.testSupabaseConnection();
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);

      if (res.success) {
        setInfo({
          state: 'connected',
          isOnline: true,
          latencyMs: latency,
          lastCheckedTime: timeStr,
          message: res.message,
          supabaseUrl: supStatus.url
        });
      } else {
        setInfo({
          state: 'db_error',
          isOnline: true,
          latencyMs: latency,
          lastCheckedTime: timeStr,
          message: res.message,
          supabaseUrl: supStatus.url
        });
      }
    } catch (err: any) {
      setInfo({
        state: 'db_error',
        isOnline: true,
        latencyMs: null,
        lastCheckedTime: timeStr,
        message: err?.message || 'Gagal tersambung ke database Supabase.',
        supabaseUrl: supStatus.url
      });
    }
  }, []);

  // Inisialisasi & event listeners
  useEffect(() => {
    checkConnection();

    const handleOnline = () => {
      checkConnection(true);
    };

    const handleOffline = () => {
      const { timeStr } = getWIBDate();
      setInfo(prev => ({
        ...prev,
        state: 'internet_offline',
        isOnline: false,
        lastCheckedTime: timeStr,
        message: 'Koneksi internet mati / terputus!'
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Heartbeat check setiap 40 detik
    const intervalId = setInterval(() => {
      checkConnection();
    }, 40000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [checkConnection]);

  // Siapkan form input kredensial saat modal dibuka
  useEffect(() => {
    if (showDetailModal) {
      const status = db.getSupabaseStatus();
      setEditUrl(status.url || '');
      setEditKey(localStorage.getItem('uld_prob_supabase_key') || '');
      setActionNotice(null);
    }
  }, [showDetailModal]);

  const handleManualTest = async () => {
    setIsActionLoading(true);
    setActionNotice(null);
    await checkConnection(true);
    setIsActionLoading(false);
  };

  const handlePushData = async () => {
    setIsActionLoading(true);
    setActionNotice(null);
    try {
      const res = await db.pushAllDataToSupabase();
      if (res.success) {
        confetti({ particleCount: 40 });
        setActionNotice({ type: 'success', text: res.message });
      } else {
        setActionNotice({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err?.message || 'Gagal sinkronisasi data ke cloud.' });
    } finally {
      setIsActionLoading(false);
      checkConnection();
    }
  };

  const handlePullData = async () => {
    setIsActionLoading(true);
    setActionNotice(null);
    try {
      const res = await db.pullAllDataFromSupabase();
      if (res.success) {
        confetti({ particleCount: 40 });
        setActionNotice({ type: 'success', text: res.message });
      } else {
        setActionNotice({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err?.message || 'Gagal menarik data dari cloud.' });
    } finally {
      setIsActionLoading(false);
      checkConnection();
    }
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUrl.trim() || !editKey.trim()) {
      db.setSupabaseCredentials('', '');
      setActionNotice({ type: 'info', text: 'Kredensial Supabase dikosongkan. Sistem sekarang berjalan dalam mode offline lokal.' });
    } else {
      const success = db.setSupabaseCredentials(editUrl.trim(), editKey.trim());
      if (success) {
        confetti({ particleCount: 35 });
        setActionNotice({ type: 'success', text: 'Kredensial Supabase berhasil disimpan. Silakan klik "Uji & Segarkan Koneksi".' });
      } else {
        setActionNotice({ type: 'error', text: 'Format URL atau Key Supabase tidak valid.' });
      }
    }
    checkConnection(true);
  };

  const maskUrl = (url: string) => {
    if (!url) return 'Tidak terkonfigurasi';
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.hostname}`;
    } catch {
      return url.length > 25 ? `${url.substring(0, 25)}...` : url;
    }
  };

  return (
    <>
      {/* ======================================================== */}
      {/* 1. STATUS BAR PILL (DITAMPILKAN DI POJOK KANAN HEADER ADMIN) */}
      {/* ======================================================== */}
      <div
        onClick={() => setShowDetailModal(true)}
        className={`group cursor-pointer select-none px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-sm transition-all flex items-center gap-2.5 backdrop-blur-sm ${
          info.state === 'connected'
            ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200 hover:bg-emerald-900/80 hover:border-emerald-400'
            : info.state === 'checking'
            ? 'bg-sky-950/70 border-sky-500/60 text-sky-200 hover:bg-sky-900/80'
            : info.state === 'internet_offline'
            ? 'bg-red-950/90 border-red-500 text-red-200 hover:bg-red-900 animate-pulse ring-2 ring-red-500/50'
            : info.state === 'db_error'
            ? 'bg-rose-950/80 border-rose-500/80 text-rose-200 hover:bg-rose-900/90'
            : 'bg-amber-950/75 border-amber-500/60 text-amber-200 hover:bg-amber-900/80'
        }`}
        title="Klik untuk melihat rincian koneksi & sinkronisasi database"
      >
        {/* Bulatan Indikator Animasi */}
        <div className="relative flex items-center justify-center shrink-0">
          {info.state === 'connected' && (
            <>
              <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </>
          )}
          {info.state === 'checking' && (
            <span className="inline-block w-3 h-3 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></span>
          )}
          {info.state === 'internet_offline' && (
            <>
              <span className="animate-ping absolute inline-flex h-3.5 w-3.5 rounded-full bg-red-500 opacity-80"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </>
          )}
          {info.state === 'db_error' && (
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
          )}
          {info.state === 'local_only' && (
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
          )}
        </div>

        {/* Teks Status */}
        <div className="flex flex-col text-left leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">
              {info.state === 'connected' ? 'Database Cloud' : 'Status Koneksi'}
            </span>
            {info.latencyMs !== null && info.state === 'connected' && (
              <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-800/80 text-emerald-300 font-mono font-bold">
                {info.latencyMs}ms
              </span>
            )}
          </div>
          <span className="font-extrabold text-[11px] sm:text-xs tracking-tight flex items-center gap-1">
            {info.state === 'connected' && '🟢 Database Terhubung'}
            {info.state === 'checking' && '🔄 Memeriksa Koneksi...'}
            {info.state === 'internet_offline' && '🔴 Internet Mati / Offline'}
            {info.state === 'db_error' && '⚠️ DB Cloud Gangguan'}
            {info.state === 'local_only' && '🟡 DB Mode Lokal'}
          </span>
        </div>

        {/* Tombol Mini Refresh / Info */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleManualTest();
          }}
          disabled={info.state === 'checking' || isActionLoading}
          className="ml-0.5 p-1 rounded-lg hover:bg-white/10 active:scale-95 transition-all text-white/80 hover:text-white"
          title="Uji ulang koneksi sekarang"
        >
          <span className={`text-[12px] inline-block ${info.state === 'checking' || isActionLoading ? 'animate-spin' : ''}`}>
            🔄
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 2. BANNER PERINGATAN GLOBAL JIKA INTERNET MATI / OFFLINE */}
      {/* ======================================================== */}
      {info.state === 'internet_offline' && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-4xl w-[94%] bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white px-5 py-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xl border-2 border-white/60 animate-bounce">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shrink-0">
              📡❌
            </div>
            <div>
              <h4 className="font-black text-sm tracking-wide flex items-center gap-2">
                <span>PERINGATAN: KONEKSI INTERNET ANDA TERPUTUS / MATI!</span>
                <span className="px-2 py-0.5 rounded-full bg-white text-red-700 font-extrabold text-[10px] uppercase">
                  Mode Offline
                </span>
              </h4>
              <p className="text-xs text-red-100 mt-0.5 leading-relaxed">
                Pendaftaran loket ULD dan pencatatan tetap dapat dijalankan secara normal. Seluruh data tersimpan aman di penyimpanan lokal komputer ini dan otomatis disinkronkan ke Supabase saat koneksi internet pulih.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleManualTest()}
              disabled={isActionLoading}
              className="px-4 py-2 bg-white text-red-700 hover:bg-red-50 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5"
            >
              <span>{isActionLoading ? '⏳' : '🔄'}</span>
              <span>Cek Sambungan</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. MODAL DETAIL STATUS KONEKSI & DATABASE               */}
      {/* ======================================================== */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-5 text-slate-800 relative max-h-[92vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-md ${
                  info.state === 'connected' ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' :
                  info.state === 'internet_offline' ? 'bg-red-100 text-red-700 border border-red-300' :
                  info.state === 'local_only' ? 'bg-amber-100 text-amber-700 border border-amber-300' :
                  'bg-sky-100 text-sky-700 border border-sky-300'
                }`}>
                  {info.state === 'connected' ? '🟢' : info.state === 'internet_offline' ? '📡' : '☁️'}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">
                    Status Koneksi Database ULD
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pemeriksaan sinkronisasi cloud Supabase & jaringan internet
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm transition-colors"
                title="Tutup Modal"
              >
                ✕
              </button>
            </div>

            {/* Notice Alert (Jika ada aksi sinkronisasi) */}
            {actionNotice && (
              <div className={`p-3 rounded-2xl text-xs flex items-center gap-2.5 font-medium border ${
                actionNotice.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                actionNotice.type === 'error' ? 'bg-red-50 text-red-800 border-red-300' :
                'bg-sky-50 text-sky-800 border-sky-300'
              }`}>
                <span className="text-base">{actionNotice.type === 'success' ? '✅' : actionNotice.type === 'error' ? '❌' : 'ℹ️'}</span>
                <span>{actionNotice.text}</span>
              </div>
            )}

            {/* Grid Kartu Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Kartu Status Internet */}
              <div className={`p-4 rounded-2xl border ${
                info.isOnline
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : 'bg-red-50 border-red-200 text-red-950'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Koneksi Internet</span>
                  <span className="text-base">{info.isOnline ? '🌐' : '❌'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${info.isOnline ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                  <span className="text-sm font-extrabold">
                    {info.isOnline ? 'Online (Terhubung)' : 'Offline (Terputus)'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {info.isOnline ? 'Perangkat terhubung ke internet' : 'Internet mati / WiFi tidak ada'}
                </p>
              </div>

              {/* Kartu Status Database Supabase */}
              <div className={`p-4 rounded-2xl border ${
                info.state === 'connected'
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : info.state === 'local_only'
                  ? 'bg-amber-50 border-amber-200 text-amber-950'
                  : 'bg-rose-50 border-rose-200 text-rose-950'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Database Cloud</span>
                  <span className="text-base">🗄️</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    info.state === 'connected' ? 'bg-emerald-500 animate-pulse' :
                    info.state === 'local_only' ? 'bg-amber-500' : 'bg-rose-500'
                  }`}></span>
                  <span className="text-sm font-extrabold">
                    {info.state === 'connected' ? 'Supabase Aktif' :
                     info.state === 'local_only' ? 'Penyimpanan Lokal' : 'Gagal Terhubung'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {info.latencyMs !== null ? `Respons query: ${info.latencyMs} ms` : 'Tidak ada latensi'}
                </p>
              </div>
            </div>

            {/* Detail Informasi Teknis */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Terakhir Diperiksa:</span>
                <span className="font-mono font-bold text-slate-800">{info.lastCheckedTime || '-'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Supabase Project URL:</span>
                <span className="font-mono text-slate-700 truncate max-w-[200px]" title={info.supabaseUrl}>
                  {maskUrl(info.supabaseUrl)}
                </span>
              </div>
              <div className="py-1">
                <span className="text-slate-500 font-medium block mb-1">Pesan Diagnostik:</span>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-[11px] font-mono leading-relaxed text-slate-700 break-words">
                  {info.message}
                </div>
              </div>
            </div>

            {/* Aksi Cepat Sinkronisasi */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-600 block uppercase tracking-wider">
                Aksi Sinkronisasi Data
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handleManualTest}
                  disabled={isActionLoading}
                  className="px-3 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-50"
                >
                  <span>{isActionLoading ? '⏳' : '🔄'}</span>
                  <span>Uji Koneksi</span>
                </button>

                <button
                  type="button"
                  onClick={handlePushData}
                  disabled={isActionLoading || info.state === 'internet_offline'}
                  className="px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-50"
                  title="Kirim seluruh data lokal ke cloud Supabase"
                >
                  <span>☁️</span>
                  <span>Push ke Cloud</span>
                </button>

                <button
                  type="button"
                  onClick={handlePullData}
                  disabled={isActionLoading || info.state === 'internet_offline'}
                  className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-50"
                  title="Ambil data terbaru dari cloud Supabase ke browser ini"
                >
                  <span>📥</span>
                  <span>Tarik Data Cloud</span>
                </button>
              </div>
            </div>

            {/* Toggle Pengaturan Kredensial Supabase */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCredsEditor(!showCredsEditor)}
                className="text-xs text-sky-700 hover:text-sky-900 font-bold flex items-center gap-1.5 py-1"
              >
                <span>⚙️ {showCredsEditor ? 'Sembunyikan Pengaturan Kredensial' : 'Atur URL & Anon Key Supabase'}</span>
                <span className="text-[10px]">{showCredsEditor ? '▲' : '▼'}</span>
              </button>

              {showCredsEditor && (
                <form onSubmit={handleSaveCredentials} className="mt-3 space-y-3 p-4 bg-sky-50/60 rounded-2xl border border-sky-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Project URL Supabase
                    </label>
                    <input
                      type="url"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      placeholder="https://xyzcompany.supabase.co"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Anon Public Key
                    </label>
                    <input
                      type="password"
                      value={editKey}
                      onChange={(e) => setEditKey(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditUrl('');
                        setEditKey('');
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-xs font-semibold hover:bg-slate-100"
                    >
                      Kosongkan (Mode Offline)
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm"
                    >
                      Simpan Kredensial
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Footer Modal */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
