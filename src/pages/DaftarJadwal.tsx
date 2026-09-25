import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { db, getWeekBounds, checkBatasPendaftaranHMinus1, getWIBDate } from '../services/supabase';
import { navigateTo } from '../services/router';
import { SlotHarian, TerapisSpesialisasi, Peserta, BookingTerapi } from '../types';

interface Props {
  currentPeserta?: Peserta;
}

export const DaftarJadwal: React.FC<Props> = ({ currentPeserta }) => {
  const [selectedSpesialisasi, setSelectedSpesialisasi] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [bookingSlotModal, setBookingSlotModal] = useState<SlotHarian | null>(null);
  const [psikologNoticeModal, setPsikologNoticeModal] = useState<SlotHarian | null>(null);
  const [weeklyLimitNoticeModal, setWeeklyLimitNoticeModal] = useState<{ slot: SlotHarian; existingTanggal: string; existingJam: string } | null>(null);
  const [showContactAdminModal, setShowContactAdminModal] = useState<boolean>(false);
  const [keluhanFokus, setKeluhanFokus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [slotsList, setSlotsList] = useState<SlotHarian[]>(() => db.getSlotsList().filter(s => s.statusSlot !== 'dibatalkan'));
  const [allBookings, setAllBookings] = useState<BookingTerapi[]>(() => db.getBookingsList());
  const [pesertaList, setPesertaList] = useState<Peserta[]>(() => db.getPesertaList());
  const terapisList = db.getTerapisList();

  useEffect(() => {
    const handleUpdate = () => {
      setSlotsList(db.getSlotsList().filter(s => s.statusSlot !== 'dibatalkan'));
      setAllBookings(db.getBookingsList());
      setPesertaList(db.getPesertaList());
    };
    window.addEventListener('uld_data_updated', handleUpdate);
    return () => window.removeEventListener('uld_data_updated', handleUpdate);
  }, []);

  const activePeserta = currentPeserta ? (pesertaList.find(p => p.id === currentPeserta.id) || currentPeserta) : undefined;

  // Kontak resmi Admin ULD Kota Probolinggo
  const ADMIN_CONTACTS = [
    {
      id: 'admin-1',
      nama: 'Sugeng',
      role: 'Admin 1 ULD Kota Probolinggo',
      waNumber: '6285236028521',
      waFormatted: '0852-3602-8521',
      waUrl: 'https://wa.me/6285236028521?text=Halo%20Pak%20Sugeng%20(Admin%201%20ULD%20Kota%20Probolinggo),%20saya%20ingin%20berkonsultasi%20mengenai%20jadwal%20terapi%20atau%20asesmen...'
    },
    {
      id: 'admin-2',
      nama: 'Helmi',
      role: 'Admin 2 ULD Kota Probolinggo',
      waNumber: '6282247952696',
      waFormatted: '0822-4795-2696',
      waUrl: 'https://wa.me/6282247952696?text=Halo%20Pak%20Helmi%20(Admin%202%20ULD%20Kota%20Probolinggo),%20saya%20ingin%20berkonsultasi%20mengenai%20jadwal%20terapi%20atau%20asesmen...'
    }
  ];

  const getTerapis = (terapisId: string) => {
    return terapisList.find(t => t.id === terapisId);
  };

  const todayWIB = getWIBDate();
  const currentWeek = getWeekBounds(todayWIB.dateStr);
  const mondayDate = new Date(currentWeek.monday + 'T00:00:00');
  const fridayDate = new Date(mondayDate);
  fridayDate.setDate(mondayDate.getDate() + 4);
  const currentWeekFriday = fridayDate.toISOString().split('T')[0];

  // ATURAN 1: Jadwal terapi publik tidak perlu menampilkan tanggal yang sudah lewat.
  // Cukup hari H dan hari aktif selama minggu berjalan (Senin - Jumat).
  let minAllowedDate = todayWIB.dateStr;
  let maxAllowedDate = currentWeekFriday;

  // Jika hari ini adalah akhir pekan (Sabtu/Minggu), tampilkan pekan aktif berikutnya
  if (todayWIB.dateStr > currentWeekFriday) {
    const nextMonday = new Date(mondayDate);
    nextMonday.setDate(mondayDate.getDate() + 7);
    const nextFriday = new Date(nextMonday);
    nextFriday.setDate(nextMonday.getDate() + 4);
    minAllowedDate = nextMonday.toISOString().split('T')[0];
    maxAllowedDate = nextFriday.toISOString().split('T')[0];
  }

  // Filter slots khusus publik: HANYA Hari H dan hari aktif selama minggu berjalan (tanggal lewat dihilangkan)
  const activePublicSlots = slotsList.filter(slot => {
    return slot.tanggal >= minAllowedDate && slot.tanggal <= maxAllowedDate;
  });

  const filteredSlots = activePublicSlots.filter(slot => {
    if (selectedSpesialisasi !== 'all' && slot.spesialisasi !== selectedSpesialisasi) {
      return false;
    }
    if (selectedDateFilter !== 'all' && slot.tanggal !== selectedDateFilter) {
      return false;
    }
    return true;
  });

  // Extract unique available dates
  const uniqueDates = Array.from(new Set(activePublicSlots.map(s => s.tanggal))).sort();

  // Active bookings for current participant (to check 1x / week rule)
  const activeBookings = activePeserta
    ? allBookings.filter(b => b.pesertaId === activePeserta.id && b.status !== 'batal')
    : [];

  const handleOpenBooking = (slot: SlotHarian) => {
    if (!activePeserta) {
      alert('Untuk mendaftar jadwal terapi, silakan masuk dengan nama siswa dan masukkan PIN pribadi.');
      navigateTo('/login-peserta');
      return;
    }

    // ATURAN 3: Pendaftaran terapi paling minimal dilakukan H-1 hari di maksimal jam 24.00 WIB
    const deadlineCheck = checkBatasPendaftaranHMinus1(slot.tanggal);
    if (!deadlineCheck.bisaDaftar) {
      alert(deadlineCheck.pesan || 'Pendaftaran ditutup karena batas waktu minimal H-1 hari maksimal jam 24.00 WIB telah terlewati.');
      return;
    }

    // ATURAN 2: Masing-masing terapis assign anak binaan tetap, siswa hanya bisa daftar ke terapis tersebut
    if (!activePeserta.assignedTerapisId) {
      alert(`Pendaftaran belum dapat diproses. Ananda ${activePeserta.namaLengkap} belum ditetapkan ke Tenaga Ahli / Terapis pembina tetap. Silakan hubungi terapis atau petugas loket ULD.`);
      return;
    }

    if (activePeserta.assignedTerapisId !== slot.terapisId) {
      alert(`Pendaftaran tidak dapat dilakukan. Sesuai penetapan terapis tetap, Ananda ${activePeserta.namaLengkap} hanya dapat mendaftar ke ${activePeserta.assignedTerapisNama}.`);
      return;
    }

    // ATURAN KHUSUS: Khusus Psikolog HANYA melalui Admin 1 atau Admin 2
    if (slot.spesialisasi === 'psikolog') {
      setPsikologNoticeModal(slot);
      return;
    }

    // ATURAN KUOTA: Siswa hanya bisa mendaftar maksimal 1x dalam seminggu
    const slotWeek = getWeekBounds(slot.tanggal);
    const existingInWeek = activeBookings.find(b => {
      const bWeek = getWeekBounds(b.tanggal);
      return bWeek.monday === slotWeek.monday;
    });

    if (existingInWeek) {
      setWeeklyLimitNoticeModal({
        slot,
        existingTanggal: existingInWeek.tanggal,
        existingJam: `${existingInWeek.jamMulai} - ${existingInWeek.jamSelesai}`
      });
      return;
    }

    setBookingSlotModal(slot);
    setKeluhanFokus('');
    setErrorMsg('');
  };

  const handleConfirmBooking = () => {
    if (!bookingSlotModal || !activePeserta) return;
    setIsSubmitting(true);
    setErrorMsg('');

    const res = db.buatBookingTerapi(activePeserta.id, bookingSlotModal.id, keluhanFokus);

    if (res.success) {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });
      setBookingSlotModal(null);
      setIsSubmitting(false);
      navigateTo('/portal-peserta');
    } else {
      setErrorMsg(res.error || 'Gagal mendaftar slot.');
      setIsSubmitting(false);
    }
  };

  const getSpesialisasiLabel = (spec: TerapisSpesialisasi) => {
    switch (spec) {
      case 'terapis_perilaku': return 'Terapis Perilaku (ABA)';
      case 'fisioterapis': return 'Fisioterapi';
      case 'tenaga_plb': return 'Tenaga PLB';
      case 'psikolog': return 'Psikolog';
      default: return spec;
    }
  };

  // Helper untuk mendapatkan daftar siswa yang sudah terdaftar di suatu slot
  const getBookedStudentsForSlot = (slot: SlotHarian) => {
    const matching = allBookings.filter(b => 
      (b.slotId === slot.id || (b.tanggal === slot.tanggal && b.jamMulai === slot.jamMulai && b.terapisId === slot.terapisId)) &&
      b.status !== 'batal'
    );
    return matching.map(b => {
      const p = pesertaList.find(x => x.id === b.pesertaId);
      return {
        id: b.id,
        nama: p ? p.namaLengkap : 'Siswa Terdaftar',
        nomorRekamMedis: p?.nomorRekamMedis,
        asalSekolah: p?.asalSekolah,
        status: b.status
      };
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header Banner - Terbuka untuk Umum */}
      <div className="bg-white rounded-3xl p-4 sm:p-7 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 uppercase tracking-wider">
            <span>Jadwal Terbuka Umum</span>
            <span aria-hidden="true">·</span>
            <span>Senin - Jumat (09.00 - 13.00 WIB)</span>
          </div>

          <button
            onClick={() => setShowContactAdminModal(true)}
            className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
          >
            <span>💬 Hubungi Admin via WA</span>
          </button>
        </div>

        <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Jadwal Terapi & Daftar Peserta ULD
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Laman ini <strong>dapat diakses oleh umum</strong> untuk melihat keterisian jadwal terapi harian dan siapa saja peserta yang sudah terjadwal di setiap sesinya.
        </p>

        {/* Status Siswa Login */}
        {activePeserta && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-teal-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm border border-teal-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-800 flex items-center justify-center text-xl shrink-0">
                🧒
              </div>
              <div>
                <div className="text-[10px] text-teal-300 font-bold uppercase tracking-wider">
                  Akun Siswa Terverifikasi · No. RM: {activePeserta.nomorRekamMedis}
                </div>
                <div className="text-base font-extrabold text-white">
                  {activePeserta.namaLengkap}
                </div>
                <div className="text-xs text-teal-200">
                  Wali: {activePeserta.namaWali} ({activePeserta.asalSekolah || 'Kota Probolinggo'})
                </div>
              </div>
            </div>

            <div className="shrink-0 self-start sm:self-auto">
              {activePeserta.assignedTerapisId ? (
                <div className="bg-teal-900 border border-teal-700 px-3.5 py-2 rounded-xl text-left sm:text-right">
                  <div className="text-[10px] text-teal-300 font-bold uppercase tracking-wider">Tenaga Ahli Pembina Tetap:</div>
                  <div className="font-extrabold text-amber-300 text-xs mt-0.5">
                    📌 {activePeserta.assignedTerapisNama}
                  </div>
                  <div className="text-[10px] text-teal-200">Hanya dapat mendaftar ke sesi beliau</div>
                </div>
              ) : (
                <div className="bg-amber-950 border border-amber-700 px-3.5 py-2 rounded-xl text-xs text-amber-200">
                  <div className="font-bold text-amber-300">⏳ Belum Di-assign ke Terapis</div>
                  <div className="text-[10px]">Hubungi terapis / loket admin untuk penetapan</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4 Aturan Resmi Operasional Layanan ULD */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 pt-1">
          <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 space-y-1">
            <div className="font-extrabold flex items-center justify-between text-amber-900">
              <span>📅 Kuota Layanan:</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-200/80 text-[10px] font-black uppercase">Maks 1x / Pekan</span>
            </div>
            <p className="text-slate-700 leading-relaxed text-[11px]">
              Setiap anak hanya dapat mendaftar <strong>maksimal 1x per minggu</strong> kalender demi pemerataan.
            </p>
          </div>

          <div className="p-3 sm:p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200 text-xs text-rose-950 space-y-1">
            <div className="font-extrabold flex items-center justify-between text-rose-900">
              <span>⏰ Batas Waktu H-1:</span>
              <span className="px-1.5 py-0.5 rounded bg-rose-200/80 text-[10px] font-black uppercase">Maks 24.00 WIB</span>
            </div>
            <p className="text-slate-700 leading-relaxed text-[11px]">
              Pendaftaran minimal dilakukan <strong>H-1 hari maks jam 24.00 WIB</strong>. Pendaftaran Hari H ditutup otomatis.
            </p>
          </div>

          <div className="p-3 sm:p-3.5 rounded-2xl bg-teal-50/80 border border-teal-200 text-xs text-teal-950 space-y-1">
            <div className="font-extrabold flex items-center justify-between text-teal-900">
              <span>📌 Siswa Binaan Tetap:</span>
              <span className="px-1.5 py-0.5 rounded bg-teal-200/80 text-[10px] font-black uppercase">Permanen</span>
            </div>
            <p className="text-slate-700 leading-relaxed text-[11px]">
              Siswa yang sudah ditetapkan oleh terapis <strong>hanya dapat mendaftar ke terapis tersebut</strong>.
            </p>
          </div>

          <div className="p-3 sm:p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-xs text-indigo-950 space-y-1">
            <div className="font-extrabold flex items-center justify-between text-indigo-900">
              <span>🧠 Khusus Psikolog:</span>
              <span className="px-1.5 py-0.5 rounded bg-indigo-200/80 text-[10px] font-black uppercase">Via Admin</span>
            </div>
            <p className="text-slate-700 leading-relaxed text-[11px]">
              Layanan Psikolog (M. Ikhsan, M.Psi.) hanya melalui <strong>Admin 1 (Sugeng)</strong> & <strong>Admin 2 (Helmi)</strong>.
            </p>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 text-xs">
          <div className="text-slate-600 flex items-center gap-1.5">
            <span>ℹ️</span>
            <span><strong>Pendaftaran Resmi:</strong> Pendaftaran dapat dilakukan langsung di Loket ULD atau secara online bagi siswa binaan tetap yang memenuhi batas H-1.</span>
          </div>
          <button
            onClick={() => setShowContactAdminModal(true)}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <span>💬 Hubungi Admin Loket via WA</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs - Horizontal Scrollable di Mobile agar tidak bertumpuk berantakan */}
      <div className="space-y-3 bg-slate-100/70 p-3.5 sm:p-4 rounded-2xl border border-slate-200">
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Pilih Bidang Terapi:
          </label>
          <div className="flex gap-1.5 overflow-x-auto pb-1.5 no-scrollbar -mx-1 px-1">
            {[
              { id: 'all', label: 'Semua Bidang' },
              { id: 'terapis_perilaku', label: 'Terapis Perilaku (ABA)' },
              { id: 'fisioterapis', label: 'Fisioterapi' },
              { id: 'tenaga_plb', label: 'Tenaga PLB' },
              { id: 'psikolog', label: 'Psikolog (Via Admin)' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedSpesialisasi(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 whitespace-nowrap ${selectedSpesialisasi === tab.id ? 'bg-teal-800 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-200'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {uniqueDates.length > 0 && (
          <div className="pt-2 border-t border-slate-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Pilih Tanggal (Hari H & Sisa Hari Aktif Pekan Ini):
              </label>
              <span className="text-[10px] text-teal-800 font-semibold bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full w-fit">
                {minAllowedDate} s/d {maxAllowedDate} (Tanggal lampau tidak ditampilkan)
              </span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1.5 no-scrollbar -mx-1 px-1">
              <button
                onClick={() => setSelectedDateFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 whitespace-nowrap ${selectedDateFilter === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-200'}`}
              >
                Semua Hari Aktif ({uniqueDates.length})
              </button>
              {uniqueDates.map(date => {
                const isToday = date === todayWIB.dateStr;
                return (
                  <button
                    key={date}
                    onClick={() => setSelectedDateFilter(date)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold font-mono transition-all shrink-0 whitespace-nowrap flex items-center gap-1 ${selectedDateFilter === date ? 'bg-teal-900 text-white shadow-sm font-bold' : 'bg-white text-slate-700 hover:bg-slate-200'}`}
                  >
                    <span>{date}</span>
                    {isToday && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black">
                        Hari H
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Slots List dengan Nama-Nama Peserta Terjadwal */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>Menampilkan <strong>{filteredSlots.length}</strong> slot terapi aktif ({minAllowedDate} s/d {maxAllowedDate})</span>
          <span>Jadwal Resmi: Senin – Jumat 09.00 – 13.00 WIB</span>
        </div>

        {filteredSlots.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center font-bold">
              ∅
            </div>
            <h3 className="font-bold text-slate-900">Belum Ada Slot yang Sesuai Filter</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Tidak ditemukan jadwal pada kriteria yang Anda pilih. Silakan ubah pilihan bidang terapi atau tanggal.
            </p>
            <button
              onClick={() => { setSelectedSpesialisasi('all'); setSelectedDateFilter('all'); }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSlots.map(slot => {
              const terapis = getTerapis(slot.terapisId);
              const bookedStudents = getBookedStudentsForSlot(slot);
              const isFull = bookedStudents.length >= slot.kuotaMaksimal;
              const sisaKuota = Math.max(0, slot.kuotaMaksimal - bookedStudents.length);
              const isPsikolog = slot.spesialisasi === 'psikolog';
              const deadline = checkBatasPendaftaranHMinus1(slot.tanggal);

              // Check weekly limit for current participant
              const slotWeek = getWeekBounds(slot.tanggal);
              const existingBookingInWeek = activePeserta
                ? activeBookings.find(b => getWeekBounds(b.tanggal).monday === slotWeek.monday)
                : undefined;

              // Check student assigned therapist (Aturan 2)
              const isAssignedToThisTerapis = activePeserta?.assignedTerapisId === slot.terapisId;
              const isAssignedToOtherTerapis = !!activePeserta?.assignedTerapisId && !isAssignedToThisTerapis;
              const isUnassigned = !!activePeserta && !activePeserta.assignedTerapisId;

              return (
                <div
                  key={slot.id}
                  className={`bg-white rounded-3xl p-5 border transition-all flex flex-col justify-between ${
                    !deadline.bisaDaftar
                      ? 'border-rose-200 bg-rose-50/20'
                      : isPsikolog 
                        ? 'border-indigo-200 bg-gradient-to-b from-indigo-50/20 to-white shadow-sm' 
                        : isFull 
                          ? 'border-slate-200 bg-slate-50/40' 
                          : 'border-slate-200 shadow-sm hover:border-teal-500'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[11px] font-bold tracking-wide uppercase ${isPsikolog ? 'text-indigo-800' : 'text-teal-800'}`}>
                            {getSpesialisasiLabel(slot.spesialisasi)}
                          </span>
                          {isPsikolog && (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-900 text-[10px] font-extrabold">
                              Via Admin
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-slate-900 text-base mt-0.5">
                          {terapis?.nama || 'Tenaga Ahli ULD'}
                        </h3>
                      </div>

                      <div className="text-right shrink-0">
                        {!deadline.bisaDaftar ? (
                          <span className="text-[11px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded border border-rose-300">
                            ⛔ {deadline.labelBatas}
                          </span>
                        ) : isPsikolog ? (
                          <span className="text-[11px] font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            Loket Admin
                          </span>
                        ) : isFull ? (
                          <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2.5 py-0.5 rounded">
                            Penuh
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded">
                            Tersedia ({sisaKuota} Pasien)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-2 font-medium text-slate-900">
                        <svg className="w-4 h-4 text-teal-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{slot.tanggal} · {slot.jamMulai} - {slot.jamSelesai} WIB</span>
                      </div>

                      <div className="text-slate-500">
                        Ruang: <span className="text-slate-800 font-medium">{slot.ruang}</span>
                      </div>

                      {slot.catatanTerapis && (
                        <div className="p-2 rounded-xl bg-teal-50/50 text-[11px] text-teal-900 border border-teal-100/70">
                          <strong className="text-teal-950">Catatan:</strong> {slot.catatanTerapis}
                        </div>
                      )}

                      {/* Notifikasi Batas H-1 Jam 24.00 WIB (Aturan 3) */}
                      {!deadline.bisaDaftar && (
                        <div className="p-2 rounded-xl bg-rose-50 text-[11px] text-rose-900 border border-rose-200 flex items-center gap-1.5">
                          <span>⛔</span>
                          <span><strong>Pendaftaran Ditutup:</strong> Sesuai batas operasional ULD, pendaftaran minimal H-1 hari maks jam 24.00 WIB.</span>
                        </div>
                      )}

                      {/* Status Penetapan Terapis Siswa (Aturan 2) */}
                      {activePeserta && (
                        <>
                          {isAssignedToThisTerapis ? (
                            <div className="p-2 rounded-xl bg-teal-50 text-[11px] text-teal-950 font-bold border border-teal-200 flex items-center gap-1.5">
                              <span>📌</span>
                              <span>Tenaga Ahli Pembina Tetap Ananda (Memenuhi Syarat Penugasan)</span>
                            </div>
                          ) : isAssignedToOtherTerapis ? (
                            <div className="p-2 rounded-xl bg-slate-100 text-[11px] text-slate-700 border border-slate-200 flex items-center gap-1.5">
                              <span>🔒</span>
                              <span>Khusus siswa terapis ini. Ananda dibina oleh: <strong>{activePeserta.assignedTerapisNama}</strong></span>
                            </div>
                          ) : (
                            <div className="p-2 rounded-xl bg-amber-50 text-[11px] text-amber-900 border border-amber-200 flex items-center gap-1.5">
                              <span>⏳</span>
                              <span>Ananda belum di-assign ke terapis pembina tetap.</span>
                            </div>
                          )}
                        </>
                      )}

                      {/* Notifikasi Batas Mingguan */}
                      {existingBookingInWeek && !isPsikolog && (
                        <div className="p-2 rounded-xl bg-amber-50 text-[11px] text-amber-900 border border-amber-200 flex items-center gap-1.5">
                          <span>⚠️</span>
                          <span>Ananda sudah terjadwal di pekan ini ({existingBookingInWeek.tanggal}). Kuota maks 1x/minggu.</span>
                        </div>
                      )}
                    </div>

                    {/* FITUR 1: DAFTAR NAMA PESERTA YANG TERJADWAL DI HARI INI */}
                    <div className="mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <span>👥</span>
                          <span>Peserta Terdaftar di Jam Ini:</span>
                        </span>
                        <span className="font-mono text-teal-800 text-[11px]">
                          {bookedStudents.length} / {slot.kuotaMaksimal} Terisi
                        </span>
                      </div>

                      {bookedStudents.length === 0 ? (
                        <div className="text-[11px] text-slate-400 italic">
                          Belum ada peserta yang mendaftar di slot jam ini.
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {bookedStudents.map((st, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-teal-100/90 text-teal-950 font-bold text-xs border border-teal-200 shadow-xs"
                            >
                              <span>🧒</span>
                              <span>{st.nama}</span>
                              {st.asalSekolah && (
                                <span className="text-[10px] font-normal text-teal-700">({st.asalSekolah})</span>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="text-[11px] text-slate-400">
                      Maks: {slot.kuotaMaksimal} peserta
                    </div>

                    {!deadline.bisaDaftar ? (
                      <span className="w-full sm:w-auto text-center px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 cursor-not-allowed">
                        ⛔ Ditutup (Batas H-1)
                      </span>
                    ) : isFull ? (
                      <span className="w-full sm:w-auto text-center px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
                        Slot Penuh ({bookedStudents.length} Peserta)
                      </span>
                    ) : isPsikolog ? (
                      <button
                        onClick={() => setPsikologNoticeModal(slot)}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-800 hover:bg-indigo-700 text-white shadow-sm flex items-center justify-center gap-1.5 transition-all transform active:scale-95"
                      >
                        <span>🧠 Daftar via Admin</span>
                        <span>→</span>
                      </button>
                    ) : activePeserta ? (
                      isAssignedToThisTerapis ? (
                        <button
                          onClick={() => handleOpenBooking(slot)}
                          className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-800 hover:bg-teal-700 text-white shadow-sm flex items-center justify-center gap-1.5 transition-all transform active:scale-95"
                        >
                          <span>✓ Daftar Sesi Ini</span>
                          <span>→</span>
                        </button>
                      ) : isAssignedToOtherTerapis ? (
                        <button
                          disabled
                          className="w-full sm:w-auto text-center px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                          title={`Ananda hanya dapat mendaftar ke ${activePeserta.assignedTerapisNama}`}
                        >
                          <span>🔒 Khusus Siswa Terapis Ini</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => alert(`Pendaftaran belum dapat diproses. Ananda ${activePeserta.namaLengkap} belum ditetapkan ke Tenaga Ahli / Terapis pembina tetap. Silakan hubungi terapis atau petugas loket ULD.`)}
                          className="w-full sm:w-auto text-center px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition-colors"
                        >
                          <span>⏳ Belum Di-assign</span>
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => setShowContactAdminModal(true)}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-800 hover:bg-teal-700 text-white shadow-sm flex items-center justify-center gap-1.5 transition-all transform active:scale-95"
                      >
                        <span>🏥 Daftar di Loket ULD</span>
                        <span>→</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Kontak Admin (WhatsApp Langsung ke Admin 1 & Admin 2) */}
      {(showContactAdminModal || psikologNoticeModal) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 shadow-2xl border-2 border-emerald-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💬</span>
                <h3 className="font-extrabold text-slate-900 text-base">
                  {psikologNoticeModal ? 'Pendaftaran Jadwal Psikolog via Admin' : 'Hubungi Petugas Admin ULD'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowContactAdminModal(false);
                  setPsikologNoticeModal(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {psikologNoticeModal ? (
                <span>
                  Sesuai ketentuan ULD Kota Probolinggo, pendaftaran ke <strong>Psikolog (Muhammad Ikhsan, M.Psi., Psikolog)</strong> hanya dapat dilakukan melalui <strong>Admin 1 (Sugeng)</strong> atau <strong>Admin 2 (Helmi)</strong> di loket ULD. Silakan klik kontak WhatsApp di bawah:
                </span>
              ) : (
                <span>
                  Untuk pendaftaran asesmen baru, penjadwalan psikolog, atau pertanyaan seputar terapi, silakan hubungi langsung petugas loket kami melalui WhatsApp:
                </span>
              )}
            </p>

            {/* Tombol WhatsApp Langsung ke Admin 1 & Admin 2 */}
            <div className="space-y-3">
              {ADMIN_CONTACTS.map(adm => (
                <div 
                  key={adm.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/80 hover:bg-emerald-50/40 hover:border-emerald-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-sm">{adm.nama}</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                        {adm.role}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      WA: <strong className="text-slate-700">{adm.waFormatted}</strong> ({adm.waNumber})
                    </div>
                  </div>

                  <a
                    href={adm.waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow transition-all flex items-center justify-center gap-2 shrink-0 active:scale-95"
                  >
                    <span>💬 Chat WA {adm.nama}</span>
                    <span>→</span>
                  </a>
                </div>
              ))}
            </div>

            <div className="p-3 bg-teal-50/80 rounded-2xl border border-teal-200 text-[11px] text-teal-900 space-y-1">
              <div>📍 <strong>Loket Fisik Kantor ULD:</strong></div>
              <div>Jl. Panglima Sudirman No. 19, Kec. Kanigaran, Kota Probolinggo (Senin – Jumat 09.00 – 13.00 WIB).</div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowContactAdminModal(false);
                  setPsikologNoticeModal(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-700"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Peringatan Batas Mingguan */}
      {weeklyLimitNoticeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 shadow-2xl border-2 border-amber-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Batas Pendaftaran Terapi Mingguan
                </h3>
              </div>
              <button
                onClick={() => setWeeklyLimitNoticeModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2 text-xs text-amber-950">
              <div className="font-extrabold text-sm text-amber-900">
                Maksimal 1 Kali Pendaftaran dalam Seminggu
              </div>
              <p className="leading-relaxed">
                Sesuai dengan ketentuan operasional ULD Kota Probolinggo, setiap siswa terdaftar hanya dapat mendaftar <strong>maksimal 1 kali dalam 1 minggu</strong> (pekan kalender yang sama) agar seluruh anak disabilitas mendapatkan kuota layanan secara adil dan merata.
              </p>
            </div>

            {currentPeserta && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="text-slate-500">Jadwal aktif ananda pada pekan ini:</div>
                <div className="font-bold text-slate-900 text-sm">{currentPeserta.namaLengkap}</div>
                <div className="text-teal-900 font-semibold">
                  📅 Tanggal: {weeklyLimitNoticeModal.existingTanggal} (Pukul {weeklyLimitNoticeModal.existingJam} WIB)
                </div>
                <div className="text-slate-500 text-[11px] pt-1">
                  💡 Solusi: Anda dapat memilih slot jadwal pada <strong>pekan berikutnya</strong>, atau jika ingin mengubah jadwal, silakan batalkan jadwal sebelumnya terlebih dahulu di Portal Peserta.
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setWeeklyLimitNoticeModal(null);
                  navigateTo('/portal-peserta');
                }}
                className="px-4 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white text-xs font-bold shadow"
              >
                Lihat Jadwal Saya di Portal Peserta
              </button>

              <button
                type="button"
                onClick={() => setWeeklyLimitNoticeModal(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Pendaftaran */}
      {bookingSlotModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                Konfirmasi Pendaftaran Jadwal Terapi
              </h3>
              <button
                onClick={() => setBookingSlotModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-200">
                {errorMsg}
              </div>
            )}

            <div className="p-4 rounded-2xl bg-teal-50/80 border border-teal-200 space-y-2 text-xs">
              <div className="font-bold text-teal-950 text-sm">
                {getSpesialisasiLabel(bookingSlotModal.spesialisasi)}
              </div>
              <div className="text-teal-900">
                Terapis: <strong>{getTerapis(bookingSlotModal.terapisId)?.nama}</strong>
              </div>
              <div className="text-teal-900">
                Jadwal: <strong>{bookingSlotModal.tanggal}</strong> pukul <strong>{bookingSlotModal.jamMulai} - {bookingSlotModal.jamSelesai} WIB</strong>
              </div>
              <div className="text-teal-800">
                Ruangan: {bookingSlotModal.ruang}
              </div>
            </div>

            {currentPeserta && (
              <div className="text-xs space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="text-slate-500">Pasien yang didaftarkan:</div>
                <div className="font-bold text-slate-900">{currentPeserta.namaLengkap}</div>
                <div className="text-[11px] text-slate-500 font-mono">RM: {currentPeserta.nomorRekamMedis}</div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Keluhan / Catatan Khusus untuk Terapis (Opsional):
              </label>
              <textarea
                rows={3}
                value={keluhanFokus}
                onChange={e => setKeluhanFokus(e.target.value)}
                placeholder="Contoh: Beberapa hari ini anak sedang sulit tidur dan mudah lelah saat latihan fisik..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setBookingSlotModal(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmBooking}
                className="px-6 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white text-xs font-bold shadow-md disabled:opacity-50"
              >
                {isSubmitting ? 'Memproses...' : 'Ya, Daftarkan Jadwal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
