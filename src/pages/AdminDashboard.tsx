import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { db, checkBatasPendaftaranHMinus1 } from '../services/supabase';
import { Peserta, PendaftaranAsesmenGuest, Terapis, SlotHarian, BookingTerapi, LogAktivitas } from '../types';

interface Props {
  onLogout?: () => void;
  initialTab?: 'pendaftaran_loket' | 'peserta_pin';
}

export const AdminDashboard: React.FC<Props> = ({ onLogout, initialTab }) => {
  const [activeTab, setActiveTab] = useState<'pendaftaran_loket' | 'peserta_pin'>(initialTab || 'pendaftaran_loket');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  
  // Data lists from DB with real-time reactivity
  const [pesertaList, setPesertaList] = useState<Peserta[]>(() => db.getPesertaList());
  const terapisList = db.getTerapisList();
  const adminList = db.getAdminList();
  const [slotsList, setSlotsList] = useState<SlotHarian[]>(() => db.getSlotsList());
  const [bookingsList, setBookingsList] = useState<BookingTerapi[]>(() => db.getBookingsList());
  const [asesmenList, setAsesmenList] = useState<PendaftaranAsesmenGuest[]>(() => db.getAsesmenGuestList());

  // Assign Terapis Modal State
  const [studentToAssign, setStudentToAssign] = useState<Peserta | null>(null);
  const [selectedAssignTerapisId, setSelectedAssignTerapisId] = useState<string>(terapisList[0]?.id || '');

  // Synchronize on events
  useEffect(() => {
    const handleDataUpdate = () => {
      setPesertaList(db.getPesertaList());
      setSlotsList(db.getSlotsList());
      setBookingsList(db.getBookingsList());
      setAsesmenList(db.getAsesmenGuestList());
    };
    window.addEventListener('uld_data_updated', handleDataUpdate);
    return () => {
      window.removeEventListener('uld_data_updated', handleDataUpdate);
    };
  }, []);

  // Active Admin (Sugeng / Helmi)
  const [activeAdminId, setActiveAdminId] = useState<string>(adminList[0]?.id || 'admin-1');
  const activeAdmin = adminList.find(a => a.id === activeAdminId) || adminList[0];

  // Admin PIN change
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [newAdminPin, setNewAdminPin] = useState('');
  const [adminPinMsg, setAdminPinMsg] = useState('');

  // 1. FITUR UTAMA LOKET: PENDAFTARAN TERAPI LANGSUNG DI LOKET ULD (SEMUA 4 LAYANAN)
  const [selectedTerapisIdForBooking, setSelectedTerapisIdForBooking] = useState<string>(terapisList[0]?.id || '');
  const [selectedPesertaForBooking, setSelectedPesertaForBooking] = useState<string>('');
  const [selectedSlotForBooking, setSelectedSlotForBooking] = useState<string>('');
  const [catatanLoketAdmin, setCatatanLoketAdmin] = useState<string>('');
  const [bookingMsg, setBookingMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [showBukaSlotLoketModal, setShowBukaSlotLoketModal] = useState(false);
  const [selectedLoketTicket, setSelectedLoketTicket] = useState<BookingTerapi | null>(null);
  const [filterLayananTable, setFilterLayananTable] = useState<string>('all');

  // Form Buka Slot Baru di Loket
  const [newSlotTerapisId, setNewSlotTerapisId] = useState(terapisList[0]?.id || '');
  const [newSlotTanggal, setNewSlotTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [newSlotJamMulai, setNewSlotJamMulai] = useState('09:00');
  const [newSlotJamSelesai, setNewSlotJamSelesai] = useState('10:00');
  const [newSlotRuang, setNewSlotRuang] = useState('');
  const [newSlotCatatan, setNewSlotCatatan] = useState('Sesi terapi pendaftaran loket ULD Kota Probolinggo.');

  // 2. FITUR: PENJADWALAN ASESMEN BARU OLEH ADMIN
  const [showAddAsesmenModal, setShowAddAsesmenModal] = useState(false);
  const [asesmenNamaAnak, setAsesmenNamaAnak] = useState('');
  const [asesmenNamaOrtu, setAsesmenNamaOrtu] = useState('');
  const [asesmenNoWa, setAsesmenNoWa] = useState('');
  const [asesmenTanggal, setAsesmenTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [asesmenJam, setAsesmenJam] = useState('09:00 WIB');
  const [asesmenIndikasi, setAsesmenIndikasi] = useState('');
  const [asesmenSuccessMsg, setAsesmenSuccessMsg] = useState('');

  // 3. FITUR: BUAT AKUN SISWA TERAPI BARU (CUKUP NAMA, NAMA ORTU, PIN)
  const [showSimpleAddPesertaModal, setShowSimpleAddPesertaModal] = useState(false);
  const [simpleNamaAnak, setSimpleNamaAnak] = useState('');
  const [simpleNamaOrtu, setSimpleNamaOrtu] = useState('');
  const [simplePin, setSimplePin] = useState('');
  const [createdStudentCard, setCreatedStudentCard] = useState<Peserta | null>(null);

  // Reset PIN modal
  const [selectedPesertaReset, setSelectedPesertaReset] = useState<Peserta | null>(null);
  const [resetPinValue, setResetPinValue] = useState('');
  const [searchPeserta, setSearchPeserta] = useState('');

  // Kelulusan & Hapus Siswa Lama
  const [studentToDelete, setStudentToDelete] = useState<Peserta | null>(null);
  const [deleteReason, setDeleteReason] = useState('Telah lulus & menyelesaikan program terapi di ULD');
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState('');

  // Selected student object for loket booking
  const currentSelectedPesertaForBooking = pesertaList.find(p => p.id === selectedPesertaForBooking);

  // Aturan 2: begitu juga di panel admin ketika sudah di assign terapis, siswa tersebut hanya muncul terapisnya saja.
  const availableTerapisForLoket = currentSelectedPesertaForBooking?.assignedTerapisId
    ? terapisList.filter(t => t.id === currentSelectedPesertaForBooking.assignedTerapisId)
    : terapisList;

  // Selected therapist object
  const currentSelectedTerapis = terapisList.find(t => t.id === selectedTerapisIdForBooking) || availableTerapisForLoket[0] || terapisList[0];
  
  // Available slots for the selected therapist
  const availableSlotsForSelectedTerapis = slotsList.filter(s => 
    s.terapisId === (currentSelectedTerapis?.id || selectedTerapisIdForBooking) && s.statusSlot !== 'dibatalkan'
  );

  const handleSelectPesertaForBooking = (pId: string) => {
    setSelectedPesertaForBooking(pId);
    setSelectedSlotForBooking('');
    const p = pesertaList.find(x => x.id === pId);
    if (p?.assignedTerapisId) {
      setSelectedTerapisIdForBooking(p.assignedTerapisId);
    }
  };

  const handleConfirmAssignTerapis = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!studentToAssign || !selectedAssignTerapisId) return;
    const res = db.assignPesertaKeTerapis(studentToAssign.id, selectedAssignTerapisId, {
      nama: activeAdmin.nama,
      role: 'admin'
    });
    if (res.success) {
      confetti({ particleCount: 50 });
      setPesertaList(db.getPesertaList());
      if (selectedPesertaForBooking === studentToAssign.id) {
        setSelectedTerapisIdForBooking(selectedAssignTerapisId);
      }
      setStudentToAssign(null);
    }
  };

  const handleConfirmUnassignTerapis = (pesertaId: string) => {
    const res = db.lepasPenugasanPeserta(pesertaId, {
      nama: activeAdmin.nama,
      role: 'admin'
    });
    if (res.success) {
      setPesertaList(db.getPesertaList());
      setStudentToAssign(null);
    }
  };

  const filteredPesertaList = pesertaList.filter(p => {
    if (!searchPeserta.trim()) return true;
    const q = searchPeserta.toLowerCase();
    return p.namaLengkap.toLowerCase().includes(q) ||
      (p.asalSekolah && p.asalSekolah.toLowerCase().includes(q)) ||
      p.namaWali.toLowerCase().includes(q) ||
      p.nomorRekamMedis.toLowerCase().includes(q);
  });

  // Filtered bookings table
  const filteredBookingsTable = bookingsList.filter(b => {
    if (filterLayananTable === 'all') return true;
    return b.terapisId === filterLayananTable || b.spesialisasi === filterLayananTable;
  });


  const handleSaveAdminPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminPin.trim() || newAdminPin.trim().length !== 6) {
      setAdminPinMsg('PIN harus terdiri dari 6 digit angka.');
      return;
    }
    db.gantiPinAdmin(activeAdmin.id, newAdminPin.trim());
    setAdminPinMsg(`PIN untuk ${activeAdmin.nama} berhasil diperbarui!`);
    setTimeout(() => {
      setShowAdminPinModal(false);
      setAdminPinMsg('');
      setNewAdminPin('');
    }, 1500);
  };

  // --- SUBMIT PENDAFTARAN TERAPI LANGSUNG DI LOKET ULD (SEMUA LAYANAN) ---
  const handleScheduleTerapiLoket = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingMsg(null);

    if (!selectedPesertaForBooking) {
      setBookingMsg({ type: 'error', text: 'Silakan pilih siswa yang hadir di loket ULD.' });
      return;
    }
    if (!selectedSlotForBooking) {
      setBookingMsg({ type: 'error', text: 'Silakan pilih slot sesi terapi yang tersedia.' });
      return;
    }

    const t = currentSelectedTerapis;
    const defaultCatatan = `Pendaftaran langsung di Loket ULD oleh Petugas Admin (${activeAdmin.nama}) untuk ${t?.spesialisasiLabel || 'Terapi'}`;

    const res = db.buatBookingTerapi(
      selectedPesertaForBooking,
      selectedSlotForBooking,
      catatanLoketAdmin.trim() || defaultCatatan,
      { isAdminBooking: true, adminName: activeAdmin.nama }
    );

    if (res.success && res.booking) {
      confetti({ particleCount: 80, spread: 70 });
      setBookingMsg({
        type: 'success',
        text: `Berhasil! Siswa berhasil didaftarkan langsung di Loket ULD (${res.booking.kodeBooking}) oleh ${activeAdmin.nama}.`
      });
      setSelectedLoketTicket(res.booking);
      setSelectedPesertaForBooking('');
      setSelectedSlotForBooking('');
      setCatatanLoketAdmin('');
    } else {
      setBookingMsg({
        type: 'error',
        text: res.error || 'Gagal mendaftarkan siswa di loket.'
      });
    }
  };

  // --- BUKA SLOT BARU DI LOKET ---
  const handleBukaSlotLoket = (e: React.FormEvent) => {
    e.preventDefault();
    const t = terapisList.find(item => item.id === (newSlotTerapisId || selectedTerapisIdForBooking)) || terapisList[0];
    if (!t) return;

    const newSlot = db.bukaSlotHarian({
      terapisId: t.id,
      tanggal: newSlotTanggal,
      jamMulai: newSlotJamMulai,
      jamSelesai: newSlotJamSelesai,
      spesialisasi: t.spesialisasi,
      ruang: newSlotRuang.trim() || t.ruangPraktek,
      kuotaMaksimal: 1,
      catatanTerapis: newSlotCatatan.trim()
    });

    confetti({ particleCount: 50 });
    setSelectedTerapisIdForBooking(t.id);
    setSelectedSlotForBooking(newSlot.id);
    setShowBukaSlotLoketModal(false);
    setBookingMsg({
      type: 'success',
      text: `Slot baru berhasil dibuka di loket untuk ${t.nama} (${newSlotTanggal}, ${newSlotJamMulai} - ${newSlotJamSelesai} WIB). Otomatis dipilih pada formulir.`
    });
  };

  // --- BATALKAN BOOKING ---
  const handleBatalkanBooking = (bookingId: string) => {
    if (window.confirm('Batalkan jadwal sesi terapi ini? Slot akan dikembalikan agar dapat didaftarkan kembali.')) {
      db.updateBookingStatus(bookingId, 'batal', `Dibatalkan oleh Petugas Admin (${activeAdmin.nama})`);
      setBookingMsg({ type: 'success', text: 'Jadwal sesi terapi berhasil dibatalkan.' });
    }
  };

  // --- SUBMIT BUAT AKUN SISWA TERAPI BARU (CUKUP NAMA, NAMA ORTU, PIN) ---
  const handleOpenSimpleAddStudent = () => {
    setSimpleNamaAnak('');
    setSimpleNamaOrtu('');
    setSimplePin(Math.floor(100000 + Math.random() * 900000).toString());
    setShowSimpleAddPesertaModal(true);
  };

  const handleSaveSimpleStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simpleNamaAnak.trim() || !simpleNamaOrtu.trim()) {
      alert('Nama anak dan nama orang tua wajib diisi.');
      return;
    }

    const created = db.buatAkunSiswaBaru(
      simpleNamaAnak.trim(),
      simpleNamaOrtu.trim(),
      simplePin.trim()
    );

    confetti({ particleCount: 70 });
    setShowSimpleAddPesertaModal(false);
    setCreatedStudentCard(created);
  };

  // --- SUBMIT PENJADWALAN ASESMEN BARU OLEH ADMIN ---
  const handleScheduleNewAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!asesmenNamaAnak.trim() || !asesmenNamaOrtu.trim() || !asesmenNoWa.trim()) {
      alert('Nama anak, nama orang tua, dan nomor WhatsApp wajib diisi.');
      return;
    }

    const newAsm = db.jadwalkanAsesmenOlehAdmin({
      namaAnak: asesmenNamaAnak.trim(),
      namaOrangTua: asesmenNamaOrtu.trim(),
      nomorWhatsApp: asesmenNoWa.trim(),
      tanggalRencanaDatang: asesmenTanggal,
      jamRencanaDatang: asesmenJam,
      indikasiAwal: asesmenIndikasi.trim() || 'Asesmen awal tumbuh kembang terjadwal loket ULD',
      petugasAdmin: activeAdmin.nama
    });

    confetti({ particleCount: 60 });
    setShowAddAsesmenModal(false);
    setAsesmenSuccessMsg(`Asesmen baru untuk ${newAsm.namaAnak} berhasil dijadwalkan pada ${newAsm.tanggalRencanaDatang} (${newAsm.jamRencanaDatang}) oleh ${activeAdmin.nama}!`);
    setTimeout(() => setAsesmenSuccessMsg(''), 5000);
  };

  const handleResetPin = () => {
    if (!selectedPesertaReset || !resetPinValue) return;
    db.resetPinPeserta(selectedPesertaReset.id, resetPinValue);
    setSelectedPesertaReset(null);
    setResetPinValue('');
    alert(`PIN untuk peserta ${selectedPesertaReset.namaLengkap} berhasil diperbarui.`);
  };

  const handleConfirmDeleteStudent = () => {
    if (!studentToDelete) return;
    const nama = studentToDelete.namaLengkap;
    const success = db.hapusPeserta(studentToDelete.id, deleteReason);
    if (success) {
      confetti({ particleCount: 50 });
      setDeleteSuccessMsg(`Siswa an. "${nama}" berhasil dinyatakan LULUS dan dihapus dari daftar aktif.`);
      setStudentToDelete(null);
      setTimeout(() => setDeleteSuccessMsg(''), 5000);
    }
  };

  const getTerapisName = (terapisId?: string) => {
    if (!terapisId) return 'Tenaga Ahli ULD';
    const t = terapisList.find(x => x.id === terapisId);
    return t ? t.nama : 'Tenaga Ahli ULD';
  };

  const getSpesialisasiLabel = (code: string) => {
    switch (code) {
      case 'terapis_perilaku': return 'Terapi Perilaku (ABA)';
      case 'fisioterapis': return 'Fisioterapi';
      case 'tenaga_plb': return 'Pendidikan Luar Biasa (PLB)';
      case 'psikolog': return 'Konseling & Observasi Psikologi';
      default: return code;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Admin Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-teal-400 font-semibold tracking-wide">
              <span>Pemerintah Kota Probolinggo</span>
              <span aria-hidden="true">·</span>
              <span>Loket Administrasi ULD</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Petugas: {activeAdmin.nama}
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span>No. WhatsApp Petugas:</span>
              <span className="font-mono text-teal-300 font-bold">+{activeAdmin.nomorTelepon}</span>
              <span>·</span>
              <span className="font-mono text-slate-400">PIN: {activeAdmin.pin}</span>
            </p>
          </div>

          <div className="shrink-0 flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-800 p-1 rounded-xl text-xs">
              {adminList.map(adm => (
                <button
                  key={adm.id}
                  onClick={() => {
                    setActiveAdminId(adm.id);
                    setBookingMsg(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${activeAdminId === adm.id ? 'bg-teal-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                  {adm.nama}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAdminPinModal(true)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 text-xs font-bold transition-colors"
            >
              🔑 PIN
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
                title="Keluar dan Kembali ke Beranda"
              >
                <span>🚪 Log Out</span>
                <span className="hidden sm:inline">(Ke Beranda)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs (Aturan 4: Laman admin isinya cukup pendaftaran terapi loket uld dan manajemen siswa dan pin saja) */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl text-xs font-semibold overflow-x-auto">
        {/* TAB 1: PENDAFTARAN TERAPI LANGSUNG DI LOKET ULD (SEMUA LAYANAN) */}
        <button
          onClick={() => setActiveTab('pendaftaran_loket')}
          className={`px-4 py-2.5 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'pendaftaran_loket' ? 'bg-teal-900 text-white shadow-sm font-bold' : 'text-slate-700 hover:bg-slate-300/60'}`}
        >
          <span>🏥</span>
          <span>Pendaftaran Terapi Loket ULD</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${activeTab === 'pendaftaran_loket' ? 'bg-teal-700 text-white' : 'bg-slate-300 text-slate-900'}`}>
            {bookingsList.filter(b => b.status === 'terjadwal').length}
          </span>
        </button>

        {/* TAB 2: MANAJEMEN PESERTA & PIN */}
        <button
          onClick={() => setActiveTab('peserta_pin')}
          className={`px-4 py-2.5 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'peserta_pin' ? 'bg-teal-900 text-white shadow-sm font-bold' : 'text-slate-700 hover:bg-slate-300/60'}`}
        >
          <span>👥</span>
          <span>Manajemen Siswa & PIN</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${activeTab === 'peserta_pin' ? 'bg-teal-700 text-white' : 'bg-slate-300 text-slate-900'}`}>
            {pesertaList.length}
          </span>
        </button>
      </div>

      {/* TAB 1: PENDAFTARAN TERAPI LANGSUNG DI LOKET ULD (SEMUA LAYANAN) */}
      {activeTab === 'pendaftaran_loket' && (
        <div className="space-y-6">
          {/* Banner Loket */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-teal-950 via-teal-900 to-slate-900 text-white shadow space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏥</span>
                <h2 className="text-lg font-extrabold text-white">
                  Loket Pendaftaran Terapi Langsung ULD Kota Probolinggo
                </h2>
              </div>
              <span className="px-3 py-1 rounded-full bg-teal-800 border border-teal-700 text-teal-200 text-xs font-bold">
                Petugas Loket: {activeAdmin.nama} ({activeAdmin.nomorTelepon})
              </span>
            </div>
            <p className="text-xs sm:text-sm text-teal-100 leading-relaxed">
              Karena siswa <strong>tidak dapat mendaftar mandiri secara online</strong>, petugas admin melayani pendaftaran sesi terapi secara langsung bagi orang tua/siswa yang hadir di loket fisik ULD. Admin dapat mendaftarkan siswa ke <strong>seluruh 4 layanan spesialisasi</strong>.
            </p>
            <div className="text-[11px] text-amber-300 font-medium flex items-center gap-2 pt-1 border-t border-teal-800">
              <span>⚠️</span>
              <span>Ketentuan Kuota: Setiap siswa dibatasi maksimal 1 kali pendaftaran sesi per minggu kalender untuk asas pemerataan.</span>
            </div>
          </div>

          {bookingMsg && (
            <div className={`p-4 rounded-2xl text-xs font-semibold border ${bookingMsg.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : 'bg-red-50 text-red-900 border-red-300'}`}>
              {bookingMsg.text}
            </div>
          )}

          {/* FORM PENDAFTARAN LOKET */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Formulir Pendaftaran Siswa Langsung di Loket ULD
                </h3>
                <p className="text-xs text-slate-500">
                  Didaftarkan langsung oleh Petugas Admin: <strong>{activeAdmin.nama}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setNewSlotTerapisId(selectedTerapisIdForBooking);
                  setShowBukaSlotLoketModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5"
              >
                <span>+ Buka Slot Baru di Loket</span>
              </button>
            </div>

            <form onSubmit={handleScheduleTerapiLoket} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Pilih Siswa */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    1. Pilih Siswa Hadir di Loket *
                  </label>
                  <select
                    required
                    value={selectedPesertaForBooking}
                    onChange={e => handleSelectPesertaForBooking(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option value="">-- Pilih Nama Siswa Terdaftar --</option>
                    {pesertaList.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.namaLengkap} ({p.nomorRekamMedis}) {p.assignedTerapisNama ? `[Binaan: ${p.assignedTerapisNama}]` : '[Belum Di-assign]'}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    {pesertaList.length} siswa rutin terdaftar aktif.
                  </span>
                </div>

                {/* 2. Pilih Layanan / Tenaga Ahli (Hanya muncul terapisnya saja jika sudah di-assign) */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    2. Pilih Layanan & Tenaga Ahli *
                  </label>
                  <select
                    required
                    value={selectedTerapisIdForBooking}
                    onChange={e => {
                      setSelectedTerapisIdForBooking(e.target.value);
                      setSelectedSlotForBooking('');
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    {availableTerapisForLoket.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.spesialisasiLabel} - {t.nama}
                      </option>
                    ))}
                  </select>

                  {/* Keterangan Otomatis Sesuai Aturan User 2 */}
                  {currentSelectedPesertaForBooking?.assignedTerapisId ? (
                    <span className="text-[11px] text-teal-800 font-bold mt-1 block bg-teal-50 px-2 py-1 rounded-lg border border-teal-200">
                      🔒 Terkunci: Siswa binaan tetap {currentSelectedPesertaForBooking.assignedTerapisNama}. Hanya terapis ini yang muncul.
                    </span>
                  ) : currentSelectedPesertaForBooking ? (
                    <div className="mt-1 flex items-center justify-between gap-1 text-[11px] text-amber-800 bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                      <span>⚠️ Siswa ini belum memiliki terapis tetap.</span>
                      <button
                        type="button"
                        onClick={() => {
                          setStudentToAssign(currentSelectedPesertaForBooking);
                          setSelectedAssignTerapisId(terapisList[0]?.id || '');
                        }}
                        className="px-2 py-0.5 rounded bg-teal-800 text-white font-bold text-[10px]"
                      >
                        + Assign Sekarang
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-teal-700 font-semibold mt-1 block">
                      Ruang: {currentSelectedTerapis?.ruangPraktek}
                    </span>
                  )}
                </div>

                {/* 3. Pilih Slot Sesi Terapi (Validasi Aturan 3: Minimal H-1 di maksimal jam 24.00 WIB) */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    3. Pilih Slot Sesi Tersedia *
                  </label>
                  <select
                    required
                    value={selectedSlotForBooking}
                    onChange={e => setSelectedSlotForBooking(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option value="">-- Pilih Slot Jam Tersedia --</option>
                    {availableSlotsForSelectedTerapis.map(s => {
                      const isFull = s.kuotaTerisi >= s.kuotaMaksimal;
                      const deadline = checkBatasPendaftaranHMinus1(s.tanggal);
                      const isBlocked = isFull || !deadline.bisaDaftar;
                      return (
                        <option key={s.id} value={s.id} disabled={isBlocked}>
                          {s.tanggal} ({s.jamMulai} - {s.jamSelesai} WIB) {!deadline.bisaDaftar ? `[DITUTUP: ${deadline.labelBatas}]` : isFull ? '[PENUH]' : `[Tersedia ${s.kuotaMaksimal - s.kuotaTerisi} kuota]`}
                        </option>
                      );
                    })}
                  </select>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Aturan Batas: Minimal H-1 hari di maksimal jam 24.00 WIB (Hari H ditutup).
                  </span>
                </div>
              </div>

              {/* 4. Catatan Loket / Keluhan Siswa */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  4. Catatan Pendaftaran Loket / Keluhan Siswa Hari Ini
                </label>
                <textarea
                  rows={2}
                  value={catatanLoketAdmin}
                  onChange={e => setCatatanLoketAdmin(e.target.value)}
                  placeholder="Contoh: Orang tua datang langsung ke loket ULD mengonfirmasi jadwal terapi wicara..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-3 rounded-2xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all transform active:scale-95 flex items-center gap-2"
                >
                  <span>✓ Daftarkan Siswa di Loket ULD</span>
                  <span>(Oleh {activeAdmin.nama})</span>
                </button>
              </div>
            </form>
          </div>

          {/* DAFTAR PENDAFTARAN LOKET TERDAFTAR */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Daftar Pendaftaran Terapi di Loket ULD ({filteredBookingsTable.length} Sesi)
                </h3>
                <p className="text-xs text-slate-500">
                  Seluruh pendaftaran terapi yang dilayani langsung oleh loket administrasi.
                </p>
              </div>

              {/* Filter Layanan */}
              <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-1 sm:pb-0">
                <span className="text-slate-500 font-bold shrink-0">Filter:</span>
                <button
                  type="button"
                  onClick={() => setFilterLayananTable('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${filterLayananTable === 'all' ? 'bg-teal-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  Semua Layanan
                </button>
                {terapisList.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setFilterLayananTable(t.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${filterLayananTable === t.id ? 'bg-teal-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    {t.spesialisasiLabel}
                  </button>
                ))}
              </div>
            </div>

            {filteredBookingsTable.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
                Belum ada data pendaftaran terapi untuk filter ini. Silakan gunakan formulir di atas untuk mendaftarkan siswa.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Kode Booking</th>
                      <th className="px-4 py-3">Nama Siswa</th>
                      <th className="px-4 py-3">Layanan & Tenaga Ahli</th>
                      <th className="px-4 py-3">Jadwal Tanggal & Jam</th>
                      <th className="px-4 py-3">Didaftarkan Oleh</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBookingsTable.map(b => {
                      const p = pesertaList.find(x => x.id === b.pesertaId);
                      return (
                        <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-teal-900">
                            {b.kodeBooking}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900 text-sm">
                              {p?.namaLengkap || b.pesertaId}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Wali: {p?.namaWali || '-'} · RM: {p?.nomorRekamMedis}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-900 block">
                              {getSpesialisasiLabel(b.spesialisasi)}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {getTerapisName(b.terapisId)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-bold text-slate-800">{b.tanggal}</div>
                            <div className="text-[11px] text-slate-500">{b.jamMulai} - {b.jamSelesai} WIB</div>
                          </td>
                          <td className="px-4 py-3 text-[11px] font-medium text-teal-800">
                            {b.didaftarkanOlehAdmin || 'Loket ULD'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              b.status === 'terjadwal' 
                                ? 'bg-emerald-100 text-emerald-900' 
                                : b.status === 'batal'
                                  ? 'bg-red-100 text-red-900'
                                  : 'bg-slate-100 text-slate-800'
                            }`}>
                              {b.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setSelectedLoketTicket(b)}
                                className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-bold transition-colors"
                              >
                                Tiket
                              </button>
                              {b.status !== 'batal' && (
                                <button
                                  onClick={() => handleBatalkanBooking(b.id)}
                                  className="text-[11px] text-red-600 hover:text-red-800 font-medium"
                                >
                                  Batalkan
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MANAJEMEN SISWA & PIN */}
      {activeTab === 'peserta_pin' && (
        <div className="space-y-4">
          {deleteSuccessMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <span>🎓</span>
              <span>{deleteSuccessMsg}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Daftar Siswa Terapi Rutin ULD Kota Probolinggo ({pesertaList.length} Siswa)
              </h2>
              <p className="text-xs text-slate-500">
                Admin dapat membuat akun siswa baru, mereset PIN, atau menghapus data siswa yang sudah lulus.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={searchPeserta}
                onChange={e => setSearchPeserta(e.target.value)}
                placeholder="Cari nama siswa / wali..."
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-teal-700"
              />
              <a
                href="/pdf/PIN_PESERTA_TERAPI_ULD.pdf"
                download="PIN_PESERTA_TERAPI_ULD.pdf"
                className="px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-2xs"
                title="Download Dokumen PDF Daftar PIN Semua Siswa Terapi"
              >
                <span>📄 Unduh PDF PIN Siswa</span>
              </a>
              <a
                href="/pdf/PIN_PEKERJA_ULD.pdf"
                download="PIN_PEKERJA_ULD.pdf"
                className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-2xs"
                title="Download Dokumen PDF Daftar PIN Pekerja ULD (Terapis & Admin)"
              >
                <span>📄 Unduh PDF PIN Pekerja</span>
              </a>
              <button
                onClick={handleOpenSimpleAddStudent}
                className="px-4 py-2 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs transition-colors shadow-sm whitespace-nowrap flex items-center gap-1.5"
              >
                <span>+ Buat Akun Siswa Baru</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="px-4 py-3">No. RM</th>
                    <th className="px-4 py-3">Nama Siswa</th>
                    <th className="px-4 py-3">Terapis Pembina Tetap</th>
                    <th className="px-4 py-3">Nama Orang Tua / Wali</th>
                    <th className="px-4 py-3">PIN Pribadi Siswa</th>
                    <th className="px-4 py-3">Asal Sekolah</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPesertaList.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-800">
                        {p.nomorRekamMedis}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 text-sm">
                        {p.namaLengkap}
                      </td>
                      <td className="px-4 py-3">
                        {p.assignedTerapisId ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-950 font-bold text-[11px] border border-teal-200">
                              📌 {p.assignedTerapisNama}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setStudentToAssign(p);
                                setSelectedAssignTerapisId(p.assignedTerapisId || terapisList[0].id);
                              }}
                              className="text-[10px] text-teal-700 hover:text-teal-900 font-bold hover:underline"
                            >
                              Ubah
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[11px] border border-amber-200">
                              ⏳ Belum Di-assign
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setStudentToAssign(p);
                                setSelectedAssignTerapisId(terapisList[0].id);
                              }}
                              className="px-2 py-0.5 rounded bg-teal-800 text-white text-[10px] font-bold hover:bg-teal-700 shadow-2xs"
                            >
                              + Assign
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {p.namaWali}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-extrabold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md tracking-widest text-xs border border-teal-200">
                          {p.pin}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.asalSekolah || '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedPesertaReset(p);
                              setResetPinValue(p.pin);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold transition-colors"
                          >
                            Ubah PIN
                          </button>
                          <button
                            onClick={() => {
                              setStudentToDelete(p);
                              setDeleteReason('Telah lulus & menyelesaikan program terapi di ULD');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-bold transition-colors"
                            title="Hapus akun siswa yang sudah lulus"
                          >
                            🎓 Lulus / Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: BUAT AKUN SISWA TERAPI RUTIN BARU (CUKUP NAMA, NAMA ORTU, PIN) */}
      {showSimpleAddPesertaModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveSimpleStudent} className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-5 shadow-2xl animate-in zoom-in-95 border-2 border-teal-600">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Buat Akun Siswa Terapi Baru
                </h3>
                <p className="text-[11px] text-slate-500">
                  Cukup masukkan nama anak, nama orang tua, dan PIN login.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSimpleAddPesertaModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  1. Nama Lengkap Anak / Siswa *
                </label>
                <input
                  type="text"
                  required
                  value={simpleNamaAnak}
                  onChange={e => setSimpleNamaAnak(e.target.value)}
                  placeholder="Contoh: Muhammad Rayhan Pratama"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  2. Nama Orang Tua / Wali *
                </label>
                <input
                  type="text"
                  required
                  value={simpleNamaOrtu}
                  onChange={e => setSimpleNamaOrtu(e.target.value)}
                  placeholder="Contoh: Ibu Rina Wati / Bapak Hendra"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700 text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">
                    3. PIN Login Siswa (6 Digit) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setSimplePin(Math.floor(100000 + Math.random() * 900000).toString())}
                    className="text-[11px] text-teal-800 font-bold hover:underline"
                  >
                    Acak PIN
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={simplePin}
                  onChange={e => setSimplePin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Contoh: 123456"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-center font-bold text-lg tracking-widest text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-700 bg-slate-50"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  PIN ini akan digunakan oleh orang tua untuk login mengubah PIN dan melihat jadwal resmi.
                </span>
              </div>
            </div>

            <div className="pt-2 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowSimpleAddPesertaModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs shadow transition-all active:scale-95"
              >
                ✓ Simpan Akun Siswa Baru
              </button>
            </div>
          </form>
        </div>
      )}

      {/* KARTU SUKSES BUAT SISWA BARU */}
      {createdStudentCard && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-4 shadow-2xl animate-in zoom-in-95 border-2 border-emerald-500">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <span>🎉</span>
              <span>Akun Siswa Resmi Berhasil Dibuat!</span>
            </div>

            <div className="p-4 rounded-2xl bg-teal-950 text-white space-y-2">
              <div className="text-xs text-teal-300">Nomor RM: {createdStudentCard.nomorRekamMedis}</div>
              <div className="text-lg font-bold text-white">{createdStudentCard.namaLengkap}</div>
              <div className="text-xs text-teal-200">Wali: {createdStudentCard.namaWali}</div>
              <div className="pt-2 border-t border-teal-800 flex justify-between items-center text-xs">
                <span className="text-teal-300">PIN Login Siswa:</span>
                <span className="font-mono font-black text-amber-300 text-base bg-teal-900 px-3 py-0.5 rounded-lg border border-teal-700">
                  {createdStudentCard.pin}
                </span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
              Catat atau bagikan nomor RM dan PIN di atas kepada orang tua murid.
            </div>

            <button
              onClick={() => setCreatedStudentCard(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
            >
              Tutup & Selesai
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: PENJADWALAN ASESMEN BARU OLEH ADMIN */}
      {showAddAsesmenModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleScheduleNewAssessment} className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Jadwalkan Asesmen Baru
                </h3>
                <p className="text-[11px] text-slate-500">
                  Petugas Admin pendaftar: <strong>{activeAdmin.nama}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddAsesmenModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  1. Nama Calon Siswa *
                </label>
                <input
                  type="text"
                  required
                  value={asesmenNamaAnak}
                  onChange={e => setAsesmenNamaAnak(e.target.value)}
                  placeholder="Nama lengkap anak..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  2. Nama Orang Tua / Wali *
                </label>
                <input
                  type="text"
                  required
                  value={asesmenNamaOrtu}
                  onChange={e => setAsesmenNamaOrtu(e.target.value)}
                  placeholder="Nama orang tua..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  3. Nomor WhatsApp Orang Tua (Wajib Aktif) *
                </label>
                <input
                  type="tel"
                  required
                  value={asesmenNoWa}
                  onChange={e => setAsesmenNoWa(e.target.value)}
                  placeholder="081234567890"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tanggal Rencana Datang *
                  </label>
                  <input
                    type="date"
                    required
                    value={asesmenTanggal}
                    onChange={e => setAsesmenTanggal(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Jam Datang *
                  </label>
                  <select
                    value={asesmenJam}
                    onChange={e => setAsesmenJam(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white"
                  >
                    <option value="09:00 WIB">09:00 WIB (Pagi)</option>
                    <option value="10:00 WIB">10:00 WIB</option>
                    <option value="11:00 WIB">11:00 WIB</option>
                    <option value="12:00 WIB">12:00 WIB (Siang)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Catatan Gejala / Indikasi Awal
                </label>
                <textarea
                  rows={2}
                  value={asesmenIndikasi}
                  onChange={e => setAsesmenIndikasi(e.target.value)}
                  placeholder="Contoh: Belum dapat berbicara di usia 3 tahun, interaksi sosial terbatas..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowAddAsesmenModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-800 hover:bg-amber-700 text-white font-bold text-xs"
              >
                ✓ Jadwalkan Asesmen
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: BUKA SLOT BARU DI LOKET */}
      {showBukaSlotLoketModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleBukaSlotLoket} className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-4 shadow-2xl animate-in zoom-in-95 border-2 border-teal-600">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Buka Slot Terapi Baru di Loket
                </h3>
                <p className="text-xs text-slate-500">
                  Membuka sesi langsung untuk pendaftaran loket
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBukaSlotLoketModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Pilih Layanan & Tenaga Ahli *
                </label>
                <select
                  required
                  value={newSlotTerapisId}
                  onChange={e => setNewSlotTerapisId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                >
                  {terapisList.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.spesialisasiLabel} ({t.nama})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tanggal Layanan *
                </label>
                <input
                  type="date"
                  required
                  value={newSlotTanggal}
                  onChange={e => setNewSlotTanggal(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Jam Mulai *
                  </label>
                  <input
                    type="time"
                    required
                    value={newSlotJamMulai}
                    onChange={e => setNewSlotJamMulai(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Jam Selesai *
                  </label>
                  <input
                    type="time"
                    required
                    value={newSlotJamSelesai}
                    onChange={e => setNewSlotJamSelesai(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Ruangan
                </label>
                <input
                  type="text"
                  value={newSlotRuang}
                  onChange={e => setNewSlotRuang(e.target.value)}
                  placeholder="Sesuai ruang praktek terapis"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Catatan Sesi
                </label>
                <input
                  type="text"
                  value={newSlotCatatan}
                  onChange={e => setNewSlotCatatan(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowBukaSlotLoketModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs shadow-sm"
              >
                ✓ Buka Slot Sekarang
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 4: TIKET LOKET RESMI */}
      {selectedLoketTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Tiket Terapi Loket ULD
                </h3>
                <p className="text-[11px] text-slate-500">
                  Didaftarkan resmi oleh loket administrasi
                </p>
              </div>
              <button
                onClick={() => setSelectedLoketTicket(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-teal-950 text-white space-y-3">
              <div className="flex justify-between items-center text-xs text-teal-300 font-mono">
                <span>TIKET RESMI LOKET ULD</span>
                <span className="bg-teal-900 px-2 py-0.5 rounded">{selectedLoketTicket.kodeBooking}</span>
              </div>
              <div>
                <div className="text-xs text-teal-200">Nama Siswa:</div>
                <div className="text-base font-bold text-white">
                  {pesertaList.find(p => p.id === selectedLoketTicket.pesertaId)?.namaLengkap || selectedLoketTicket.pesertaId}
                </div>
                <div className="text-xs text-teal-300 mt-0.5">
                  Layanan: <strong className="text-white">{getSpesialisasiLabel(selectedLoketTicket.spesialisasi)}</strong>
                </div>
              </div>
              <div className="pt-2 border-t border-teal-800 text-xs flex justify-between items-end">
                <div>
                  <div className="text-teal-300 text-[10px]">JADWAL & RUANG</div>
                  <div className="font-bold text-white">{selectedLoketTicket.tanggal}</div>
                  <div className="text-teal-200">{selectedLoketTicket.jamMulai} - {selectedLoketTicket.jamSelesai} WIB · {selectedLoketTicket.ruang}</div>
                </div>
                <div className="text-right">
                  <div className="text-teal-300 text-[10px]">DIDAFTARKAN OLEH</div>
                  <div className="font-bold text-teal-200">{selectedLoketTicket.didaftarkanOlehAdmin || 'Loket ULD'}</div>
                </div>
              </div>
            </div>

            {selectedLoketTicket.keluhanHariIni && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
                <strong>Catatan Loket:</strong> {selectedLoketTicket.keluhanHariIni}
              </div>
            )}

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                🖨️ Cetak Tiket Loket
              </button>
              <button
                type="button"
                onClick={() => setSelectedLoketTicket(null)}
                className="w-full py-2.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white text-xs font-bold shadow-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: RESET PIN PESERTA */}
      {selectedPesertaReset && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-base">
              Reset PIN Peserta
            </h3>
            <p className="text-xs text-slate-500">
              Ubah PIN login untuk <strong>{selectedPesertaReset.namaLengkap}</strong>
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                PIN Baru (6 Digit)
              </label>
              <input
                type="text"
                maxLength={6}
                value={resetPinValue}
                onChange={e => setResetPinValue(e.target.value)}
                className="w-full px-3 py-2 text-center font-mono font-bold text-base rounded-xl border border-slate-300"
              />
            </div>

            <div className="pt-2 flex gap-2 justify-end">
              <button
                onClick={() => setSelectedPesertaReset(null)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-600"
              >
                Batal
              </button>
              <button
                onClick={handleResetPin}
                className="px-4 py-2 text-xs rounded-xl bg-teal-800 text-white font-bold"
              >
                Simpan PIN Baru
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: UBAH PIN ADMIN */}
      {showAdminPinModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveAdminPin} className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <h3 className="font-extrabold text-slate-900 text-base">
              Ubah PIN Admin: {activeAdmin.nama}
            </h3>
            <p className="text-xs text-slate-500">
              PIN saat ini: <strong className="font-mono text-teal-800">{activeAdmin.pin}</strong>
            </p>

            {adminPinMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                {adminPinMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Masukkan PIN Baru (6 Digit Angka)
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                required
                value={newAdminPin}
                onChange={e => setNewAdminPin(e.target.value)}
                placeholder="Contoh: 990011"
                className="w-full px-3.5 py-3 rounded-xl border border-slate-300 font-mono text-center font-bold text-lg"
              />
            </div>

            <div className="pt-2 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowAdminPinModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs"
              >
                Simpan PIN
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 7: KELULUSAN & HAPUS SISWA LAMA */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-xl shrink-0">
                🎓
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Kelulusan / Hapus Akun Siswa
                </h3>
                <p className="text-xs text-slate-500">
                  Konfirmasi kelulusan siswa terapi rutin ULD
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">No. Rekam Medis:</span>
                <span className="font-mono font-bold text-slate-800">{studentToDelete.nomorRekamMedis}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Siswa:</span>
                <span className="font-bold text-slate-900 text-sm">{studentToDelete.namaLengkap}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Orang Tua / Wali:</span>
                <span className="font-semibold text-slate-700">{studentToDelete.namaWali}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">PIN Login:</span>
                <span className="font-mono font-bold text-teal-800">{studentToDelete.pin}</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed">
              <strong>Catatan Sistem:</strong> Menghapus siswa ini akan menandai status kelulusan, menghapus akun dari daftar aktif, dan secara otomatis membebaskan/membatalkan kuota jadwal terapi aktif yang telah dibooking agar dapat digunakan oleh siswa lain.
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Keterangan / Alasan Kelulusan
              </label>
              <input
                type="text"
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
                placeholder="Contoh: Telah lulus & menyelesaikan program terapi di ULD"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-teal-700"
              />
            </div>

            <div className="pt-2 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 text-xs rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStudent}
                className="px-4 py-2 text-xs rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-1.5 shadow-sm"
              >
                <span>🎓 Konfirmasi Siswa Lulus & Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 8: ASSIGN / TETAPKAN TERAPIS PEMBINA TETAP SISWA */}
      {studentToAssign && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmAssignTerapis}
            className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-4 shadow-2xl animate-in zoom-in-95 border-2 border-teal-600"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center text-lg shrink-0">
                  📌
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Tetapkan Terapis Pembina Tetap
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Aturan penugasan permanen siswa ke tenaga ahli ULD
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStudentToAssign(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Siswa:</span>
                <span className="font-bold text-slate-900 text-sm">{studentToAssign.namaLengkap}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">No. Rekam Medis:</span>
                <span className="font-mono font-bold text-slate-800">{studentToAssign.nomorRekamMedis}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Wali:</span>
                <span className="font-medium text-slate-700">{studentToAssign.namaWali}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500">Status Saat Ini:</span>
                {studentToAssign.assignedTerapisId ? (
                  <span className="font-bold text-teal-800">
                    📌 {studentToAssign.assignedTerapisNama}
                  </span>
                ) : (
                  <span className="font-bold text-amber-700">
                    ⏳ Belum Di-assign ke Terapis Manapun
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-slate-800">
                Pilih Tenaga Ahli Pembina Tetap:
              </label>
              <select
                value={selectedAssignTerapisId}
                onChange={e => setSelectedAssignTerapisId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700"
              >
                {terapisList.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nama} — {t.spesialisasiLabel}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-950 leading-relaxed">
              <strong>Aturan Sistem:</strong> Setelah ditetapkan, siswa ini <strong>hanya dapat mendaftar sesi terapi ke terapis ini saja</strong>. Di portal pendaftaran mandiri dan form loket admin, hanya nama terapis terpilih yang akan muncul untuk siswa ini.
            </div>

            <div className="pt-2 flex items-center justify-between gap-2">
              {studentToAssign.assignedTerapisId ? (
                <button
                  type="button"
                  onClick={() => handleConfirmUnassignTerapis(studentToAssign.id)}
                  className="px-3 py-2 text-xs rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold border border-red-200 transition-colors"
                >
                  Lepas Penugasan
                </button>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStudentToAssign(null)}
                  className="px-4 py-2 text-xs rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold shadow-sm transition-all active:scale-95"
                >
                  ✓ Simpan Penugasan
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
