import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Terapis, SlotHarian, BookingTerapi, Peserta, LogAktivitas, KategoriAktivitas } from '../types';
import { db, DEFAULT_TERAPI_SESSIONS } from '../services/supabase';
import { getNextWeekdayDate } from '../services/initialData';

interface Props {
  terapis: Terapis;
  onLogout: () => void;
  initialTab?: 'jadwal' | 'pasien' | 'assign_siswa' | 'log_aktivitas' | 'sql_config';
}

const DEFAULT_HOURS = DEFAULT_TERAPI_SESSIONS;

export const PortalTerapis: React.FC<Props> = ({ terapis, onLogout, initialTab }) => {
  const isPsikolog = terapis.spesialisasi === 'psikolog';
  const [activeTab, setActiveTab] = useState<'jadwal' | 'pasien' | 'assign_siswa' | 'log_aktivitas' | 'sql_config'>(() => {
    if (initialTab && ((initialTab !== 'log_aktivitas' && initialTab !== 'sql_config') || isPsikolog)) {
      return initialTab;
    }
    return 'jadwal';
  });

  useEffect(() => {
    if (initialTab) {
      if ((initialTab === 'log_aktivitas' || initialTab === 'sql_config') && !isPsikolog) {
        setActiveTab('jadwal');
      } else {
        setActiveTab(initialTab);
      }
    }
  }, [initialTab, isPsikolog]);
  
  // Date selector (Default today or next weekday)
  const [selectedDate, setSelectedDate] = useState<string>(() => getNextWeekdayDate(0));
  
  // Change PIN Modal
  const [showPinModal, setShowPinModal] = useState(false);
  const [newPinInput, setNewPinInput] = useState('');
  const [pinChangeMsg, setPinChangeMsg] = useState('');
  const [currentPinDisplay, setCurrentPinDisplay] = useState(terapis.pin);

  // Note Modal for Patients
  const [selectedBookingForNote, setSelectedBookingForNote] = useState<BookingTerapi | null>(null);
  const [noteContent, setNoteContent] = useState('');

  // Aturan 3: Terapis bisa membatalkan jadwal apabila mendadak soalnya butuh
  const [bookingToCancelMendadak, setBookingToCancelMendadak] = useState<{
    id: string;
    studentName: string;
    tanggal: string;
    jamMulai: string;
    jamSelesai: string;
    kodeBooking: string;
  } | null>(null);
  const [alasanBatalMendadak, setAlasanBatalMendadak] = useState<string>('Ada keperluan mendadak / dinas darurat');
  const [isSubmittingBatalMendadak, setIsSubmittingBatalMendadak] = useState(false);

  // 2. ATURAN SISWA BINAAN TETAP (ASSIGN SISWA OLEH TERAPIS)
  const [pesertaList, setPesertaList] = useState<Peserta[]>(() => db.getPesertaList());
  const [searchStudent, setSearchStudent] = useState<string>('');
  const [studentAssignMsg, setStudentAssignMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  // Default ke 'belum_diassign' agar terapis langsung melihat siswa yang perlu di-assign di mobile tanpa harus klik filter
  const [filterStudentScope, setFilterStudentScope] = useState<'belum_diassign' | 'binaan_saya' | 'semua'>('belum_diassign');

  useEffect(() => {
    const handleUpdate = () => {
      setPesertaList(db.getPesertaList());
    };
    window.addEventListener('uld_data_updated', handleUpdate);
    return () => window.removeEventListener('uld_data_updated', handleUpdate);
  }, []);

  const assignedStudents = pesertaList.filter(p => p.assignedTerapisId === terapis.id && p.status === 'aktif');
  const unassignedStudents = pesertaList.filter(p => !p.assignedTerapisId && p.status === 'aktif');

  const handleAssignStudent = (pesertaId: string, namaAnak: string) => {
    const res = db.assignPesertaKeTerapis(pesertaId, terapis.id, { nama: terapis.nama, role: 'terapis' });
    if (res.success) {
      confetti({ particleCount: 60, spread: 60 });
      setPesertaList(db.getPesertaList());
      setStudentAssignMsg({
        type: 'success',
        text: `Alhamdulillah! Siswa an. "${namaAnak}" berhasil ditetapkan sebagai Siswa Binaan Tetap Anda. Siswa ini sekarang hanya dapat mendaftar ke jadwal Anda.`
      });
      setTimeout(() => setStudentAssignMsg(null), 5000);
    } else {
      setStudentAssignMsg({
        type: 'error',
        text: res.error || 'Gagal menetapkan siswa.'
      });
    }
  };

  const handleUnassignStudent = (pesertaId: string, namaAnak: string) => {
    if (window.confirm(`Lepas penugasan tetap ananda "${namaAnak}" dari jadwal Anda? Setelah dilepas, siswa tidak dapat mendaftar sampai di-assign kembali.`)) {
      const res = db.lepasPenugasanPeserta(pesertaId, { nama: terapis.nama, role: 'terapis' });
      if (res.success) {
        setPesertaList(db.getPesertaList());
        setStudentAssignMsg({
          type: 'success',
          text: `Penugasan tetap ananda "${namaAnak}" berhasil dilepas.`
        });
        setTimeout(() => setStudentAssignMsg(null), 4000);
      }
    }
  };

  const displayedStudents = pesertaList.filter(p => {
    if (p.status !== 'aktif') return false;
    if (filterStudentScope === 'binaan_saya' && p.assignedTerapisId !== terapis.id) return false;
    if (filterStudentScope === 'belum_diassign' && Boolean(p.assignedTerapisId)) return false;
    if (!searchStudent.trim()) return true;
    const q = searchStudent.toLowerCase();
    return p.namaLengkap.toLowerCase().includes(q) ||
      p.nomorRekamMedis.toLowerCase().includes(q) ||
      p.namaWali.toLowerCase().includes(q) ||
      (p.asalSekolah && p.asalSekolah.toLowerCase().includes(q));
  });

  // Supabase & SQL Configuration State (Khusus Psikolog)
  const [supabaseStatus, setSupabaseStatus] = useState(() => db.getSupabaseStatus());
  const [supabaseUrl, setSupabaseUrl] = useState(() => db.getSupabaseStatus().url || '');
  const [supabaseKey, setSupabaseKey] = useState(() => localStorage.getItem('uld_prob_supabase_key') || '');
  const [copiedSql, setCopiedSql] = useState(false);
  const [supabaseMsg, setSupabaseMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);

  const handleSaveSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    setSupabaseMsg(null);
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      db.setSupabaseCredentials('', '');
      setSupabaseStatus(db.getSupabaseStatus());
      setSupabaseMsg({ type: 'info', text: 'Kredensial Supabase dikosongkan. Sistem berjalan dalam mode penyimpanan lokal offline.' });
      return;
    }
    const success = db.setSupabaseCredentials(supabaseUrl.trim(), supabaseKey.trim());
    setSupabaseStatus(db.getSupabaseStatus());
    if (success) {
      confetti({ particleCount: 40 });
      setSupabaseMsg({ type: 'success', text: 'Kredensial Supabase berhasil disimpan! Silakan klik "Uji & Verifikasi Koneksi" untuk memastikan database cloud aktif.' });
    } else {
      setSupabaseMsg({ type: 'error', text: 'Format URL atau Key Supabase tidak valid.' });
    }
  };

  const handleTestSupabaseConnection = async () => {
    setIsTestingSupabase(true);
    setSupabaseMsg(null);
    const res = await db.testSupabaseConnection();
    setIsTestingSupabase(false);
    setSupabaseStatus(db.getSupabaseStatus());
    if (res.success) {
      confetti({ particleCount: 50 });
    }
    setSupabaseMsg({
      type: res.success ? 'success' : 'error',
      text: res.message
    });
  };

  const handlePushDataToSupabase = async () => {
    setIsTestingSupabase(true);
    setSupabaseMsg(null);
    const res = await db.pushAllDataToSupabase();
    setIsTestingSupabase(false);
    if (res.success) {
      confetti({ particleCount: 60 });
    }
    setSupabaseMsg({
      type: res.success ? 'success' : 'error',
      text: res.message
    });
  };

  const handlePullDataFromSupabase = async () => {
    setIsTestingSupabase(true);
    setSupabaseMsg(null);
    const res = await db.pullAllDataFromSupabase();
    setIsTestingSupabase(false);
    if (res.success) {
      confetti({ particleCount: 60 });
      setPesertaList(db.getPesertaList());
    }
    setSupabaseMsg({
      type: res.success ? 'success' : 'error',
      text: res.message
    });
  };

  const handleCopySql = () => {
    const sql = db.generateSupabaseSqlSchema();
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // 3. LOG AKTIVITAS (EKSKLUSIF TENAGA AHLI PSIKOLOG)
  const [logList, setLogList] = useState<LogAktivitas[]>(() => isPsikolog ? db.getAktivitasLogs() : []);
  const [filterKategoriLog, setFilterKategoriLog] = useState<string>('semua');
  const [filterRoleLog, setFilterRoleLog] = useState<string>('semua');
  const [searchLog, setSearchLog] = useState<string>('');
  const [showClearLogModal, setShowClearLogModal] = useState<boolean>(false);

  useEffect(() => {
    if (!isPsikolog) return;
    const handleLogUpdate = () => {
      setLogList(db.getAktivitasLogs());
    };
    window.addEventListener('uld_log_updated', handleLogUpdate);
    return () => window.removeEventListener('uld_log_updated', handleLogUpdate);
  }, [isPsikolog]);

  const handleClearAllLogs = () => {
    db.bersihkanSemuaLog();
    setLogList([]);
    setShowClearLogModal(false);
  };

  const handleResetLogs = () => {
    db.resetLogsToInitial();
    setLogList(db.getAktivitasLogs());
    setShowClearLogModal(false);
  };

  const filteredLogList = logList.filter(log => {
    if (filterKategoriLog !== 'semua' && log.kategori !== filterKategoriLog) return false;
    if (filterRoleLog !== 'semua' && log.rolePelaku !== filterRoleLog) return false;
    if (!searchLog.trim()) return true;
    const q = searchLog.toLowerCase();
    return (
      (log.judul && log.judul.toLowerCase().includes(q)) ||
      (log.deskripsi && log.deskripsi.toLowerCase().includes(q)) ||
      (log.pelaku && log.pelaku.toLowerCase().includes(q)) ||
      (log.waktu && log.waktu.toLowerCase().includes(q))
    );
  });

  const getKategoriBadge = (kategori: KategoriAktivitas) => {
    switch (kategori) {
      case 'pendaftaran_terapi':
        return { label: 'Pendaftaran Terapi', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'asesmen':
        return { label: 'Asesmen Baru', bg: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'manajemen_siswa':
        return { label: 'Manajemen Siswa', bg: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'penugasan_terapis':
        return { label: 'Penugasan Terapis', bg: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'jadwal_slot':
        return { label: 'Jadwal & Kuota', bg: 'bg-cyan-100 text-cyan-800 border-cyan-200' };
      case 'keamanan_pin':
        return { label: 'Keamanan PIN', bg: 'bg-rose-100 text-rose-800 border-rose-200' };
      case 'sistem':
      default:
        return { label: 'Sistem', bg: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return { label: 'Admin Loket', bg: 'bg-slate-800 text-white' };
      case 'terapis':
        return { label: 'Tenaga Ahli', bg: 'bg-teal-800 text-white' };
      case 'peserta':
        return { label: 'Siswa / Wali', bg: 'bg-indigo-700 text-white' };
      case 'sistem':
      default:
        return { label: 'Sistem ULD', bg: 'bg-slate-600 text-white' };
    }
  };

  // Fetch all slots & bookings for this therapist (passing selectedDate ensures auto-open slots exist)
  const [slotsList, setSlotsList] = useState<SlotHarian[]>(() => db.getSlotsList(selectedDate));
  const [allBookings, setAllBookings] = useState<BookingTerapi[]>(() => db.getBookingsList());

  useEffect(() => {
    const handleUpdate = () => {
      setSlotsList(db.getSlotsList(selectedDate));
      setAllBookings(db.getBookingsList());
    };
    window.addEventListener('uld_data_updated', handleUpdate);
    return () => window.removeEventListener('uld_data_updated', handleUpdate);
  }, [selectedDate]);

  const allSlots = slotsList.filter(s => s.terapisId === terapis.id);
  const slotsForSelectedDate = allSlots.filter(s => s.tanggal === selectedDate);
  const bookingsForSelectedDate = allBookings.filter(b => b.terapisId === terapis.id && b.tanggal === selectedDate && b.status !== 'batal');

  // Cek apakah tanggal terpilih jatuh pada hari Sabtu / Minggu
  const isWeekend = (() => {
    try {
      const d = new Date(selectedDate + 'T00:00:00');
      const day = d.getDay();
      return day === 0 || day === 6;
    } catch {
      return false;
    }
  })();

  // Handle 1-Click Toggle Slot (Matikan / Hidupkan Sesi)
  const handleToggleSlotHour = (hourStart: string) => {
    const existing = allSlots.find(s => s.tanggal === selectedDate && s.jamMulai === hourStart);
    if (existing) {
      db.toggleSlotStatus(existing.id);
      setSlotsList(db.getSlotsList(selectedDate));
    }
  };

  const handleOpenAllForDate = () => {
    db.hidupkanSemuaSlotTanggal(terapis.id, selectedDate);
    confetti({ particleCount: 40 });
    setSlotsList(db.getSlotsList(selectedDate));
  };

  const handleCloseAllForDate = () => {
    if (window.confirm(`Matikan seluruh sesi terapi pada tanggal ${selectedDate}? Siswa tidak akan dapat mendaftar pada hari ini.`)) {
      db.matikanSemuaSlotTanggal(terapis.id, selectedDate);
      setSlotsList(db.getSlotsList(selectedDate));
    }
  };

  // Handle Save PIN
  const handleSaveNewPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPinInput.trim() || newPinInput.trim().length !== 6) {
      setPinChangeMsg('PIN harus terdiri dari 6 angka.');
      return;
    }

    const success = db.gantiPinTerapis(terapis.id, newPinInput.trim());
    if (success) {
      setCurrentPinDisplay(newPinInput.trim());
      setPinChangeMsg('PIN pribadi Anda berhasil diperbarui!');
      setTimeout(() => {
        setShowPinModal(false);
        setPinChangeMsg('');
        setNewPinInput('');
      }, 1500);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* Super Simple Profile Header */}
      <div className="bg-teal-900 text-white rounded-3xl p-4 sm:p-6 shadow-md space-y-3.5 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider block">
              {terapis.spesialisasiLabel} ULD Kota Probolinggo
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5">
              {terapis.nama}
            </h1>
            <div className="text-xs text-teal-200 mt-1">
              Ruang: {terapis.ruangPraktek}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            <a
              href="/pdf/PIN_PEKERJA_ULD.pdf"
              download="PIN_PEKERJA_ULD.pdf"
              className="px-3 py-2 rounded-xl bg-teal-800/90 hover:bg-teal-700 text-teal-100 font-bold text-xs border border-teal-600 transition-colors flex items-center gap-1.5 shadow-xs"
              title="Unduh PDF Dokumen PIN Pekerja ULD"
            >
              <span>📄 Unduh PDF PIN</span>
            </a>
            <button
              onClick={() => setShowPinModal(true)}
              className="px-3.5 py-2 rounded-xl bg-teal-800 hover:bg-teal-700 text-teal-100 font-bold text-xs border border-teal-600 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <span>🔑 Ubah PIN Saya</span>
              <span className="font-mono text-teal-300">({currentPinDisplay})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation - Horizontal Scrollable di Mobile agar tidak terpotong / gepeng */}
      <div className={`flex ${isPsikolog ? 'sm:grid sm:grid-cols-5' : 'sm:grid sm:grid-cols-3'} gap-1.5 sm:gap-2 bg-slate-200/90 p-1.5 rounded-2xl overflow-x-auto no-scrollbar pb-1 sm:pb-0`}>
        <button
          onClick={() => setActiveTab('jadwal')}
          className={`py-2.5 sm:py-3 px-3 sm:px-2 rounded-xl text-xs sm:text-sm font-bold transition-all text-center flex items-center justify-center gap-1.5 shrink-0 sm:shrink whitespace-nowrap ${activeTab === 'jadwal' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <span>🗓️ Jam Terapi</span>
        </button>

        <button
          onClick={() => setActiveTab('pasien')}
          className={`py-2.5 sm:py-3 px-3 sm:px-2 rounded-xl text-xs sm:text-sm font-bold transition-all text-center flex items-center justify-center gap-1.5 shrink-0 sm:shrink whitespace-nowrap ${activeTab === 'pasien' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <span>📋 Pasien ({bookingsForSelectedDate.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('assign_siswa')}
          className={`py-2.5 sm:py-3 px-3 sm:px-2 rounded-xl text-xs sm:text-sm font-bold transition-all text-center flex items-center justify-center gap-1.5 shrink-0 sm:shrink whitespace-nowrap ${activeTab === 'assign_siswa' ? 'bg-white text-teal-950 shadow-sm ring-1 ring-teal-700/20' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <span>👥 Tetapkan Binaan</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'assign_siswa' ? 'bg-teal-800 text-white' : 'bg-slate-300 text-slate-800'}`}>
            {assignedStudents.length}
          </span>
        </button>

        {isPsikolog && (
          <button
            onClick={() => setActiveTab('log_aktivitas')}
            className={`py-2.5 sm:py-3 px-3 sm:px-2 rounded-xl text-xs sm:text-sm font-bold transition-all text-center flex items-center justify-center gap-1.5 shrink-0 sm:shrink whitespace-nowrap ${activeTab === 'log_aktivitas' ? 'bg-amber-500 text-slate-950 shadow-sm ring-1 ring-amber-600 font-extrabold' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <span>📜 Log Aktivitas</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'log_aktivitas' ? 'bg-slate-900 text-amber-300' : 'bg-slate-300 text-slate-700'}`}>
              {logList.length}
            </span>
          </button>
        )}

        {isPsikolog && (
          <button
            onClick={() => setActiveTab('sql_config')}
            className={`py-2.5 sm:py-3 px-3 sm:px-2 rounded-xl text-xs sm:text-sm font-bold transition-all text-center flex items-center justify-center gap-1.5 shrink-0 sm:shrink whitespace-nowrap ${activeTab === 'sql_config' ? 'bg-indigo-900 text-white shadow-sm ring-1 ring-indigo-400' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <span>⚙️ Supabase</span>
            <span className={`w-2 h-2 rounded-full ${supabaseStatus.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          </button>
        )}
      </div>

      {/* TAB 1: Buka / Tutup Slot Jam 09.00 - 13.00 (Otomatis Aktif Senin - Jumat) */}
      {activeTab === 'jadwal' && (
        <div className="bg-white rounded-3xl p-4 sm:p-7 border border-slate-200 shadow-sm space-y-5 sm:space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-black text-slate-900">
              Jadwal Praktik (Senin - Jumat, 09.00 - 13.00 WIB)
            </h2>
            <p className="text-xs text-slate-500">
              Jadwal seluruh sesi terapi <strong>otomatis terbuka aktif setiap minggunya</strong>. Anda hanya perlu mematikan sesi jika berhalangan hadir.
            </p>
          </div>

          {/* Banner Kebijakan Otomatis */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-teal-50 border border-teal-200/80 flex items-start gap-2.5 sm:gap-3 text-xs text-teal-950 shadow-xs">
            <span className="text-xl sm:text-2xl mt-0.5 select-none shrink-0">✨</span>
            <div className="space-y-1">
              <div className="font-extrabold text-teal-950 text-sm">
                Jadwal Praktik Otomatis Aktif (Senin – Jumat)
              </div>
              <p className="text-teal-800 leading-relaxed text-[11px]">
                Seluruh 4 sesi terapi (09.00 – 13.00 WIB) setiap pekan secara otomatis telah <strong>dibuka aktif</strong> oleh sistem untuk pendaftaran siswa binaan Anda. Anda hanya perlu menekan tombol <strong>"🔴 Matikan Sesi"</strong> jika Anda berhalangan hadir atau ada rapat/kegiatan dinas pada jam tertentu.
              </p>
            </div>
          </div>

          {/* Tanggal Layanan */}
          <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Pilih Hari & Tanggal Layanan:
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => {
                  setSelectedDate(e.target.value);
                  setSlotsList(db.getSlotsList(e.target.value));
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            {isWeekend && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                <span>⚠️</span>
                <span>Tanggal yang dipilih jatuh pada hari Sabtu / Minggu (Hari Libur ULD). Sesi terapi reguler otomatis aktif pada hari Senin s.d. Jumat.</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={handleOpenAllForDate}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span>✓ Hidupkan Semua Sesi (09.00 - 13.00)</span>
              </button>
              <button
                type="button"
                onClick={handleCloseAllForDate}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span>✕ Matikan Semua Sesi Hari Ini</span>
              </button>
            </div>
          </div>

          {/* 4 Sessions: 09.00 - 13.00 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Status 4 Sesi Harian:
              </label>
              <span className="text-[11px] text-slate-500">Maksimal 1 kuota siswa per sesi</span>
            </div>

            {DEFAULT_HOURS.map((h, idx) => {
              const matchedSlot = slotsForSelectedDate.find(s => s.jamMulai === h.start);
              const matchedBooking = bookingsForSelectedDate.find(b => b.jamMulai === h.start);
              const bookedStudent = matchedBooking ? pesertaList.find(p => p.id === matchedBooking.pesertaId) : undefined;
              const isOpen = matchedSlot && matchedSlot.statusSlot === 'tersedia';
              const isBooked = matchedSlot && (matchedSlot.statusSlot === 'penuh' || matchedSlot.kuotaTerisi >= matchedSlot.kuotaMaksimal);
              const isClosed = matchedSlot && matchedSlot.statusSlot === 'dibatalkan';

              return (
                <div
                  key={idx}
                  className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isOpen 
                      ? 'border-emerald-300 bg-emerald-50/50' 
                      : isBooked 
                        ? 'border-amber-300 bg-amber-50/50' 
                        : 'border-slate-300 bg-slate-100/80'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="text-sm font-extrabold text-slate-900 font-mono">
                      {h.label}
                    </div>
                    <div className="text-xs">
                      {isOpen && (
                        <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse shrink-0"></span>
                          <span>🟢 Terbuka Otomatis (Siap Didaftar Siswa Binaan)</span>
                        </span>
                      )}
                      {isBooked && (
                        <div className="space-y-1">
                          <span className="font-bold text-amber-900 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-600 shrink-0"></span>
                            <span>👤 Sudah Terisi: {bookedStudent?.namaLengkap || 'Siswa Binaan'}</span>
                          </span>
                          {matchedBooking && (
                            <button
                              type="button"
                              onClick={() => {
                                setBookingToCancelMendadak({
                                  id: matchedBooking.id,
                                  studentName: bookedStudent?.namaLengkap || 'Siswa Binaan',
                                  tanggal: matchedBooking.tanggal,
                                  jamMulai: matchedBooking.jamMulai,
                                  jamSelesai: matchedBooking.jamSelesai,
                                  kodeBooking: matchedBooking.kodeBooking
                                });
                                setAlasanBatalMendadak('Keperluan dinas mendadak / darurat');
                              }}
                              className="text-[11px] font-bold text-rose-700 hover:text-rose-900 underline flex items-center gap-1"
                            >
                              <span>⚠️ Batalkan Jadwal Pasien (Mendadak)</span>
                            </button>
                          )}
                        </div>
                      )}
                      {isClosed && (
                        <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0"></span>
                          <span>⚪ Sesi Dimatikan oleh Anda (Siswa Tidak Dapat Mendaftar)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleSlotHour(h.start)}
                    className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm active:scale-95 whitespace-nowrap flex items-center justify-center gap-1.5 ${
                      isClosed 
                        ? 'bg-emerald-700 hover:bg-emerald-800 text-white' 
                        : 'bg-rose-700 hover:bg-rose-800 text-white'
                    }`}
                  >
                    {isClosed ? '🟢 Hidupkan Kembali Sesi' : '🔴 Matikan Sesi Ini'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Pasien Terdaftar */}
      {activeTab === 'pasien' && (
        <div className="bg-white rounded-3xl p-4 sm:p-7 border border-slate-200 shadow-sm space-y-4 sm:space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Pasien Terdaftar Tanggal {selectedDate}
              </h2>
              <p className="text-xs text-slate-500">
                Daftar anak yang akan terapi dengan Anda hari ini.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-teal-100 text-teal-900 font-bold text-xs shrink-0">
              {bookingsForSelectedDate.length} Siswa
            </span>
          </div>

          {bookingsForSelectedDate.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <div className="text-3xl">☕</div>
              <div className="text-sm font-bold text-slate-700">Belum Ada Pasien Terdaftar</div>
              <div className="text-xs text-slate-400">
                Belum ada orang tua yang mendaftar pada tanggal ini atau slot masih ditutup.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {bookingsForSelectedDate.map(b => {
                const peserta = db.getPesertaById(b.pesertaId);

                return (
                  <div key={b.id} className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200/60 pb-2">
                      <div>
                        <div className="text-base font-extrabold text-slate-900">
                          {peserta?.namaLengkap || 'Nama Siswa'}
                        </div>
                        <div className="text-xs text-slate-500">
                          Sekolah: {peserta?.asalSekolah || '-'} · Wali: {peserta?.namaWali}
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="font-mono font-bold text-xs text-teal-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {b.jamMulai} - {b.jamSelesai} WIB
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        Kontak: <a href={`https://wa.me/62${peserta?.nomorTelepon.replace(/^0/, '')}`} target="_blank" rel="noreferrer" className="text-emerald-700 font-bold underline">WhatsApp {peserta?.nomorTelepon}</a>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                        {b.status !== 'batal' && (
                          <button
                            type="button"
                            onClick={() => {
                              setBookingToCancelMendadak({
                                id: b.id,
                                studentName: peserta?.namaLengkap || 'Siswa Binaan',
                                tanggal: b.tanggal,
                                jamMulai: b.jamMulai,
                                jamSelesai: b.jamSelesai,
                                kodeBooking: b.kodeBooking
                              });
                              setAlasanBatalMendadak('Keperluan mendadak / dinas darurat');
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-bold hover:bg-rose-100 transition-colors flex items-center gap-1"
                            title="Batalkan jadwal karena keperluan mendadak"
                          >
                            <span>⚠️ Batalkan Mendadak</span>
                          </button>
                        )}

                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-semibold text-slate-500">Status:</span>
                          <select
                            value={b.status}
                            onChange={e => {
                              db.updateBookingStatus(b.id, e.target.value as any);
                              setActiveTab('pasien');
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold text-xs bg-white"
                          >
                            <option value="terjadwal">Terjadwal</option>
                            <option value="hadir">Hadir di Ruang</option>
                            <option value="selesai">Selesai Terapi</option>
                            <option value="batal">Batal</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {b.catatanSesiTerapis ? (
                      <div className="p-2.5 rounded-xl bg-teal-50 text-xs text-teal-950 border border-teal-200">
                        <strong>Catatan Anda:</strong> {b.catatanSesiTerapis}
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedBookingForNote(b);
                          setNoteContent('');
                        }}
                        className="text-xs text-teal-800 font-bold hover:underline"
                      >
                        + Tulis Catatan Perkembangan Sesi
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: SISWA BINAAN TETAP (ASSIGN SISWA OLEH TERAPIS) */}
      {/* ATURAN 2: masing-masing terapis bisa assign anak mana aja yang bisa mendaftar ke mereka secara tetap, selain itu ga bisa daftar ke mereka. dan siswa tersebut hanya bisa daftar ke terapis tersebut setelahnya. */}
      {activeTab === 'assign_siswa' && (
        <div className="bg-white rounded-3xl p-4 sm:p-7 border border-slate-200 shadow-sm space-y-5 sm:space-y-6 animate-in fade-in">
          {/* Header & Policy */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-teal-950 via-teal-900 to-slate-900 text-white space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xl">👥</span>
              <h2 className="font-extrabold text-base sm:text-lg text-white">
                Penetapan Siswa Binaan Tetap ({terapis.nama})
              </h2>
            </div>
            <p className="text-xs text-teal-100 leading-relaxed">
              <strong>Aturan Penugasan Tetap:</strong> Setiap terapis dapat menentukan anak/siswa mana saja yang dapat mendaftar sesi terapi ke Anda secara tetap. Siswa di luar daftar binaan Anda <strong>tidak dapat mendaftar</strong> ke jadwal Anda. Setelah ditetapkan, siswa tersebut juga <strong>hanya dapat mendaftar ke Anda</strong>.
            </p>
            <div className="text-[11px] text-amber-300 font-semibold pt-2 border-t border-teal-800 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>Pada panel Loket Admin, siswa yang telah di-assign juga otomatis hanya memunculkan nama Anda saja sebagai terapis pilihan.</span>
            </div>
          </div>

          {studentAssignMsg && (
            <div className={`p-4 rounded-2xl text-xs font-semibold border ${studentAssignMsg.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : 'bg-red-50 text-red-900 border-red-300'} animate-in fade-in`}>
              {studentAssignMsg.text}
            </div>
          )}

          {/* Stats Bar Compact Mobile-Friendly */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
            <div className="p-2.5 sm:p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center sm:text-left">
              <span className="text-[10px] sm:text-[11px] font-bold text-amber-800 uppercase tracking-wider block">Belum Di-assign</span>
              <div className="text-xl sm:text-2xl font-black text-amber-950 mt-0.5">{unassignedStudents.length} <span className="text-[10px] sm:text-xs font-normal text-amber-700">Anak</span></div>
              <span className="hidden sm:block text-[10px] text-amber-700">Siap Anda tetapkan</span>
            </div>
            <div className="p-2.5 sm:p-4 rounded-2xl bg-teal-50 border border-teal-200 text-center sm:text-left">
              <span className="text-[10px] sm:text-[11px] font-bold text-teal-800 uppercase tracking-wider block">Binaan Anda</span>
              <div className="text-xl sm:text-2xl font-black text-teal-950 mt-0.5">{assignedStudents.length} <span className="text-[10px] sm:text-xs font-normal text-teal-700">Anak</span></div>
              <span className="hidden sm:block text-[10px] text-teal-700">Terkunci ke jadwal Anda</span>
            </div>
            <div className="p-2.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center sm:text-left">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 uppercase tracking-wider block">Total Siswa</span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{pesertaList.length} <span className="text-[10px] sm:text-xs font-normal text-slate-500">Anak</span></div>
              <span className="hidden sm:block text-[10px] text-slate-500">Database resmi ULD</span>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="space-y-2.5 border-b border-slate-100 pb-3">
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold text-center">
              <button
                type="button"
                onClick={() => setFilterStudentScope('belum_diassign')}
                className={`py-2 px-1 rounded-lg transition-all text-[11px] sm:text-xs ${filterStudentScope === 'belum_diassign' ? 'bg-teal-900 text-white shadow-xs font-extrabold' : 'text-slate-700 hover:bg-slate-200'}`}
              >
                Belum Di-assign ({unassignedStudents.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStudentScope('binaan_saya')}
                className={`py-2 px-1 rounded-lg transition-all text-[11px] sm:text-xs ${filterStudentScope === 'binaan_saya' ? 'bg-teal-900 text-white shadow-xs font-extrabold' : 'text-slate-700 hover:bg-slate-200'}`}
              >
                Binaan Saya ({assignedStudents.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStudentScope('semua')}
                className={`py-2 px-1 rounded-lg transition-all text-[11px] sm:text-xs ${filterStudentScope === 'semua' ? 'bg-teal-900 text-white shadow-xs font-extrabold' : 'text-slate-700 hover:bg-slate-200'}`}
              >
                Semua ({pesertaList.length})
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchStudent}
                onChange={e => setSearchStudent(e.target.value)}
                placeholder="🔍 Cari nama siswa / nomor RM / sekolah..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-700 bg-slate-50 font-medium"
              />
              {searchStudent && (
                <button
                  type="button"
                  onClick={() => setSearchStudent('')}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {filterStudentScope === 'belum_diassign' && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium flex items-center gap-1.5">
                <span>👉</span>
                <span>Pilih siswa di bawah ini untuk ditetapkan menjadi <strong>siswa binaan tetap</strong> Anda.</span>
              </div>
            )}
          </div>

          {/* Student Cards List */}
          {displayedStudents.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 space-y-2">
              <div className="text-2xl">👥</div>
              <div className="font-bold text-slate-700">Tidak Ada Siswa yang Sesuai Kriteria</div>
              <p>Coba gunakan kata kunci pencarian lain atau pilih tab filter yang berbeda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedStudents.map(p => {
                const isAssignedToMe = p.assignedTerapisId === terapis.id;
                const isAssignedToOther = p.assignedTerapisId && p.assignedTerapisId !== terapis.id;
                const isUnassigned = !p.assignedTerapisId;

                return (
                  <div
                    key={p.id}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 ${
                      isAssignedToMe
                        ? 'border-teal-300 bg-teal-50/40 shadow-xs'
                        : isAssignedToOther
                          ? 'border-slate-200 bg-slate-50/60 opacity-80'
                          : 'border-slate-200 bg-white hover:border-teal-400'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {p.nomorRekamMedis}
                        </span>
                        {isAssignedToMe && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-extrabold flex items-center gap-1">
                            <span>✓ Siswa Binaan Tetap Anda</span>
                          </span>
                        )}
                        {isAssignedToOther && (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                            🔒 Binaan {p.assignedTerapisNama}
                          </span>
                        )}
                        {isUnassigned && (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                            ⏳ Belum Di-assign
                          </span>
                        )}
                      </div>

                      <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                        {p.namaLengkap}
                      </h3>

                      <div className="text-xs text-slate-600 flex flex-wrap gap-x-2.5 gap-y-1">
                        <span>Wali: <strong>{p.namaWali}</strong></span>
                        <span>·</span>
                        <span>Sekolah: <strong>{p.asalSekolah || 'Kota Probolinggo'}</strong></span>
                        <span>·</span>
                        <span>Kebutuhan: <strong className="text-teal-800">{p.ragamDisabilitas}</strong></span>
                      </div>

                      {p.catatanKhusus && (
                        <p className="text-[11px] text-slate-500 italic mt-0.5">
                          Catatan: {p.catatanKhusus}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 flex justify-end pt-1 sm:pt-0 sm:self-center">
                      {isAssignedToMe ? (
                        <button
                          type="button"
                          onClick={() => handleUnassignStudent(p.id, p.namaLengkap)}
                          className="px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-700 text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
                        >
                          <span>✕ Lepas Binaan</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAssignStudent(p.id, p.namaLengkap)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center gap-1 shadow-2xs ${
                            isAssignedToOther
                              ? 'bg-slate-800 hover:bg-slate-700 text-white'
                              : 'bg-teal-800 hover:bg-teal-700 text-white'
                          }`}
                        >
                          <span>{isAssignedToOther ? '⇄ Alihkan ke Saya' : '+ Tetapkan Binaan'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: Konfigurasi Database & SQL (Eksklusif Akses Psikolog) */}
      {activeTab === 'sql_config' && isPsikolog && (
        <div className="space-y-6 animate-in fade-in">
          {/* Security & Role Notice */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-teal-950 text-white border border-indigo-700/60 shadow-md space-y-3">
            <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wider">
              <span>🔒 Hak Akses Eksklusif Tenaga Ahli Psikolog</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-white">
                  Pengaturan Basis Data Cloud Supabase & Skrip SQL
                </h2>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Sesuai kebijakan keamanan dan integritas operasional ULD Kota Probolinggo, konfigurasi database Supabase cloud, API key, dan eksekusi skrip DDL SQL <strong>dikelola secara eksklusif oleh Psikolog Klinis ({terapis.nama})</strong>. Menu ini tidak dapat diakses oleh Petugas Admin Loket maupun Terapis lainnya.
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <button
                  type="button"
                  disabled={isTestingSupabase}
                  onClick={handleTestSupabaseConnection}
                  className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-all shadow flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  <span>{isTestingSupabase ? '⏳ Menguji...' : '🔌 Uji & Verifikasi Koneksi'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Feedback Message */}
          {supabaseMsg && (
            <div className={`p-4 rounded-2xl text-xs font-semibold border flex items-center gap-2.5 animate-in fade-in ${supabaseMsg.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : supabaseMsg.type === 'error' ? 'bg-red-50 text-red-900 border-red-300' : 'bg-blue-50 text-blue-900 border-blue-300'}`}>
              <span className="text-base">{supabaseMsg.type === 'success' ? '✅' : supabaseMsg.type === 'error' ? '❌' : 'ℹ️'}</span>
              <span className="leading-relaxed">{supabaseMsg.text}</span>
            </div>
          )}

          {/* Grid Layout: Formulir Kredensial & Panduan Setup */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* CARD 1: FORMULIR KREDENSIAL */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    1. Kredensial API Supabase
                  </h3>
                  <p className="text-xs text-slate-500">
                    Masukkan Project URL dan Anon Key dari dashboard Supabase
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${supabaseStatus.isConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                  {supabaseStatus.isConnected ? '🟢 Terhubung' : '⚪ Offline / Lokal'}
                </span>
              </div>

              <form onSubmit={handleSaveSupabase} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Supabase Project URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={supabaseUrl}
                    onChange={e => setSupabaseUrl(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-700"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Ditemukan di: Project Settings → API → Project URL
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Supabase Anon Public API Key *
                  </label>
                  <input
                    type="password"
                    value={supabaseKey}
                    onChange={e => setSupabaseKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-700"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Ditemukan di: Project Settings → API → Project API keys (anon public)
                  </span>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setSupabaseUrl('');
                      setSupabaseKey('');
                      db.setSupabaseCredentials('', '');
                      setSupabaseStatus(db.getSupabaseStatus());
                      setSupabaseMsg({ type: 'info', text: 'Kredensial berhasil direset ke mode offline.' });
                    }}
                    className="px-3 py-2 rounded-xl text-slate-500 hover:text-red-700 hover:bg-red-50 text-xs font-semibold transition-colors"
                  >
                    Reset / Putuskan
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white font-bold text-xs shadow transition-all active:scale-95"
                  >
                    💾 Simpan Kredensial
                  </button>
                </div>
              </form>
            </div>

            {/* CARD 2: PANDUAN EKSEKUSI SCHEMA SQL */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    2. Skema Basis Data (SQL DDL)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Membuat 7 tabel otomatis dengan RLS policies & initial seed data.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-300 font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <span>{copiedSql ? '✓ Tersalin!' : '📋 Salin SQL'}</span>
                </button>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="font-bold text-slate-800">Langkah Menyiapkan Supabase:</div>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] leading-relaxed">
                  <li>Buka proyek di <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-indigo-700 font-bold hover:underline">Supabase Dashboard</a>.</li>
                  <li>Buka menu <strong>SQL Editor</strong> di bilah navigasi kiri.</li>
                  <li>Klik tombol <strong>Salin SQL</strong> di atas, atau buka berkas <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-teal-800 font-bold">supabase-schema.sql</code>.</li>
                  <li>Tempelkan ke dalam SQL Editor Supabase lalu tekan <strong>RUN</strong>.</li>
                  <li>Setelah tabel terbentuk, klik <strong>Uji & Verifikasi Koneksi</strong> di atas!</li>
                </ol>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-700 space-y-1">
                <div className="font-bold text-slate-900">7 Tabel Otomatis:</div>
                <div className="font-mono text-[10px] text-slate-600 flex flex-wrap gap-1">
                  <span className="bg-white px-2 py-0.5 rounded border">terapis</span>
                  <span className="bg-white px-2 py-0.5 rounded border">admin_users</span>
                  <span className="bg-white px-2 py-0.5 rounded border">peserta</span>
                  <span className="bg-white px-2 py-0.5 rounded border">slots_harian</span>
                  <span className="bg-white px-2 py-0.5 rounded border">booking_terapi</span>
                  <span className="bg-white px-2 py-0.5 rounded border">pendaftaran_asesmen_guest</span>
                  <span className="bg-white px-2 py-0.5 rounded border">log_aktivitas</span>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 3: SINKRONISASI DATA ANTARA LOKAL & CLOUD */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                3. Sinkronisasi Data (Cloud Supabase ↔ Penyimpanan Lokal)
              </h3>
              <p className="text-xs text-slate-500">
                Kirim data lokal saat ini ke cloud Supabase atau tarik data terbaru dari cloud ke sistem.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-200 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⬆️</span>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">Push Data Lokal ke Supabase</h4>
                    <span className="text-[10px] text-slate-500">Mengunggah seluruh peserta, slot, booking, dan log ke Supabase</span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!supabaseStatus.isConnected || isTestingSupabase}
                  onClick={handlePushDataToSupabase}
                  className="w-full py-2.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isTestingSupabase ? 'Memproses...' : '⬆️ Push Seluruh Data ke Supabase'}
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⬇️</span>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">Pull Data dari Supabase</h4>
                    <span className="text-[10px] text-slate-500">Menyinkronkan data cloud terbaru ke antarmuka aplikasi lokal</span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!supabaseStatus.isConnected || isTestingSupabase}
                  onClick={handlePullDataFromSupabase}
                  className="w-full py-2.5 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white font-bold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isTestingSupabase ? 'Memproses...' : '⬇️ Pull & Sinkronkan dari Supabase'}
                </button>
              </div>
            </div>
          </div>

          {/* CARD 4: PREVIEW KODE DDL SQL */}
          <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-7 space-y-4 border border-slate-800 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Pratinjau Skrip SQL Supabase (DDL Migration Script)
                </h3>
                <p className="text-xs text-slate-400">
                  Dapat disalin langsung untuk dijalankan di Query Editor Supabase.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopySql}
                className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-colors shrink-0 shadow"
              >
                {copiedSql ? '✓ Tersalin ke Clipboard!' : 'Salin Skrip SQL'}
              </button>
            </div>

            <pre className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-teal-300 overflow-x-auto max-h-72 leading-relaxed">
              {db.generateSupabaseSqlSchema()}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 4: LOG AKTIVITAS (EKSKLUSIF TENAGA AHLI PSIKOLOG) */}
      {activeTab === 'log_aktivitas' && isPsikolog && (
        <div className="bg-white rounded-3xl p-4 sm:p-7 border border-slate-200 shadow-sm space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-100 pb-4 sm:pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                  Hak Akses Khusus Tenaga Ahli Psikolog
                </span>
                <span className="text-xs text-slate-400">Total: {logList.length} aktivitas</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                📜 Log Aktivitas & Audit Trail Sistem
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Eksklusif diperiksa oleh Psikolog Koordinator — Melacak pendaftaran mandiri siswa, penugasan anak binaan, kuota terapi, serta audit keamanan PIN secara real-time.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setLogList(db.getAktivitasLogs())}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 transition-colors flex items-center gap-1.5"
              >
                <span>🔄 Segarkan</span>
              </button>
              <button
                type="button"
                onClick={() => setShowClearLogModal(true)}
                className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs border border-red-200 transition-colors flex items-center gap-1.5"
              >
                <span>🗑️ Kelola Log</span>
              </button>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                🔍 Pencarian Kata Kunci
              </label>
              <input
                type="text"
                value={searchLog}
                onChange={e => setSearchLog(e.target.value)}
                placeholder="Cari pelaku, nama anak, atau tindakan..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                🏷️ Filter Kategori
              </label>
              <select
                value={filterKategoriLog}
                onChange={e => setFilterKategoriLog(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="semua">Semua Kategori ({logList.length})</option>
                <option value="pendaftaran_terapi">Pendaftaran Terapi</option>
                <option value="asesmen">Asesmen Baru</option>
                <option value="penugasan_terapis">Penugasan Terapis</option>
                <option value="manajemen_siswa">Manajemen Siswa</option>
                <option value="jadwal_slot">Jadwal & Kuota Slot</option>
                <option value="keamanan_pin">Keamanan PIN</option>
                <option value="sistem">Sistem</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                👤 Filter Pelaku / Role
              </label>
              <select
                value={filterRoleLog}
                onChange={e => setFilterRoleLog(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="semua">Semua Role Pelaku</option>
                <option value="peserta">Siswa / Wali Siswa</option>
                <option value="terapis">Tenaga Ahli</option>
                <option value="admin">Admin Loket</option>
                <option value="sistem">Sistem Otomatis</option>
              </select>
            </div>
          </div>

          {/* Log List Feed */}
          <div className="space-y-3">
            {filteredLogList.length === 0 ? (
              <div className="text-center py-10 sm:py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-4 sm:p-6">
                <div className="text-3xl mb-2">📭</div>
                <h4 className="font-bold text-slate-700 text-sm">Tidak ada log aktivitas ditemukan</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {searchLog || filterKategoriLog !== 'semua' || filterRoleLog !== 'semua'
                    ? 'Tidak ada rekaman log yang cocok dengan filter pencarian Anda.'
                    : 'Belum ada catatan aktivitas baru dalam sistem ULD.'}
                </p>
                {(searchLog || filterKategoriLog !== 'semua' || filterRoleLog !== 'semua') && (
                  <button
                    onClick={() => {
                      setSearchLog('');
                      setFilterKategoriLog('semua');
                      setFilterRoleLog('semua');
                    }}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden bg-white">
                {filteredLogList.map((log) => {
                  const katBadge = getKategoriBadge(log.kategori);
                  const rBadge = getRoleBadge(log.rolePelaku);
                  return (
                    <div key={log.id} className="p-3.5 sm:p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 sm:gap-3">
                      <div className="flex items-start gap-2.5 sm:gap-3">
                        <span className="text-xl sm:text-2xl mt-0.5 shrink-0 select-none">
                          {log.icon || '📌'}
                        </span>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span className="font-black text-slate-900 text-sm">
                              {log.judul}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${katBadge.bg}`}>
                              {katBadge.label}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${rBadge.bg}`}>
                              {rBadge.label}: {log.pelaku}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {log.deskripsi}
                          </p>
                        </div>
                      </div>

                      <div className="text-left sm:text-right sm:shrink-0 text-[11px] font-mono text-slate-400 pl-8 sm:pl-0">
                        {log.waktu}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Kelola Log (Khusus Psikolog) */}
      {showClearLogModal && isPsikolog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-4 sm:p-6 space-y-4 shadow-2xl animate-in zoom-in-95 border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🗑️</span>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Kelola Audit Log Aktivitas
                </h3>
                <p className="text-xs text-slate-500">
                  Hak Istimewa Tenaga Ahli Psikolog ULD Kota Probolinggo
                </p>
              </div>
            </div>

            <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
              <p className="font-bold">⚠️ Perhatian Audit Trail</p>
              <p className="text-[11px] leading-relaxed">
                Log aktivitas digunakan untuk memantau integritas pendaftaran, keamanan PIN, dan penugasan siswa binaan tetap. Pastikan Anda telah memeriksa riwayat yang dibutuhkan sebelum melakukan pembersihan.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleClearAllLogs}
                className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <span>🗑️ Kosongkan Semua Catatan Log</span>
              </button>

              <button
                type="button"
                onClick={handleResetLogs}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-2 border border-slate-300"
              >
                <span>🔄 Kembalikan ke Log Awal (Contoh Simulasi)</span>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowClearLogModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ubah PIN Pribadi */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveNewPin} className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <h3 className="font-extrabold text-slate-900 text-base">
              Ubah PIN Pribadi Saya
            </h3>
            <p className="text-xs text-slate-500">
              {terapis.nama} ({terapis.spesialisasiLabel})
            </p>

            {pinChangeMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                {pinChangeMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Masukkan PIN Baru (6 Angka)
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                required
                value={newPinInput}
                onChange={e => setNewPinInput(e.target.value)}
                placeholder="Contoh: 123456"
                className="w-full px-3.5 py-3 rounded-xl border border-slate-300 font-mono text-center font-bold text-lg"
              />
            </div>

            <div className="pt-2 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowPinModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs"
              >
                Simpan PIN Baru
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Tulis Catatan Pasien */}
      {selectedBookingForNote && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <h3 className="font-extrabold text-slate-900 text-base">
              Catatan Sesi Terapi
            </h3>
            <textarea
              rows={4}
              value={noteContent}
              onChange={e => setNoteContent(e.target.value)}
              placeholder="Contoh: Anak mampu berkonsentrasi selama 15 menit, kontak mata membaik..."
              className="w-full p-3 rounded-xl border border-slate-300 text-xs"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setSelectedBookingForNote(null)}
                className="px-3 py-2 rounded-xl border text-xs"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  db.updateBookingStatus(selectedBookingForNote.id, 'selesai', noteContent);
                  setSelectedBookingForNote(null);
                  setActiveTab('pasien');
                }}
                className="px-4 py-2 rounded-xl bg-teal-800 text-white font-bold text-xs"
              >
                Simpan Catatan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PEMBATALAN JADWAL MENDADAK OLEH TERAPIS */}
      {bookingToCancelMendadak && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setIsSubmittingBatalMendadak(true);
              const res = db.batalkanBookingOlehTerapis(
                bookingToCancelMendadak.id,
                terapis.nama,
                alasanBatalMendadak.trim()
              );
              setIsSubmittingBatalMendadak(false);
              if (res.success) {
                alert(`Jadwal sesi terapi ananda "${bookingToCancelMendadak.studentName}" berhasil dibatalkan mendadak. Kuota slot sesi otomatis dibebaskan kembali.`);
                setBookingToCancelMendadak(null);
                setSlotsList(db.getSlotsList(selectedDate));
              } else {
                alert(res.error || 'Gagal membatalkan jadwal.');
              }
            }}
            className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl animate-in zoom-in-95 border-2 border-rose-500"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Batalkan Jadwal Pasien (Mendadak)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Khusus situasi darurat / keperluan mendadak tenaga ahli.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBookingToCancelMendadak(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-950 space-y-1">
              <div className="font-bold text-[10px] uppercase text-rose-800">Pasien yang Dibatalkan:</div>
              <div className="text-base font-black text-slate-900">
                {bookingToCancelMendadak.studentName}
              </div>
              <div className="font-mono text-slate-700">
                📅 {bookingToCancelMendadak.tanggal} · ⏰ {bookingToCancelMendadak.jamMulai} - {bookingToCancelMendadak.jamSelesai} WIB
              </div>
              <div className="text-[10px] text-slate-500">Kode: {bookingToCancelMendadak.kodeBooking}</div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alasan Pembatalan Mendadak *
              </label>
              <textarea
                required
                rows={3}
                value={alasanBatalMendadak}
                onChange={e => setAlasanBatalMendadak(e.target.value)}
                placeholder="Contoh: Ada rapat dinas darurat / kondisi kesehatan mendadak / penugasan luar kota"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-rose-600 font-medium"
              />
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Setelah dibatalkan, kuota slot sesi ini akan otomatis kembali kosong/tersedia, dan riwayat aktivitas dicatat sebagai pembatalan mendadak oleh tenaga ahli.
            </p>

            <div className="pt-2 flex flex-col-reverse sm:flex-row gap-2 justify-end">
              <button
                type="button"
                onClick={() => setBookingToCancelMendadak(null)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 text-center"
              >
                Kembali
              </button>
              <button
                type="submit"
                disabled={isSubmittingBatalMendadak}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow transition-all active:scale-95 disabled:opacity-50 text-center flex items-center justify-center gap-1.5"
              >
                <span>{isSubmittingBatalMendadak ? 'Memproses...' : '⚠️ Konfirmasi Batalkan Jadwal'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
