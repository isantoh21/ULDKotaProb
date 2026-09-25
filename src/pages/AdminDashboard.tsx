import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { db, getWIBDate } from '../services/supabase';
import { Peserta, PendaftaranAsesmenGuest, Terapis, SlotHarian, BookingTerapi, LogAktivitas } from '../types';
import { ULD_LOGO_BASE64 } from '../constants/logoData';
import { downloadPdfPinSiswaTerbaru, downloadPdfPinPekerjaTerbaru } from '../services/pdfGenerator';
import { compressImageFile } from '../utils/imageCompressor';
import { PhotoCropModal } from '../components/PhotoCropModal';

interface Props {
  onLogout?: () => void;
  initialTab?: 'pendaftaran_loket' | 'peserta_pin';
  activeAdminId?: string;
}

export const AdminDashboard: React.FC<Props> = ({ onLogout, initialTab, activeAdminId: initialAdminId }) => {
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

  // Petugas Admin Terautentikasi (Terkunci sesuai akun login PIN)
  const activeAdmin = adminList.find(a => a.id === initialAdminId) || adminList[0];
  const activeAdminId = activeAdmin.id;

  // Foto Profil Admin & Modal Penyesuaian Posisi
  const [currentAdminFoto, setCurrentAdminFoto] = useState<string | undefined>(() => {
    return adminList.find(a => a.id === activeAdmin.id)?.fotoUrl || activeAdmin.fotoUrl;
  });
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState<boolean>(false);

  const handleUploadAdminFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('File yang dipilih harus berupa file gambar (JPG, PNG, atau WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setCropImageSrc(result);
        setShowCropModal(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveCroppedAdminFoto = (croppedBase64: string) => {
    db.updateFotoAdmin(activeAdmin.id, croppedBase64);
    setCurrentAdminFoto(croppedBase64);
    confetti({ particleCount: 60, spread: 60 });
    alert(`Alhamdulillah! Foto profil Petugas Admin ${activeAdmin.nama} berhasil disesuaikan posisinya dan diperbarui. Foto Anda tampil di Beranda.`);
  };

  // Admin PIN change
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [newAdminPin, setNewAdminPin] = useState('');
  const [adminPinMsg, setAdminPinMsg] = useState('');

  // 1. FITUR UTAMA LOKET: PENDAFTARAN TERAPI LANGSUNG DI LOKET ULD (SEMUA 4 LAYANAN)
  const [selectedTerapisIdForBooking, setSelectedTerapisIdForBooking] = useState<string>(terapisList[0]?.id || '');
  const [selectedPesertaForBooking, setSelectedPesertaForBooking] = useState<string>('');
  const [selectedSlotForBooking, setSelectedSlotForBooking] = useState<string>('');
  const [bookingMsg, setBookingMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [selectedLoketTicket, setSelectedLoketTicket] = useState<BookingTerapi | null>(null);
  const [filterLayananTable, setFilterLayananTable] = useState<string>('all');

  // 2. FITUR: PENJADWALAN ASESMEN BARU OLEH ADMIN
  const [showAddAsesmenModal, setShowAddAsesmenModal] = useState(false);
  const [asesmenNamaAnak, setAsesmenNamaAnak] = useState('');
  const [asesmenNamaOrtu, setAsesmenNamaOrtu] = useState('');
  const [asesmenNoWa, setAsesmenNoWa] = useState('');
  const [asesmenTanggal, setAsesmenTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [asesmenJam, setAsesmenJam] = useState('09:00 WIB');
  const [asesmenIndikasi, setAsesmenIndikasi] = useState('');
  const [asesmenSuccessMsg, setAsesmenSuccessMsg] = useState('');

  // 3. FITUR: BUAT AKUN SISWA TERAPI BARU (NAMA, ASAL SEKOLAH, NAMA ORTU, PIN)
  const [showSimpleAddPesertaModal, setShowSimpleAddPesertaModal] = useState(false);
  const [simpleNamaAnak, setSimpleNamaAnak] = useState('');
  const [simpleAsalSekolah, setSimpleAsalSekolah] = useState('');
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
  
  // Waktu WIB & Batas 2 Pekan ke Depan
  const todayWIB = getWIBDate();
  const twoWeeksAheadDate = (() => {
    const d = new Date(todayWIB.dateStr + 'T00:00:00');
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  })();

  // Slot tersedia untuk loket admin (Semua jenis pendaftaran maksimal H-1 sebelum 23.59 WIB):
  // - Hari ini (Hari H) dan masa lalu TIDAK MUNCUL karena batas minimal pendaftaran adalah H-1 sebelum 23.59 WIB
  // - Tampilkan 2 minggu ke depan saja (rentang besok s/d 14 hari ke depan)
  const availableSlotsForSelectedTerapis = slotsList.filter(s => {
    if (s.terapisId !== (currentSelectedTerapis?.id || selectedTerapisIdForBooking)) return false;
    if (s.statusSlot === 'dibatalkan') return false;

    // Filter tanggal hari ini dan masa lalu (wajib minimal H-1 sebelum 23.59 WIB)
    if (s.tanggal <= todayWIB.dateStr) return false;

    // Batas maksimal 2 pekan ke depan
    if (s.tanggal > twoWeeksAheadDate) return false;

    return true;
  }).sort((a, b) => {
    if (a.tanggal !== b.tanggal) return a.tanggal.localeCompare(b.tanggal);
    return a.jamMulai.localeCompare(b.jamMulai);
  });

  const handleSelectPesertaForBooking = (pId: string) => {
    setSelectedPesertaForBooking(pId);
    setSelectedSlotForBooking('');
    const p = pesertaList.find(x => x.id === pId);
    if (p?.assignedTerapisId) {
      setSelectedTerapisIdForBooking(p.assignedTerapisId);
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
      defaultCatatan,
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
    } else {
      setBookingMsg({
        type: 'error',
        text: res.error || 'Gagal mendaftarkan siswa di loket.'
      });
    }
  };



  // --- BATALKAN BOOKING ---
  const handleBatalkanBooking = (bookingId: string) => {
    if (window.confirm('Batalkan jadwal sesi terapi ini? Slot akan dikembalikan agar dapat didaftarkan kembali.')) {
      db.updateBookingStatus(bookingId, 'batal', `Dibatalkan oleh Petugas Admin (${activeAdmin.nama})`);
      setBookingMsg({ type: 'success', text: 'Jadwal sesi terapi berhasil dibatalkan.' });
    }
  };

  // --- SUBMIT BUAT AKUN SISWA TERAPI BARU (NAMA, ASAL SEKOLAH, NAMA ORTU, PIN) ---
  const handleOpenSimpleAddStudent = () => {
    setSimpleNamaAnak('');
    setSimpleAsalSekolah('');
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
      simplePin.trim(),
      simpleAsalSekolah.trim()
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
      <div className="bg-gradient-to-r from-sky-700 via-sky-600 to-sky-500 text-white rounded-3xl p-6 sm:p-8 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={ULD_LOGO_BASE64}
              alt="Logo ULD Kota Probolinggo"
              className="w-16 h-16 rounded-2xl object-contain bg-white p-1.5 shadow-md shrink-0 border border-white/40"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/logo-uld.jpg';
              }}
            />
            {/* Foto Profil Petugas Admin */}
            <div className="relative group shrink-0">
              {currentAdminFoto ? (
                <img
                  src={currentAdminFoto}
                  alt={activeAdmin.nama}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md bg-white/20"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-sky-900 border-2 border-sky-400 text-white font-black text-2xl flex items-center justify-center shadow-md">
                  {activeAdmin.nama.charAt(0)}
                </div>
              )}
              <label 
                className="absolute -bottom-1.5 -right-1.5 bg-yellow-400 hover:bg-yellow-300 text-sky-950 p-1.5 rounded-xl cursor-pointer shadow-md transition-transform active:scale-90 flex items-center justify-center border border-white"
                title="Unggah / Ganti Foto Profil Admin"
              >
                <span className="text-[11px]">📷</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadAdminFoto}
                  className="hidden"
                />
              </label>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-sky-100 font-semibold tracking-wide">
                <span>Pemerintah Kota Probolinggo</span>
                <span aria-hidden="true">·</span>
                <span>Loket Administrasi ULD</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                Petugas: {activeAdmin.nama}
              </h1>
              <p className="text-xs text-sky-100 flex items-center gap-2 flex-wrap">
                <span>No. WhatsApp: <strong className="font-mono text-yellow-300 font-bold">+{activeAdmin.nomorTelepon}</strong></span>
                <span>·</span>
                <span className="font-mono text-sky-200">PIN: {activeAdmin.pin}</span>
                <span>·</span>
                <label className="text-[11px] text-yellow-300 hover:underline cursor-pointer font-semibold inline-flex items-center gap-1">
                  <span>📸 Ganti Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadAdminFoto}
                    className="hidden"
                  />
                </label>
              </p>
            </div>
          </div>

          <div className="shrink-0 flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-sky-800/70 border border-sky-600/50 px-3 py-2 rounded-xl text-xs gap-2 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-sky-200">Petugas Aktif:</span>
              <span className="text-yellow-300 font-extrabold">{activeAdmin.nama}</span>
            </div>

            <button
              onClick={() => setShowAdminPinModal(true)}
              className="px-3 py-2 rounded-xl bg-sky-800/60 hover:bg-sky-800 text-yellow-300 border border-sky-600 text-xs font-bold transition-colors"
              title="Ganti PIN Petugas"
            >
              🔑 Ubah PIN
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
                title="Keluar dan Kembali ke Beranda / Ganti Akun"
              >
                <span>🚪 Log Out</span>
                <span className="hidden sm:inline">(Ganti Akun)</span>
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
          className={`px-4 py-2.5 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'pendaftaran_loket' ? 'bg-sky-600 text-white shadow-sm font-bold' : 'text-slate-700 hover:bg-slate-300/60'}`}
        >
          <span>🏥</span>
          <span>Pendaftaran Terapi Loket ULD</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${activeTab === 'pendaftaran_loket' ? 'bg-sky-500 text-white' : 'bg-slate-300 text-slate-900'}`}>
            {bookingsList.filter(b => b.status === 'terjadwal').length}
          </span>
        </button>

        {/* TAB 2: MANAJEMEN PESERTA & PIN */}
        <button
          onClick={() => setActiveTab('peserta_pin')}
          className={`px-4 py-2.5 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'peserta_pin' ? 'bg-sky-600 text-white shadow-sm font-bold' : 'text-slate-700 hover:bg-slate-300/60'}`}
        >
          <span>👥</span>
          <span>Manajemen Siswa & PIN</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${activeTab === 'peserta_pin' ? 'bg-sky-500 text-white' : 'bg-slate-300 text-slate-900'}`}>
            {pesertaList.length}
          </span>
        </button>
      </div>


      {/* TAB 1: PENDAFTARAN TERAPI LANGSUNG DI LOKET ULD (SEMUA LAYANAN) */}
      {activeTab === 'pendaftaran_loket' && (
        <div className="space-y-6">
          {/* Banner Loket */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-sky-900 via-sky-800 to-slate-900 text-white shadow space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏥</span>
                <h2 className="text-lg font-extrabold text-white">
                  Loket Pendaftaran Terapi Langsung ULD Kota Probolinggo
                </h2>
              </div>
              <span className="px-3 py-1 rounded-full bg-sky-700 border border-sky-600 text-sky-100 text-xs font-bold">
                Petugas Loket: {activeAdmin.nama} ({activeAdmin.nomorTelepon})
              </span>
            </div>
            <p className="text-xs sm:text-sm text-sky-50 leading-relaxed">
              Karena siswa <strong>tidak dapat mendaftar mandiri secara online</strong>, petugas admin melayani pendaftaran sesi terapi secara langsung bagi orang tua/siswa yang hadir di loket fisik ULD. Admin dapat mendaftarkan siswa ke <strong>seluruh 4 layanan spesialisasi</strong>.
            </p>
            <div className="text-[11px] text-amber-300 font-medium flex items-center gap-2 pt-1 border-t border-sky-700">
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

              <div className="text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60 flex items-center gap-1.5">
                <span>ℹ️ Slot sesi dibuka & dikelola oleh Terapis / Psikolog</span>
              </div>
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
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
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
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                  >
                    {availableTerapisForLoket.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.spesialisasiLabel} - {t.nama}
                      </option>
                    ))}
                  </select>

                  {/* Keterangan Otomatis Sesuai Aturan User 2 */}
                  {currentSelectedPesertaForBooking?.assignedTerapisId ? (
                    <span className="text-[11px] text-sky-700 font-bold mt-1 block bg-sky-50 px-2 py-1 rounded-lg border border-sky-100">
                      🔒 Terkunci: Siswa binaan tetap {currentSelectedPesertaForBooking.assignedTerapisNama}. Hanya terapis ini yang muncul.
                    </span>
                  ) : currentSelectedPesertaForBooking ? (
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                      <span>⚠️</span>
                      <span>Siswa belum di-assign secara tetap. Penetapan siswa binaan hanya dapat dilakukan oleh Terapis atau Psikolog yang bersangkutan.</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-sky-600 font-semibold mt-1 block">
                      Ruang: {currentSelectedTerapis?.ruangPraktek}
                    </span>
                  )}
                </div>

                {/* 3. Pilih Slot Sesi Terapi (Rentang Hari H s/d 2 Pekan ke Depan) */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    3. Pilih Slot Sesi Tersedia (2 Pekan ke Depan) *
                  </label>
                  <select
                    required
                    value={selectedSlotForBooking}
                    onChange={e => setSelectedSlotForBooking(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                  >
                    <option value="">-- Pilih Slot Jam Tersedia --</option>
                    {availableSlotsForSelectedTerapis.length === 0 ? (
                      <option disabled value="">Tidak ada slot tersedia dalam 2 pekan ke depan</option>
                    ) : (
                      availableSlotsForSelectedTerapis.map(s => {
                        const isFull = s.kuotaTerisi >= s.kuotaMaksimal;
                        return (
                          <option key={s.id} value={s.id} disabled={isFull}>
                            {s.tanggal} ({s.jamMulai} - {s.jamSelesai} WIB) {isFull ? '[PENUH]' : `[Tersedia ${s.kuotaMaksimal - s.kuotaTerisi} kuota]`}
                          </option>
                        );
                      })
                    )}
                  </select>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Menampilkan jadwal mulai besok (maksimal pendaftaran H-1 sebelum 23.59 WIB) hingga 2 pekan ke depan ({twoWeeksAheadDate}).
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-3 rounded-2xl bg-sky-700 hover:bg-sky-600 text-white font-bold text-xs sm:text-sm shadow-md transition-all transform active:scale-95 flex items-center gap-2"
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
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${filterLayananTable === 'all' ? 'bg-sky-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  Semua Layanan
                </button>
                {terapisList.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setFilterLayananTable(t.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${filterLayananTable === t.id ? 'bg-sky-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
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
                          <td className="px-4 py-3 font-mono font-bold text-sky-800">
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
                          <td className="px-4 py-3 text-[11px] font-medium text-sky-700">
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
                                className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-50 text-sky-700 text-[11px] font-bold transition-colors"
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
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-sky-600"
              />
              <button
                type="button"
                onClick={() => downloadPdfPinSiswaTerbaru(pesertaList)}
                className="px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-2xs"
                title="Download Dokumen PDF Daftar PIN Semua Siswa Terapi Real-Time Terbaru"
              >
                <span>📄 Unduh PDF PIN Siswa</span>
              </button>
              <button
                type="button"
                onClick={() => downloadPdfPinPekerjaTerbaru(terapisList, adminList)}
                className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-2xs"
                title="Download Dokumen PDF Daftar PIN Pekerja ULD (Terapis & Admin) Terbaru"
              >
                <span>📄 Unduh PDF PIN Pekerja</span>
              </button>
              <button
                onClick={handleOpenSimpleAddStudent}
                className="px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-600 text-white font-bold text-xs transition-colors shadow-sm whitespace-nowrap flex items-center gap-1.5"
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
                          <span className="font-bold text-sky-800 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200 text-[11px] inline-flex items-center gap-1">
                            <span>📌</span>
                            <span>{p.assignedTerapisNama}</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 font-medium text-[11px] border border-slate-200 inline-flex items-center gap-1">
                            <span>⏳</span>
                            <span>Belum di-assign (Oleh Terapis/Psikolog)</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {p.namaWali}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-extrabold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-md tracking-widest text-xs border border-sky-100">
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
          <form onSubmit={handleSaveSimpleStudent} className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-5 shadow-2xl animate-in zoom-in-95 border-2 border-sky-500">
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  2. Asal Sekolah / Jenjang Pendidikan *
                </label>
                <input
                  type="text"
                  required
                  value={simpleAsalSekolah}
                  onChange={e => setSimpleAsalSekolah(e.target.value)}
                  placeholder="Contoh: SDN Sukabumi 2 / TK Pertiwi / Belum Sekolah"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  3. Nama Orang Tua / Wali *
                </label>
                <input
                  type="text"
                  required
                  value={simpleNamaOrtu}
                  onChange={e => setSimpleNamaOrtu(e.target.value)}
                  placeholder="Contoh: Ibu Rina Wati / Bapak Hendra"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600 text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">
                    4. PIN Login Siswa (6 Digit) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setSimplePin(Math.floor(100000 + Math.random() * 900000).toString())}
                    className="text-[11px] text-sky-700 font-bold hover:underline"
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-center font-bold text-lg tracking-widest text-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-600 bg-slate-50"
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
                className="px-5 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white font-bold text-xs shadow transition-all active:scale-95"
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

            <div className="p-4 rounded-2xl bg-sky-900 text-white space-y-2">
              <div className="text-xs text-sky-200">Nomor RM: {createdStudentCard.nomorRekamMedis}</div>
              <div className="text-lg font-bold text-white">{createdStudentCard.namaLengkap}</div>
              <div className="text-xs text-sky-200">Asal Sekolah: <strong className="text-white">{createdStudentCard.asalSekolah || '-'}</strong></div>
              <div className="text-xs text-sky-100">Wali: {createdStudentCard.namaWali}</div>
              <div className="pt-2 border-t border-sky-700 flex justify-between items-center text-xs">
                <span className="text-sky-200">PIN Login Siswa:</span>
                <span className="font-mono font-black text-amber-300 text-base bg-sky-800 px-3 py-0.5 rounded-lg border border-sky-600">
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

            <div className="p-4 rounded-2xl bg-sky-900 text-white space-y-3">
              <div className="flex justify-between items-center text-xs text-sky-200 font-mono">
                <span>TIKET RESMI LOKET ULD</span>
                <span className="bg-sky-800 px-2 py-0.5 rounded">{selectedLoketTicket.kodeBooking}</span>
              </div>
              <div>
                <div className="text-xs text-sky-100">Nama Siswa:</div>
                <div className="text-base font-bold text-white">
                  {pesertaList.find(p => p.id === selectedLoketTicket.pesertaId)?.namaLengkap || selectedLoketTicket.pesertaId}
                </div>
                <div className="text-xs text-sky-200 mt-0.5">
                  Layanan: <strong className="text-white">{getSpesialisasiLabel(selectedLoketTicket.spesialisasi)}</strong>
                </div>
              </div>
              <div className="pt-2 border-t border-sky-700 text-xs flex justify-between items-end">
                <div>
                  <div className="text-sky-200 text-[10px]">JADWAL & RUANG</div>
                  <div className="font-bold text-white">{selectedLoketTicket.tanggal}</div>
                  <div className="text-sky-100">{selectedLoketTicket.jamMulai} - {selectedLoketTicket.jamSelesai} WIB · {selectedLoketTicket.ruang}</div>
                </div>
                <div className="text-right">
                  <div className="text-sky-200 text-[10px]">DIDAFTARKAN OLEH</div>
                  <div className="font-bold text-sky-100">{selectedLoketTicket.didaftarkanOlehAdmin || 'Loket ULD'}</div>
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
                className="w-full py-2.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white text-xs font-bold shadow-sm"
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
                className="px-4 py-2 text-xs rounded-xl bg-sky-700 text-white font-bold"
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
              PIN saat ini: <strong className="font-mono text-sky-700">{activeAdmin.pin}</strong>
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
                className="px-5 py-2 rounded-xl bg-sky-700 hover:bg-sky-600 text-white font-bold text-xs"
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
                <span className="font-mono font-bold text-sky-700">{studentToDelete.pin}</span>
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
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-sky-600"
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



      {/* MODAL SESUAIKAN POSISI FOTO PROFIL ADMIN */}
      <PhotoCropModal
        isOpen={showCropModal}
        imageSrc={cropImageSrc}
        workerName={`Petugas Admin ${activeAdmin.nama}`}
        onClose={() => {
          setShowCropModal(false);
          setCropImageSrc(null);
        }}
        onSaveCrop={handleSaveCroppedAdminFoto}
      />
    </div>
  );
};
