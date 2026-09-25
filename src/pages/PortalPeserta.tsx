import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Peserta, BookingTerapi, SlotHarian, Terapis } from '../types';
import { db, getWIBDate, getWeekBounds, checkBatasPendaftaranHMinus1 } from '../services/supabase';

interface Props {
  peserta: Peserta;
  onLogout: () => void;
}

const DEFAULT_SESSIONS = [
  { start: '09:00', end: '10:00', label: 'Sesi 1 (09.00 - 10.00 WIB)' },
  { start: '10:00', end: '11:00', label: 'Sesi 2 (10.00 - 11.00 WIB)' },
  { start: '11:00', end: '12:00', label: 'Sesi 3 (11.00 - 12.00 WIB)' },
  { start: '12:00', end: '13:00', label: 'Sesi 4 (12.00 - 13.00 WIB)' }
];

export const PortalPeserta: React.FC<Props> = ({ peserta, onLogout }) => {
  const [currentPeserta, setCurrentPeserta] = useState<Peserta>(() => {
    return db.getPesertaList().find(p => p.id === peserta.id) || peserta;
  });

  const [activeTab, setActiveTab] = useState<'jadwal_daftar' | 'jadwal_aktif' | 'ganti_pin'>('jadwal_daftar');

  // Assigned therapist details
  const assignedTerapis: Terapis | undefined = currentPeserta.assignedTerapisId 
    ? db.getTerapisById(currentPeserta.assignedTerapisId)
    : undefined;

  // Real-time slots & bookings
  const [slotsList, setSlotsList] = useState<SlotHarian[]>(() => db.getSlotsList());
  const [allBookings, setAllBookings] = useState<BookingTerapi[]>(() => 
    db.getBookingsList().filter(b => b.pesertaId === currentPeserta.id)
  );

  // Form Ubah PIN Pribadi Siswa
  const [currentPinDisplay, setCurrentPinDisplay] = useState(currentPeserta.pin);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinMsg, setPinMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);

  // Booking Modal State
  const [slotToBook, setSlotToBook] = useState<{
    slotId: string;
    tanggal: string;
    jamMulai: string;
    jamSelesai: string;
    ruang: string;
  } | null>(null);
  const [keluhanInput, setKeluhanInput] = useState('');
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  // Ticket modal
  const [selectedTicket, setSelectedTicket] = useState<BookingTerapi | null>(null);

  // Reschedule Modal State (Aturan 2: Peserta terapi rutin boleh mengganti sendiri jadwalnya maksimal 1 kali)
  const [bookingToReschedule, setBookingToReschedule] = useState<BookingTerapi | null>(null);
  const [rescheduleDayDate, setRescheduleDayDate] = useState<string>('');
  const [rescheduleSlotId, setRescheduleSlotId] = useState<string>('');
  const [rescheduleAlasan, setRescheduleAlasan] = useState<string>('Salah memilih hari/waktu');
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState<boolean>(false);

  // Rentang 2 Pekan ke Depan (Senin - Jumat, sama seperti Loket Admin)
  const todayWIB = getWIBDate();
  const twoWeeksAheadDate = (() => {
    const d = new Date(todayWIB.dateStr + 'T00:00:00');
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  })();

  const currentWeekBounds = getWeekBounds(todayWIB.dateStr);
  const currentWeekFriday = (() => {
    const d = new Date(currentWeekBounds.monday + 'T00:00:00');
    d.setDate(d.getDate() + 4);
    return d.toISOString().split('T')[0];
  })();

  // Jika hari ini akhir pekan (Sabtu/Minggu), pekan 1 otomatis adalah pekan depan
  const isWeekendNow = todayWIB.dateStr > currentWeekFriday;
  const week1Monday = isWeekendNow
    ? (() => {
        const d = new Date(currentWeekBounds.monday + 'T00:00:00');
        d.setDate(d.getDate() + 7);
        return d.toISOString().split('T')[0];
      })()
    : currentWeekBounds.monday;

  const week2Monday = (() => {
    const d = new Date(week1Monday + 'T00:00:00');
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  })();

  const week1 = getWeekBounds(week1Monday);
  const week2 = getWeekBounds(week2Monday);

  const getWeekDaysForMonday = (mondayStr: string) => {
    const mondayD = new Date(mondayStr + 'T00:00:00');
    const days = [];
    const dayNames = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
    for (let i = 0; i < 5; i++) {
      const d = new Date(mondayD);
      d.setDate(mondayD.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayFormatted = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      days.push({
        dayName: dayNames[i],
        dateStr,
        dayFormatted,
        isToday: dateStr === todayWIB.dateStr
      });
    }
    return days;
  };

  const week1Days = getWeekDaysForMonday(week1Monday);
  const week2Days = getWeekDaysForMonday(week2Monday);

  const [selectedWeekTab, setSelectedWeekTab] = useState<'week1' | 'week2'>('week1');
  const [rescheduleWeekTab, setRescheduleWeekTab] = useState<'week1' | 'week2'>('week1');

  const activeWeekDays = selectedWeekTab === 'week1' ? week1Days : week2Days;
  const activeWeek = selectedWeekTab === 'week1' ? week1 : week2;

  const [selectedDayDate, setSelectedDayDate] = useState<string>(() => {
    const found = week1Days.find(w => w.dateStr === todayWIB.dateStr);
    return found ? found.dateStr : week1Days[0].dateStr;
  });

  const handleSelectWeek = (w: 'week1' | 'week2') => {
    setSelectedWeekTab(w);
    if (w === 'week1') {
      const found = week1Days.find(d => d.dateStr === todayWIB.dateStr);
      setSelectedDayDate(found ? found.dateStr : week1Days[0].dateStr);
    } else {
      setSelectedDayDate(week2Days[0].dateStr);
    }
  };

  useEffect(() => {
    const handleUpdate = () => {
      const updated = db.getPesertaList().find(p => p.id === currentPeserta.id);
      if (updated) {
        setCurrentPeserta(updated);
        setCurrentPinDisplay(updated.pin);
      }
      setSlotsList(db.getSlotsList());
      setAllBookings(db.getBookingsList().filter(b => b.pesertaId === currentPeserta.id));
    };
    window.addEventListener('uld_data_updated', handleUpdate);
    return () => window.removeEventListener('uld_data_updated', handleUpdate);
  }, [currentPeserta.id]);

  const activeBookings = allBookings.filter(b => ['terjadwal', 'menunggu_konfirmasi'].includes(b.status));
  const pastBookings = allBookings.filter(b => ['hadir', 'selesai', 'tidak_hadir', 'batal'].includes(b.status));

  // Cek jatah pendaftaran per pekan kalender (1x per pekan)
  const bookingInWeek1 = allBookings.find(b => {
    if (b.status === 'batal') return false;
    const bWeek = getWeekBounds(b.tanggal);
    return bWeek.monday === week1.monday;
  });

  const bookingInWeek2 = allBookings.find(b => {
    if (b.status === 'batal') return false;
    const bWeek = getWeekBounds(b.tanggal);
    return bWeek.monday === week2.monday;
  });

  const bookingInActiveWeek = selectedWeekTab === 'week1' ? bookingInWeek1 : bookingInWeek2;

  // Cek kuota pada pekan dari hari yang sedang dipilih
  const selectedDayWeek = getWeekBounds(selectedDayDate);
  const existingBookingInSelectedDayWeek = allBookings.find(b => {
    if (b.status === 'batal') return false;
    const bWeek = getWeekBounds(b.tanggal);
    return bWeek.monday === selectedDayWeek.monday;
  });

  // Handle Submit Booking
  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotToBook) return;
    setBookingError(null);
    setIsSubmittingBooking(true);

    const res = db.buatBookingTerapi(currentPeserta.id, slotToBook.slotId, keluhanInput.trim());
    setIsSubmittingBooking(false);

    if (res.success && res.booking) {
      confetti({ particleCount: 70, spread: 70 });
      setSlotToBook(null);
      setKeluhanInput('');
      setAllBookings(db.getBookingsList().filter(b => b.pesertaId === currentPeserta.id));
      setSlotsList(db.getSlotsList());
      setSelectedTicket(res.booking);
      setActiveTab('jadwal_aktif');
    } else {
      setBookingError(res.error || 'Gagal mendaftar sesi terapi.');
    }
  };

  // Handle Cancel Booking
  const handleCancelBooking = (bookingId: string) => {
    const b = allBookings.find(x => x.id === bookingId);
    if (!b) return;

    const check = checkBatasPendaftaranHMinus1(b.tanggal);
    if (!check.bisaDaftar) {
      alert(`Pembatalan ditolak. Sesuai ketentuan, pembatalan jadwal paling lambat dilakukan H-1 hari di maksimal jam 24.00 WIB.`);
      return;
    }

    if (window.confirm(`Yakin ingin membatalkan jadwal terapi sesi ${b.tanggal} (${b.jamMulai} - ${b.jamSelesai} WIB)? Kuota slot akan dikembalikan.`)) {
      const success = db.batalkanBooking(bookingId, 'Dibatalkan mandiri oleh orang tua/siswa');
      if (success) {
        setAllBookings(db.getBookingsList().filter(x => x.pesertaId === currentPeserta.id));
        setSlotsList(db.getSlotsList());
        setSelectedTicket(null);
        alert('Jadwal terapi berhasil dibatalkan.');
      }
    }
  };

  // Handle Confirm Reschedule Mandiri (Maksimal 1 Kali)
  const handleConfirmReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingToReschedule || !rescheduleSlotId) {
      setRescheduleError('Silakan pilih slot waktu pengganti.');
      return;
    }
    setRescheduleError(null);
    setIsSubmittingReschedule(true);

    const res = db.gantiJadwalTerapiMandiri(bookingToReschedule.id, rescheduleSlotId, rescheduleAlasan.trim());
    setIsSubmittingReschedule(false);

    if (res.success && res.booking) {
      confetti({ particleCount: 80, spread: 70 });
      const updatedBooking = res.booking;
      setBookingToReschedule(null);
      setAllBookings(db.getBookingsList().filter(b => b.pesertaId === currentPeserta.id));
      setSlotsList(db.getSlotsList());
      setSelectedTicket(updatedBooking);
      alert(`Alhamdulillah! Jadwal berhasil dipindahkan ke ${updatedBooking.tanggal} (${updatedBooking.jamMulai} - ${updatedBooking.jamSelesai} WIB). Kuota penggantian mandiri 1x telah tercapai.`);
    } else {
      setRescheduleError(res.error || 'Gagal memindahkan jadwal.');
    }
  };

  // Handle Save PIN
  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinMsg(null);

    const cleanPin = newPin.trim();
    const cleanConfirm = confirmPin.trim();

    if (!cleanPin || cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin)) {
      setPinMsg({ type: 'error', text: 'PIN baru harus terdiri dari tepat 6 digit angka.' });
      return;
    }

    if (cleanPin !== cleanConfirm) {
      setPinMsg({ type: 'error', text: 'Konfirmasi PIN tidak sama dengan PIN baru.' });
      return;
    }

    setIsSubmittingPin(true);
    const success = db.gantiPinPeserta(peserta.id, cleanPin);
    if (success) {
      peserta.pin = cleanPin;
      setCurrentPinDisplay(cleanPin);
      confetti({ particleCount: 60 });
      setPinMsg({ type: 'success', text: 'Alhamdulillah, PIN pribadi login Anda berhasil diperbarui!' });
      setNewPin('');
      setConfirmPin('');
    } else {
      setPinMsg({ type: 'error', text: 'Gagal memperbarui PIN. Silakan coba lagi.' });
    }
    setIsSubmittingPin(false);
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
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* 1. Header Profil Siswa & Tombol Keluar (Tanpa Tautan ke Admin/Lainnya) */}
      <div className="bg-gradient-to-r from-sky-900 via-sky-800 to-slate-900 text-white rounded-3xl p-4 sm:p-7 shadow-md space-y-3.5 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-sky-200 font-semibold tracking-wide">
              <span>Siswa Terapi Rutin Resmi ULD</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono bg-sky-700/80 px-2 py-0.5 rounded text-[11px] font-bold">
                {currentPeserta.nomorRekamMedis}
              </span>
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-white">
              {currentPeserta.namaLengkap}
            </h1>
            <div className="text-xs text-slate-300 flex flex-wrap gap-x-2.5 gap-y-1 pt-0.5">
              <span>Orang Tua: <strong className="text-white">{currentPeserta.namaWali}</strong></span>
              <span>·</span>
              <span>Sekolah: <strong className="text-white">{currentPeserta.asalSekolah || 'Kota Probolinggo'}</strong></span>
              <span>·</span>
              <span>Status: <strong className="text-emerald-400 font-bold uppercase">{currentPeserta.status}</strong></span>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={onLogout}
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
            >
              <span>🚪 Keluar</span>
              <span className="hidden sm:inline">(Log Out)</span>
            </button>
          </div>
        </div>

        {/* KARTU TENAGA AHLI PEMBINA TETAP (ATURAN 2) */}
        {currentPeserta.assignedTerapisId && assignedTerapis ? (
          <div className="p-3.5 rounded-2xl bg-sky-800/90 border border-sky-500/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-700 flex items-center justify-center text-xl shrink-0 shadow-xs">
                📌
              </div>
              <div>
                <div className="text-[10px] text-sky-200 uppercase tracking-wider font-extrabold">Tenaga Ahli Pembina Tetap Ananda:</div>
                <div className="font-extrabold text-white text-sm sm:text-base">{assignedTerapis.nama}</div>
                <div className="text-[11px] text-sky-100">
                  {assignedTerapis.spesialisasiLabel} · Ruang: {assignedTerapis.ruangPraktek}
                </div>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-sky-700 text-sky-100 text-[11px] font-bold border border-sky-500/60 self-start sm:self-auto whitespace-nowrap">
              ✓ Penugasan Permanen Aktif
            </span>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-amber-950/80 border border-amber-600/70 flex items-center gap-3 text-xs text-amber-200">
            <div className="w-9 h-9 rounded-xl bg-amber-900 flex items-center justify-center text-lg shrink-0">
              ⏳
            </div>
            <div className="leading-relaxed">
              <strong className="text-amber-100 block font-bold text-sm">Belum Ditugaskan ke Tenaga Ahli Tetap</strong>
              Penugasan terapis pembina dilakukan langsung oleh Tenaga Ahli atau Loket Admin ULD. Setelah ditetapkan, Anda dapat mendaftar mandiri ke jadwal terapis pembina Anda.
            </div>
          </div>
        )}

        {/* PIN Info Strip */}
        <div className="pt-2 border-t border-sky-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="text-sky-100 flex items-center gap-2">
            <span>🔑 PIN Login Siswa Saat Ini:</span>
            <span className="font-mono font-extrabold text-amber-300 text-sm bg-sky-900 px-2.5 py-0.5 rounded-lg border border-sky-600">
              {currentPinDisplay}
            </span>
          </div>
          <span className="text-[11px] text-sky-200/80">
            Dapat diperbarui sewaktu-waktu di tab Ganti PIN
          </span>
        </div>
      </div>

      {/* 2. TAB NAVIGASI HANYA 3 FITUR UTAMA SISWA (RESPONSIF MOBILE RAMAH JARI) */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 bg-slate-200/90 p-1.5 rounded-2xl">
        <button
          onClick={() => setActiveTab('jadwal_daftar')}
          className={`py-2 sm:py-3 px-1 sm:px-3 rounded-xl text-xs sm:text-sm font-bold transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 ${activeTab === 'jadwal_daftar' ? 'bg-white text-sky-900 shadow-sm ring-1 ring-sky-600/20' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <span className="text-base sm:text-sm">🗓️</span>
          <span className="leading-tight">
            <span className="hidden sm:inline">Pilih Jadwal (2 Pekan ke Depan)</span>
            <span className="sm:hidden text-[11px]">Pilih Jadwal</span>
          </span>
        </button>

        <button
          onClick={() => setActiveTab('jadwal_aktif')}
          className={`py-2 sm:py-3 px-1 sm:px-3 rounded-xl text-xs sm:text-sm font-bold transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 ${activeTab === 'jadwal_aktif' ? 'bg-white text-sky-900 shadow-sm ring-1 ring-sky-600/20' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <div className="flex items-center gap-1">
            <span className="text-base sm:text-sm">📋</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold sm:hidden ${activeTab === 'jadwal_aktif' ? 'bg-sky-700 text-white' : 'bg-slate-300 text-slate-800'}`}>
              {activeBookings.length}
            </span>
          </div>
          <span className="leading-tight">
            <span className="hidden sm:inline">Jadwal Aktif Saya</span>
            <span className="sm:hidden text-[11px]">Tiket Saya</span>
          </span>
          <span className={`hidden sm:inline px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'jadwal_aktif' ? 'bg-sky-700 text-white' : 'bg-slate-300 text-slate-800'}`}>
            {activeBookings.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ganti_pin')}
          className={`py-2 sm:py-3 px-1 sm:px-3 rounded-xl text-xs sm:text-sm font-bold transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 ${activeTab === 'ganti_pin' ? 'bg-white text-sky-900 shadow-sm ring-1 ring-sky-600/20' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <span className="text-base sm:text-sm">🔑</span>
          <span className="leading-tight">
            <span className="hidden sm:inline">Ganti PIN Siswa</span>
            <span className="sm:hidden text-[11px]">Ganti PIN</span>
          </span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: PILIH JADWAL TERSEDIA (2 PEKAN KE DEPAN) & DAFTAR MANDIRI */}
      {/* ============================================================ */}
      {activeTab === 'jadwal_daftar' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Selector 2 Pekan ke Depan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Card Pekan 1 */}
            <button
              type="button"
              onClick={() => handleSelectWeek('week1')}
              className={`p-4 rounded-2xl border text-left transition-all relative cursor-pointer ${
                selectedWeekTab === 'week1'
                  ? 'bg-gradient-to-br from-sky-50 to-sky-100/60 border-sky-600 shadow-md ring-2 ring-sky-500/30'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-mono text-xs font-bold text-sky-900 flex items-center gap-1.5">
                  <span>📅</span>
                  <span className="uppercase tracking-wider">Pekan 1 (Pekan Berjalan)</span>
                </span>
                {bookingInWeek1 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-950 border border-amber-300 shadow-2xs">
                    ⚠️ Terjadwal (1/1)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                    🟢 Kuota Tersedia (1x)
                  </span>
                )}
              </div>
              <div className="font-extrabold text-sm sm:text-base text-slate-900">
                {week1.label}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {bookingInWeek1 
                  ? `Terdaftar: ${bookingInWeek1.tanggal} (${bookingInWeek1.jamMulai} - ${bookingInWeek1.jamSelesai} WIB)`
                  : 'Sesi aktif terbuka untuk pendaftaran pekan ini'
                }
              </p>
            </button>

            {/* Card Pekan 2 */}
            <button
              type="button"
              onClick={() => handleSelectWeek('week2')}
              className={`p-4 rounded-2xl border text-left transition-all relative cursor-pointer ${
                selectedWeekTab === 'week2'
                  ? 'bg-gradient-to-br from-sky-50 to-sky-100/60 border-sky-600 shadow-md ring-2 ring-sky-500/30'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-mono text-xs font-bold text-sky-900 flex items-center gap-1.5">
                  <span>📅</span>
                  <span className="uppercase tracking-wider">Pekan 2 (Pekan Berikutnya)</span>
                </span>
                {bookingInWeek2 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-950 border border-amber-300 shadow-2xs">
                    ⚠️ Terjadwal (1/1)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                    🟢 Kuota Tersedia (1x)
                  </span>
                )}
              </div>
              <div className="font-extrabold text-sm sm:text-base text-slate-900">
                {week2.label}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {bookingInWeek2
                  ? `Terdaftar: ${bookingInWeek2.tanggal} (${bookingInWeek2.jamMulai} - ${bookingInWeek2.jamSelesai} WIB)`
                  : bookingInWeek1 
                    ? '✨ Pekan aktif sudah terjadwal, Anda bisa ambil jadwal di pekan ini!'
                    : 'Tersedia untuk pendaftaran sesi pekan selanjutnya'
                }
              </p>
            </button>
          </div>

          {/* Banner Status Kuota Pekan Terpilih */}
          {bookingInActiveWeek ? (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl shrink-0">⏳</span>
                <div className="text-xs">
                  <div className="font-bold text-amber-950 text-sm">
                    Kuota {selectedWeekTab === 'week1' ? 'Pekan Berjalan' : 'Pekan Berikutnya'} Sudah Digunakan (1 Sesi / Minggu)
                  </div>
                  <div className="text-amber-800 mt-0.5">
                    Ananda sudah terdaftar di sesi <strong>{bookingInActiveWeek.tanggal}</strong> pukul <strong>{bookingInActiveWeek.jamMulai} - {bookingInActiveWeek.jamSelesai} WIB</strong>.
                    {selectedWeekTab === 'week1' && !bookingInWeek2 && (
                      <span className="block mt-1 font-semibold text-sky-800">
                        💡 Anda masih memiliki kuota 1x untuk <strong>Pekan Berikutnya ({week2.label})</strong>!
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {selectedWeekTab === 'week1' && !bookingInWeek2 && (
                  <button
                    type="button"
                    onClick={() => handleSelectWeek('week2')}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs shadow-xs cursor-pointer"
                  >
                    👉 Pilih Jadwal Pekan Berikutnya
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveTab('jadwal_aktif')}
                  className="px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-600 text-white font-bold text-xs shrink-0 shadow-xs cursor-pointer"
                >
                  Lihat Tiket Jadwal Aktif →
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center gap-3 shadow-xs">
              <span className="text-2xl shrink-0">✨</span>
              <div className="text-xs">
                <div className="font-bold text-emerald-950 text-sm">
                  Kuota {selectedWeekTab === 'week1' ? 'Pekan Berjalan' : 'Pekan Berikutnya'} Tersedia (1 Kali Pendaftaran)
                </div>
                <div className="text-emerald-800 mt-0.5">
                  {selectedWeekTab === 'week2' && bookingInWeek1
                    ? 'Karena di pekan aktif sudah ada jadwal, Anda berhak memilih 1 jadwal di pekan selanjutnya ini sesuai aturan 1 pekan jatah 1 kali.'
                    : 'Pilih hari dan jam sesi di bawah ini untuk mendaftarkan jadwal sesi terapi ananda ke Tenaga Ahli Pembina Tetap Anda.'
                  }
                </div>
              </div>
            </div>
          )}

          {/* Ketentuan Aturan H-1 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <span>🕒</span>
              <span>Ketentuan Waktu Pendaftaran ULD:</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600">
              Pendaftaran terapi paling minimal dilakukan <strong>H-1 hari sebelum pelaksanaan di maksimal jam 24.00 WIB</strong>. Pendaftaran pada Hari H atau sesi yang telah lewat tidak dapat diproses oleh sistem.
            </p>
          </div>

          {!currentPeserta.assignedTerapisId ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-500 space-y-3">
              <div className="text-4xl">📌</div>
              <h3 className="text-base font-bold text-slate-800">
                Belum Ada Tenaga Ahli Pembina Tetap
              </h3>
              <p className="max-w-md mx-auto text-slate-600">
                Sesuai kebijakan ULD Kota Probolinggo, pendaftaran terapi hanya dapat dilakukan kepada Tenaga Ahli yang telah menetapkan siswa secara tetap. Silakan hubungi loket ULD untuk penugasan terapis pembina ananda.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-4 sm:p-7 border border-slate-200 shadow-sm space-y-5 sm:space-y-6">
              {/* Header Jadwal */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 sm:pb-4">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900">
                    Jadwal Terapi: {assignedTerapis?.nama}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Pekan kalender terpilih: <strong className="font-mono text-sky-700">{activeWeek.label}</strong>
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-sky-50 text-sky-700 font-bold text-xs border border-sky-100 self-start sm:self-auto">
                  09.00 - 13.00 WIB
                </span>
              </div>

              {/* Day Selector Pills (Senin s.d. Jumat) */}
              <div>
                <div className="flex sm:hidden items-center justify-between text-[11px] text-slate-400 mb-1 px-1">
                  <span>Pilih hari terapi ({selectedWeekTab === 'week1' ? 'Pekan 1' : 'Pekan 2'}):</span>
                  <span>Geser ke samping 👉</span>
                </div>
                <div className="flex sm:grid sm:grid-cols-5 gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar -mx-1 px-1 sm:mx-0 sm:px-0 snap-x">
                  {activeWeekDays.map(day => {
                    const isSelected = selectedDayDate === day.dateStr;
                    const deadline = checkBatasPendaftaranHMinus1(day.dateStr);

                    return (
                      <button
                        key={day.dateStr}
                        type="button"
                        onClick={() => setSelectedDayDate(day.dateStr)}
                        className={`p-2.5 sm:p-3 rounded-2xl text-center transition-all flex flex-col items-center justify-center gap-1 border shrink-0 sm:shrink min-w-[76px] sm:min-w-0 flex-1 snap-center cursor-pointer ${
                          isSelected 
                            ? 'bg-sky-800 text-white border-sky-900 shadow-md ring-2 ring-sky-400/30' 
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap ${isSelected ? 'text-sky-100' : 'text-slate-500'}`}>
                          {day.dayName}
                        </span>
                        <span className={`text-xs sm:text-sm font-black whitespace-nowrap ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          {day.dayFormatted}
                        </span>
                        {day.isToday ? (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold mt-0.5 whitespace-nowrap ${isSelected ? 'bg-amber-400 text-slate-950' : 'bg-amber-200 text-amber-900'}`}>
                            Hari H
                          </span>
                        ) : !deadline.bisaDaftar ? (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold mt-0.5 whitespace-nowrap ${isSelected ? 'bg-sky-700 text-sky-200' : 'bg-slate-200 text-slate-600'}`}>
                            Tutup
                          </span>
                        ) : (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold mt-0.5 whitespace-nowrap ${isSelected ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                            Buka
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sesi-Sesi pada Hari Terpilih */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-bold text-slate-800">
                    Sesi Tersedia pada {activeWeekDays.find(d => d.dateStr === selectedDayDate)?.dayName}, {selectedDayDate}:
                  </span>
                  <span>Maksimal 1 Kuota per Jam Sesi</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {DEFAULT_SESSIONS.map(session => {
                    const existingSlot = slotsList.find(s => 
                      s.terapisId === currentPeserta.assignedTerapisId && 
                      s.tanggal === selectedDayDate && 
                      s.jamMulai === session.start
                    );

                    const deadline = checkBatasPendaftaranHMinus1(selectedDayDate);

                    const isBookedByMe = allBookings.some(b => 
                      b.tanggal === selectedDayDate && 
                      b.jamMulai === session.start && 
                      b.status !== 'batal'
                    );

                    const isFull = existingSlot && existingSlot.kuotaTerisi >= existingSlot.kuotaMaksimal;
                    const isClosedByTerapis = existingSlot && existingSlot.statusSlot === 'dibatalkan';

                    return (
                      <div
                        key={session.start}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                          isBookedByMe 
                            ? 'bg-sky-50 border-sky-300 shadow-xs ring-1 ring-sky-300/50' 
                            : isClosedByTerapis
                              ? 'bg-slate-100/70 border-slate-200 text-slate-500 opacity-75'
                              : !deadline.bisaDaftar 
                                ? 'bg-slate-50/80 border-slate-200 opacity-75' 
                                : isFull 
                                  ? 'bg-rose-50/60 border-rose-200' 
                                  : 'bg-white border-slate-200 hover:border-sky-400 shadow-xs'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-sm text-slate-900 font-mono">
                              ⏰ {session.start} - {session.end} WIB
                            </span>
                            {isBookedByMe ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-700 text-white">
                                ✓ Jadwal Anda
                              </span>
                            ) : isClosedByTerapis ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                                ⚪ Dimatikan Terapis
                              </span>
                            ) : !deadline.bisaDaftar ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                🔒 {deadline.labelBatas}
                              </span>
                            ) : isFull ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                Penuh (1/1)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                🟢 Tersedia (1 Slot)
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-600">
                            <div>Ruang: <strong>{assignedTerapis?.ruangPraktek || 'Ruang Terapi'}</strong></div>
                            <div className="text-[11px] text-slate-500">Tenaga Ahli: {assignedTerapis?.nama}</div>
                          </div>
                        </div>

                        {/* Button Action */}
                        <div className="pt-2 border-t border-slate-100">
                          {isBookedByMe ? (
                            <button
                              type="button"
                              onClick={() => setActiveTab('jadwal_aktif')}
                              className="w-full py-2 rounded-xl bg-sky-700 text-white font-bold text-xs cursor-pointer"
                            >
                              Lihat Tiket Saya →
                            </button>
                          ) : isClosedByTerapis ? (
                            <div className="text-center py-2 text-[11px] font-semibold text-slate-500 bg-slate-100 rounded-xl">
                              Sesi Dimatikan Terapis
                            </div>
                          ) : !deadline.bisaDaftar ? (
                            <div className="text-center py-1.5 text-[11px] font-semibold text-slate-400">
                              Pendaftaran ditutup (Batas H-1)
                            </div>
                          ) : isFull ? (
                            <div className="text-center py-1.5 text-[11px] font-semibold text-rose-700">
                              Slot sudah terisi oleh siswa lain
                            </div>
                          ) : existingBookingInSelectedDayWeek ? (
                            <div className="space-y-1">
                              <button
                                type="button"
                                disabled
                                title={`Anda sudah memiliki 1 jadwal aktif pada pekan ini (${existingBookingInSelectedDayWeek.tanggal})`}
                                className="w-full py-2 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs cursor-not-allowed"
                              >
                                Kuota Pekan Ini Penuh (1/1)
                              </button>
                              {selectedWeekTab === 'week1' && !bookingInWeek2 && (
                                <button
                                  type="button"
                                  onClick={() => handleSelectWeek('week2')}
                                  className="w-full text-center text-[10px] text-sky-700 font-bold hover:underline cursor-pointer"
                                >
                                  👉 Ambil Kuota di Pekan Berikutnya →
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                let slotId = existingSlot?.id;
                                if (!slotId) {
                                  const created = db.bukaSlotHarian({
                                    terapisId: currentPeserta.assignedTerapisId!,
                                    tanggal: selectedDayDate,
                                    jamMulai: session.start,
                                    jamSelesai: session.end,
                                    spesialisasi: assignedTerapis!.spesialisasi,
                                    ruang: assignedTerapis!.ruangPraktek,
                                    kuotaMaksimal: 1
                                  });
                                  slotId = created.id;
                                }
                                setSlotToBook({
                                  slotId,
                                  tanggal: selectedDayDate,
                                  jamMulai: session.start,
                                  jamSelesai: session.end,
                                  ruang: assignedTerapis!.ruangPraktek
                                });
                              }}
                              className="w-full py-2 rounded-xl bg-sky-700 hover:bg-sky-600 text-white font-bold text-xs shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <span>📝 Daftar Sesi Ini</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: JADWAL AKTIF & TIKET TERDAFTAR */}
      {/* ============================================================ */}
      {activeTab === 'jadwal_aktif' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Jadwal Terapi Aktif Ananda
              </h2>
              <p className="text-xs text-slate-500">
                Sesi terapi yang saat ini berstatus terjadwal dan siap dihadiri
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-sky-50 text-sky-700 font-bold text-xs border border-sky-100">
              {activeBookings.length} Sesi Terjadwal
            </span>
          </div>

          {activeBookings.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-500 space-y-3">
              <div className="text-4xl">📋</div>
              <h3 className="text-base font-bold text-slate-800">
                Belum Ada Jadwal Terapi Aktif
              </h3>
              <p className="max-w-md mx-auto text-slate-600">
                Ananda belum memiliki jadwal terapi aktif saat ini. Silakan buka tab <strong>"Pilih Jadwal Minggu Ini"</strong> untuk mendaftarkan jadwal sesi terapi baru.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('jadwal_daftar')}
                className="px-5 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white font-bold text-xs shadow-xs transition-all"
              >
                Pilih Jadwal Sekarang →
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {activeBookings.map(b => (
                <div
                  key={b.id}
                  className="bg-white rounded-3xl p-4 sm:p-6 border border-sky-100 shadow-sm space-y-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-sky-800 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100">
                        {b.kodeBooking}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                        ● Terjadwal Resmi
                      </span>
                    </div>

                    <div className="text-xs text-slate-500">
                      Terdaftar pada: {new Date(b.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider block">Waktu & Tanggal Layanan</span>
                      <div className="text-base font-black text-slate-900">
                        📅 {b.tanggal}
                      </div>
                      <div className="font-mono font-bold text-sky-700 text-sm">
                        ⏰ {b.jamMulai} - {b.jamSelesai} WIB
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider block">Tenaga Ahli & Ruangan</span>
                      <div className="font-extrabold text-slate-900 text-sm">
                        👨‍⚕️ {assignedTerapis?.nama || 'Tenaga Ahli Pembina'}
                      </div>
                      <div className="text-slate-600">
                        {getSpesialisasiLabel(b.spesialisasi)} · 📍 {b.ruang}
                      </div>
                    </div>
                  </div>

                  {b.keluhanHariIni && (
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700">
                      <span className="font-bold text-slate-800">Catatan/Keluhan yang Disampaikan:</span> {b.keluhanHariIni}
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleCancelBooking(b.id)}
                      className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 text-xs font-bold transition-colors border border-red-200 sm:border-transparent text-center"
                    >
                      ✕ Batalkan Sesi
                    </button>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      {(!b.rescheduleCount || b.rescheduleCount < 1) ? (
                        <button
                          type="button"
                          onClick={() => {
                            setBookingToReschedule(b);
                            const bWeek = getWeekBounds(b.tanggal);
                            setRescheduleWeekTab(bWeek.monday === week2.monday ? 'week2' : 'week1');
                            setRescheduleDayDate(b.tanggal);
                            setRescheduleSlotId('');
                            setRescheduleAlasan('Salah memilih hari/waktu');
                            setRescheduleError(null);
                          }}
                          className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5"
                          title="Ganti jadwal maksimal 1 kali"
                        >
                          <span>🔄 Ganti Hari/Waktu (Maks 1x)</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-xl text-center border border-slate-200">
                          🔒 Reschedule 1/1 Tercapai
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedTicket(b)}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white font-bold text-xs shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <span>🎫 Tampilkan & Cetak Tiket</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Riwayat Sesi Selesai / Terdahulu */}
          {pastBookings.length > 0 && (
            <div className="pt-6 border-t border-slate-200 space-y-3">
              <h3 className="font-extrabold text-sm text-slate-900">
                Riwayat Sesi Terapi Terdahulu ({pastBookings.length})
              </h3>
              <div className="space-y-2">
                {pastBookings.map(pb => (
                  <div
                    key={pb.id}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-mono text-[11px] font-bold text-slate-600 mr-2">{pb.kodeBooking}</span>
                      <strong className="text-slate-900">{pb.tanggal} ({pb.jamMulai} - {pb.jamSelesai} WIB)</strong>
                      <span className="text-slate-500 ml-2">· {getSpesialisasiLabel(pb.spesialisasi)}</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold self-start sm:self-auto ${
                      pb.status === 'selesai' || pb.status === 'hadir' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {pb.status === 'selesai' ? '✓ Selesai' : pb.status === 'batal' ? 'Dibatalkan' : pb.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: GANTI PIN PRIBADI SISWA */}
      {/* ============================================================ */}
      {activeTab === 'ganti_pin' && (
        <div className="bg-white rounded-3xl p-4 sm:p-7 border border-slate-200 shadow-sm space-y-5 animate-in fade-in">
          <div className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔑</span>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                Ganti PIN Login Pribadi Siswa
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Gunakan 6 digit angka yang mudah diingat oleh orang tua/wali untuk login mandiri.
            </p>
          </div>

          {pinMsg && (
            <div className={`p-3.5 rounded-2xl text-xs font-semibold border ${pinMsg.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : 'bg-red-50 text-red-900 border-red-300'} animate-in fade-in`}>
              {pinMsg.text}
            </div>
          )}

          <form onSubmit={handleSavePin} className="space-y-4 max-w-md text-xs">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-slate-600">
              PIN saat ini: <strong className="font-mono text-sky-700 font-extrabold text-sm">{currentPinDisplay}</strong>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  PIN Baru (6 Digit) *
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={newPin}
                  onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="6 digit angka"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-center font-bold text-base focus:outline-none focus:ring-2 focus:ring-sky-600 bg-slate-50"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ulangi PIN Baru *
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ulangi 6 digit"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-center font-bold text-base focus:outline-none focus:ring-2 focus:ring-sky-600 bg-slate-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmittingPin || !newPin || !confirmPin}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white font-bold text-xs shadow transition-all active:scale-95 disabled:opacity-50 text-center"
            >
              {isSubmittingPin ? 'Menyimpan...' : '✓ Simpan PIN Baru'}
            </button>
          </form>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL KONFIRMASI PENDAFTARAN JADWAL TERAPI */}
      {/* ============================================================ */}
      {slotToBook && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <form
            onSubmit={handleConfirmBooking}
            className="bg-white rounded-3xl max-w-md w-full p-4 sm:p-7 space-y-3.5 sm:space-y-4 shadow-2xl animate-in zoom-in-95 border-2 border-sky-500 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📝</span>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Konfirmasi Pendaftaran Jadwal
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Pendaftaran sesi terapi mandiri siswa ULD
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSlotToBook(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            {bookingError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs font-semibold">
                {bookingError}
              </div>
            )}

            <div className="p-4 rounded-2xl bg-sky-900 text-white space-y-2 text-xs">
              <div className="text-sky-200 font-bold uppercase text-[10px]">Data Sesi Terpilih:</div>
              <div className="text-base font-extrabold text-white">
                📅 {slotToBook.tanggal}
              </div>
              <div className="font-mono font-bold text-sky-100">
                ⏰ {slotToBook.jamMulai} - {slotToBook.jamSelesai} WIB
              </div>
              <div className="pt-2 border-t border-sky-700 text-[11px] text-sky-50 flex justify-between">
                <span>Tenaga Ahli: <strong>{assignedTerapis?.nama}</strong></span>
                <span>Ruang: <strong>{slotToBook.ruang}</strong></span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Catatan / Keluhan Orang Tua Hari Ini (Opsional)
              </label>
              <textarea
                rows={2}
                value={keluhanInput}
                onChange={e => setKeluhanInput(e.target.value)}
                placeholder="Contoh: Anak agak batuk ringan / sedang fokus latihan komunikasi verbal..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
              <strong>Pemberitahuan:</strong> Sesuai ketentuan operasional ULD, pembatalan jadwal setelah pendaftaran hanya dapat dilakukan maksimal H-1 hari.
            </div>

            <div className="pt-2 flex flex-col-reverse sm:flex-row gap-2 justify-end">
              <button
                type="button"
                onClick={() => setSlotToBook(null)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 text-center"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmittingBooking}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white font-bold text-xs shadow transition-all active:scale-95 disabled:opacity-50 text-center"
              >
                {isSubmittingBooking ? 'Memproses...' : '✓ Konfirmasi Pendaftaran'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL TIKET DIGITAL RESMI SISWA */}
      {/* ============================================================ */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-4 sm:p-6 space-y-4 shadow-2xl animate-in zoom-in-95 border-2 border-sky-500 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Tiket Terapi Resmi ULD
                </h3>
                <p className="text-[11px] text-slate-500">
                  Unit Layanan Disabilitas Kota Probolinggo
                </p>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-sky-900 text-white space-y-3">
              <div className="flex justify-between items-center text-xs text-sky-200 font-mono">
                <span>TIKET SESI TERAPI</span>
                <span className="bg-sky-800 px-2 py-0.5 rounded font-bold border border-sky-600">{selectedTicket.kodeBooking}</span>
              </div>
              <div>
                <div className="text-xs text-sky-100">Nama Siswa:</div>
                <div className="text-lg font-bold text-white">
                  {currentPeserta.namaLengkap}
                </div>
                <div className="text-xs text-sky-200 mt-0.5">
                  Layanan: <strong className="text-white">{getSpesialisasiLabel(selectedTicket.spesialisasi)}</strong>
                </div>
              </div>
              <div className="pt-2 border-t border-sky-700 text-xs flex justify-between items-end">
                <div>
                  <div className="text-sky-200 text-[10px]">JADWAL & RUANG</div>
                  <div className="font-bold text-white">{selectedTicket.tanggal}</div>
                  <div className="text-sky-100">{selectedTicket.jamMulai} - {selectedTicket.jamSelesai} WIB · {selectedTicket.ruang}</div>
                </div>
                <div className="text-right">
                  <div className="text-sky-200 text-[10px]">TENAGA AHLI</div>
                  <div className="font-bold text-sky-100">{assignedTerapis?.nama || 'Tenaga Ahli ULD'}</div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                🖨️ Cetak Tiket
              </button>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="w-full py-2.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white text-xs font-bold shadow-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL GANTI HARI & WAKTU (MANDIRI MAKSIMAL 1 KALI) */}
      {/* ============================================================ */}
      {bookingToReschedule && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <form
            onSubmit={handleConfirmReschedule}
            className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 space-y-4 shadow-2xl animate-in zoom-in-95 border-2 border-amber-500 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-1.5">
                  <span>🔄</span>
                  <span>Ganti Hari/Waktu Jadwal (Maks 1x)</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Peserta terapi rutin berhak memindahkan jadwal mandiri maksimal 1 kali jika salah memilih.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBookingToReschedule(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {rescheduleError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-800">
                {rescheduleError}
              </div>
            )}

            {/* Current Session Summary */}
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1">
              <div className="font-bold text-[10px] uppercase tracking-wider text-amber-800">Jadwal Lama yang Akan Diganti:</div>
              <div className="font-extrabold text-sm text-slate-900">
                📅 {bookingToReschedule.tanggal} · ⏰ {bookingToReschedule.jamMulai} - {bookingToReschedule.jamSelesai} WIB
              </div>
              <div className="text-[11px] text-slate-600">
                Tenaga Ahli: <strong>{assignedTerapis?.nama}</strong> · Kode: {bookingToReschedule.kodeBooking}
              </div>
            </div>

            {/* 1. Pilih Hari Pengganti */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  1. Pilih Hari Pengganti (2 Pekan ke Depan):
                </label>
                <div className="flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-[10px] font-bold self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setRescheduleWeekTab('week1');
                      const firstOpen = week1Days.find(d => checkBatasPendaftaranHMinus1(d.dateStr).bisaDaftar);
                      setRescheduleDayDate(firstOpen ? firstOpen.dateStr : week1Days[0].dateStr);
                      setRescheduleSlotId('');
                    }}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      rescheduleWeekTab === 'week1'
                        ? 'bg-sky-700 text-white shadow-2xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Pekan 1 ({week1.label})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRescheduleWeekTab('week2');
                      setRescheduleDayDate(week2Days[0].dateStr);
                      setRescheduleSlotId('');
                    }}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      rescheduleWeekTab === 'week2'
                        ? 'bg-sky-700 text-white shadow-2xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Pekan 2 ({week2.label})
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {(rescheduleWeekTab === 'week1' ? week1Days : week2Days).map(wd => {
                  const deadline = checkBatasPendaftaranHMinus1(wd.dateStr);
                  const isSelected = (rescheduleDayDate || bookingToReschedule.tanggal) === wd.dateStr;
                  const isCurrentDay = bookingToReschedule.tanggal === wd.dateStr;

                  return (
                    <button
                      key={wd.dateStr}
                      type="button"
                      disabled={!deadline.bisaDaftar}
                      onClick={() => {
                        setRescheduleDayDate(wd.dateStr);
                        setRescheduleSlotId('');
                      }}
                      className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-sky-800 text-white border-sky-900 shadow-sm font-bold ring-2 ring-sky-400/40'
                          : !deadline.bisaDaftar
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-sky-400'
                      }`}
                    >
                      <div className="text-[11px] font-bold">{wd.dayName}</div>
                      <div className="text-[10px] opacity-80">{wd.dayFormatted}</div>
                      {isCurrentDay && (
                        <div className="text-[9px] text-amber-500 font-extrabold mt-0.5">• Lama</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Pilih Jam / Sesi Pengganti */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                2. Pilih Sesi Jam Pengganti:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DEFAULT_SESSIONS.map((session, sIdx) => {
                  const activeTargetDate = rescheduleDayDate || bookingToReschedule.tanggal;
                  const existingSlot = slotsList.find(s => 
                    s.terapisId === currentPeserta.assignedTerapisId && 
                    s.tanggal === activeTargetDate && 
                    s.jamMulai === session.start
                  );
                  const isClosed = existingSlot && existingSlot.statusSlot === 'dibatalkan';
                  const isFull = existingSlot && (existingSlot.statusSlot === 'penuh' || existingSlot.kuotaTerisi >= existingSlot.kuotaMaksimal);
                  const isCurrentBookingSlot = bookingToReschedule.tanggal === activeTargetDate && bookingToReschedule.jamMulai === session.start;
                  const canSelect = !isClosed && (!isFull || isCurrentBookingSlot);
                  const slotId = existingSlot?.id;
                  const isSelected = rescheduleSlotId === slotId && Boolean(slotId);

                  return (
                    <button
                      key={sIdx}
                      type="button"
                      disabled={!canSelect}
                      onClick={() => {
                        let finalSlotId = existingSlot?.id;
                        if (!finalSlotId) {
                          const created = db.bukaSlotHarian({
                            terapisId: currentPeserta.assignedTerapisId!,
                            tanggal: activeTargetDate,
                            jamMulai: session.start,
                            jamSelesai: session.end,
                            spesialisasi: assignedTerapis!.spesialisasi,
                            ruang: assignedTerapis!.ruangPraktek,
                            kuotaMaksimal: 1
                          });
                          finalSlotId = created.id;
                        }
                        setRescheduleSlotId(finalSlotId);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'border-sky-600 bg-sky-50 ring-2 ring-sky-500'
                          : !canSelect
                            ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                            : 'border-slate-200 bg-white hover:border-sky-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-slate-900">{session.start} - {session.end} WIB</span>
                        {isCurrentBookingSlot ? (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Sesi Anda Saat Ini</span>
                        ) : isClosed ? (
                          <span className="text-[10px] text-slate-500">Ditutup</span>
                        ) : isFull ? (
                          <span className="text-[10px] text-red-600 font-bold">Penuh</span>
                        ) : (
                          <span className="text-[10px] text-emerald-700 font-bold">✓ Tersedia</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Ruang {assignedTerapis?.ruangPraktek || 'Terapi'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Alasan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                3. Alasan Penggantian Jadwal
              </label>
              <input
                type="text"
                value={rescheduleAlasan}
                onChange={e => setRescheduleAlasan(e.target.value)}
                placeholder="Contoh: Salah pilih hari / bentrok dengan jadwal terapi lain"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-sky-600 font-medium"
              />
            </div>

            <div className="p-3 bg-sky-50 rounded-xl border border-sky-100 text-sky-900 text-[11px] leading-relaxed">
              ℹ️ <strong>Perhatian:</strong> Penggantian jadwal mandiri dibatasi <strong>maksimal 1 kali</strong> per tiket pendaftaran sesi. Pastikan hari dan waktu pengganti sudah benar.
            </div>

            <div className="pt-2 flex flex-col-reverse sm:flex-row gap-2 justify-end">
              <button
                type="button"
                onClick={() => setBookingToReschedule(null)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 text-center"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmittingReschedule || !rescheduleSlotId}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow transition-all active:scale-95 disabled:opacity-50 text-center flex items-center justify-center gap-1.5"
              >
                <span>{isSubmittingReschedule ? 'Memproses...' : '🔄 Simpan Perubahan Jadwal (Maks 1x)'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
