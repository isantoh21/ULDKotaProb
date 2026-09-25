import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { db, getWeekBounds, checkBatasPendaftaranHMinus1, getWIBDate } from '../services/supabase';
import { navigateTo } from '../services/router';
import { SlotHarian, TerapisSpesialisasi, Peserta, BookingTerapi } from '../types';

interface Props {
  currentPeserta?: Peserta;
}

export const DaftarJadwal: React.FC<Props> = ({ currentPeserta }) => {
  const [selectedSpesialisasi, setSelectedSpesialisasi] = useState<string>('');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');
  const [bookingSlotModal, setBookingSlotModal] = useState<SlotHarian | null>(null);
  const [psikologNoticeModal, setPsikologNoticeModal] = useState<SlotHarian | null>(null);
  const [weeklyLimitNoticeModal, setWeeklyLimitNoticeModal] = useState<{ slot: SlotHarian; existingTanggal: string; existingJam: string } | null>(null);
  const [showContactAdminModal, setShowContactAdminModal] = useState<boolean>(false);
  const [showDaftarChoiceModal, setShowDaftarChoiceModal] = useState<SlotHarian | null>(null);
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

  // Hitung Jumat dari Senin minggu ini (tidak tergantung bulan, otomatis cross-month)
  const fridayDate = new Date(mondayDate);
  fridayDate.setDate(mondayDate.getDate() + 4);
  const currentWeekFriday = fridayDate.toISOString().split('T')[0];

  // Tentukan rentang tanggal yang ditampilkan
  let minAllowedDate = todayWIB.dateStr;
  let maxAllowedDate = currentWeekFriday;

  // Jika hari ini weekend (Sabtu/Minggu), tampilkan pekan berikutnya
  if (todayWIB.dateStr > currentWeekFriday) {
    const nextMonday = new Date(mondayDate);
    nextMonday.setDate(mondayDate.getDate() + 7);
    const nextFriday = new Date(nextMonday);
    nextFriday.setDate(nextMonday.getDate() + 4);
    minAllowedDate = nextMonday.toISOString().split('T')[0];
    maxAllowedDate = nextFriday.toISOString().split('T')[0];
  }

  // Filter slots publik: Hari H s/d Jumat minggu yang sama (lintas bulan otomatis tercakup)
  const activePublicSlots = slotsList.filter(slot => {
    return slot.tanggal >= minAllowedDate && slot.tanggal <= maxAllowedDate;
  });

  // Spesialisasi yang tersedia dari slot aktif
  const uniqueSpesialisasi = Array.from(new Set(activePublicSlots.map(s => s.spesialisasi))).sort();

  // Auto-select spesialisasi pertama jika belum ada pilihan
  const effectiveSpesialisasi = selectedSpesialisasi || uniqueSpesialisasi[0] || '';

  // Extract unique dates yang tersedia
  const uniqueDates = Array.from(new Set(activePublicSlots.map(s => s.tanggal))).sort();

  // Auto-select tanggal pertama jika belum ada pilihan
  const effectiveDateFilter = selectedDateFilter || uniqueDates[0] || '';

  const filteredSlots = activePublicSlots.filter(slot => {
    if (effectiveSpesialisasi && slot.spesialisasi !== effectiveSpesialisasi) return false;
    if (effectiveDateFilter && slot.tanggal !== effectiveDateFilter) return false;
    return true;
  });

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
    if (matching.length > 0) {
      return matching.map(b => {
        const p = pesertaList.find(x => x.id === b.pesertaId || (b.nomorRekamMedis && x.nomorRekamMedis === b.nomorRekamMedis));
        return {
          id: b.id,
          pesertaId: b.pesertaId,
          nama: p ? p.namaLengkap : (b.namaPeserta || (b as any).namaSiswa || 'Siswa Terdaftar'),
          nomorRekamMedis: p?.nomorRekamMedis || b.nomorRekamMedis,
          asalSekolah: p?.asalSekolah || b.asalSekolah,
          namaWali: p?.namaWali,
          status: b.status,
          kodeBooking: b.kodeBooking
        };
      });
    }

    // Fallback jika kuotaTerisi > 0 tapi matching allBookings belum termuat
    if (slot.kuotaTerisi > 0) {
      if (slot.id === 'slot-1') {
        const p = pesertaList.find(x => x.id === 'peserta-01');
        return [{
          id: 'booking-init-1',
          pesertaId: 'peserta-01',
          nama: p ? p.namaLengkap : 'Abimanyu Tri Yoga',
          nomorRekamMedis: p?.nomorRekamMedis || 'ULD-PROB-2026-0001',
          asalSekolah: p?.asalSekolah || 'TK Dharma Wanita 1',
          namaWali: p?.namaWali || 'Bambang Triyono',
          status: 'terjadwal',
          kodeBooking: 'TRP-2026-081'
        }];
      }
      if (slot.id === 'slot-3') {
        const p = pesertaList.find(x => x.id === 'peserta-19' || x.id === 'peserta-03');
        return [{
          id: 'booking-init-2',
          pesertaId: 'peserta-19',
          nama: p ? p.namaLengkap : 'Hana Aish Salma Adzra',
          nomorRekamMedis: p?.nomorRekamMedis || 'ULD-PROB-2026-0019',
          asalSekolah: p?.asalSekolah || 'PAUD Terpadu Kasih Ibu',
          namaWali: p?.namaWali || 'Wali Siswa',
          status: 'terjadwal',
          kodeBooking: 'TRP-2026-082'
        }];
      }
      return [{
        id: `booking-${slot.id}`,
        pesertaId: '',
        nama: 'Siswa Terdaftar',
        nomorRekamMedis: undefined,
        asalSekolah: undefined,
        namaWali: undefined,
        status: 'terjadwal',
        kodeBooking: undefined
      }];
    }

    return [];
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header Banner - Terbuka untuk Umum */}
      <div className="bg-white rounded-3xl p-4 sm:p-7 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-700 uppercase tracking-wider">
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
          <div className="p-3.5 sm:p-4 rounded-2xl bg-sky-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm border border-sky-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-700 flex items-center justify-center text-xl shrink-0">
                🧒
              </div>
              <div>
                <div className="text-[10px] text-sky-200 font-bold uppercase tracking-wider">
                  Akun Siswa Terverifikasi · No. RM: {activePeserta.nomorRekamMedis}
                </div>
                <div className="text-base font-extrabold text-white">
                  {activePeserta.namaLengkap}
                </div>
                <div className="text-xs text-sky-100">
                  Wali: {activePeserta.namaWali} ({activePeserta.asalSekolah || 'Kota Probolinggo'})
                </div>
              </div>
            </div>

            <div className="shrink-0 self-start sm:self-auto">
              {activePeserta.assignedTerapisId ? (
                <div className="bg-sky-800 border border-sky-600 px-3.5 py-2 rounded-xl text-left sm:text-right">
                  <div className="text-[10px] text-sky-200 font-bold uppercase tracking-wider">Tenaga Ahli Pembina Tetap:</div>
                  <div className="font-extrabold text-amber-300 text-xs mt-0.5">
                    📌 {activePeserta.assignedTerapisNama}
                  </div>
                  <div className="text-[10px] text-sky-100">Hanya dapat mendaftar ke sesi beliau</div>
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

        {/* Ketentuan Singkat */}
        <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-semibold border border-amber-200">📅 Maks 1x/minggu</span>
          <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-900 font-semibold border border-rose-200">⏰ Daftar paling lambat H-1 jam 24.00</span>
          <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-800 font-semibold border border-sky-100">📌 Siswa binaan hanya ke terapis tetapnya</span>
          <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-900 font-semibold border border-indigo-200">🧠 Psikolog hanya via Admin</span>
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
              { id: 'terapis_perilaku', label: 'Terapis Perilaku (ABA)' },
              { id: 'fisioterapis', label: 'Fisioterapi' },
              { id: 'tenaga_plb', label: 'Tenaga PLB' },
              { id: 'psikolog', label: 'Psikolog (Via Admin)' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedSpesialisasi(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 whitespace-nowrap ${effectiveSpesialisasi === tab.id ? 'bg-sky-700 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-200'}`}
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
                Pilih Tanggal:
              </label>
              <span className="text-[10px] text-sky-700 font-semibold bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-full w-fit">
                Pekan {minAllowedDate} s/d {maxAllowedDate}
              </span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1.5 no-scrollbar -mx-1 px-1">
              {uniqueDates.map(date => {
                const isToday = date === todayWIB.dateStr;
                const isSelected = effectiveDateFilter === date;
                return (
                  <button
                    key={date}
                    onClick={() => setSelectedDateFilter(date)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold font-mono transition-all shrink-0 whitespace-nowrap flex items-center gap-1 ${isSelected ? 'bg-sky-800 text-white shadow-sm font-bold' : 'bg-white text-slate-700 hover:bg-slate-200'}`}
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

      {/* Slots List — dikelompokkan per Terapis */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>Menampilkan <strong>{filteredSlots.length}</strong> slot aktif · {effectiveDateFilter}</span>
          <span>Senin – Jumat 09.00 – 13.00 WIB</span>
        </div>

        {filteredSlots.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center font-bold">∅</div>
            <h3 className="font-bold text-slate-900">Belum Ada Slot yang Sesuai Filter</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Tidak ditemukan jadwal pada kriteria yang dipilih.</p>
            <button
              onClick={() => setSelectedSpesialisasi('')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700"
            >
              Reset Filter
            </button>
          </div>
        ) : (() => {
          // Kelompokkan slot per terapisId
          const groups: { terapisId: string; slots: SlotHarian[] }[] = [];
          filteredSlots.forEach(slot => {
            const g = groups.find(x => x.terapisId === slot.terapisId);
            if (g) g.slots.push(slot);
            else groups.push({ terapisId: slot.terapisId, slots: [slot] });
          });

          return (
            <div className="space-y-4">
              {groups.map(group => {
                const terapis = getTerapis(group.terapisId);
                const isPsikolog = group.slots[0]?.spesialisasi === 'psikolog';
                return (
                  <div
                    key={group.terapisId}
                    className={`bg-white rounded-3xl border shadow-sm overflow-hidden ${
                      isPsikolog ? 'border-indigo-200' : 'border-slate-200'
                    }`}
                  >
                    {/* Header Terapis */}
                    <div className={`px-5 py-4 flex items-center gap-3 ${
                      isPsikolog ? 'bg-indigo-50 border-b border-indigo-100' : 'bg-sky-50/60 border-b border-slate-100'
                    }`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                        isPsikolog ? 'bg-indigo-100' : 'bg-sky-50'
                      }`}>
                        {isPsikolog ? '🧠' : '🩺'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-[10px] font-bold uppercase tracking-wider ${
                          isPsikolog ? 'text-indigo-700' : 'text-sky-600'
                        }`}>
                          {getSpesialisasiLabel(group.slots[0].spesialisasi)}
                          {isPsikolog && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-indigo-200 text-indigo-900">Via Admin</span>}
                        </div>
                        <div className="font-extrabold text-slate-900 text-base">
                          {terapis?.nama || 'Tenaga Ahli ULD'}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                          isPsikolog ? 'bg-indigo-100 text-indigo-800' : 'bg-sky-50 text-sky-700'
                        }`}>
                          {group.slots.length} sesi
                        </span>
                      </div>
                    </div>

                    {/* List Jam per Tanggal */}
                    <div className="divide-y divide-slate-100">
                      {group.slots.map(slot => {
                        const bookedStudents = getBookedStudentsForSlot(slot);
                        const isFull = bookedStudents.length >= slot.kuotaMaksimal;
                        const sisaKuota = Math.max(0, slot.kuotaMaksimal - bookedStudents.length);
                        const deadline = checkBatasPendaftaranHMinus1(slot.tanggal);
                        const slotWeek = getWeekBounds(slot.tanggal);
                        const existingBookingInWeek = activePeserta
                          ? activeBookings.find(b => getWeekBounds(b.tanggal).monday === slotWeek.monday)
                          : undefined;
                        const isAssignedToThisTerapis = activePeserta?.assignedTerapisId === slot.terapisId;
                        const isAssignedToOtherTerapis = !!activePeserta?.assignedTerapisId && !isAssignedToThisTerapis;

                        const isBooked = bookedStudents.length > 0;
                        const isMyBooking = activePeserta && bookedStudents.some(st => 
                          st.pesertaId === activePeserta.id ||
                          (st.nomorRekamMedis && st.nomorRekamMedis === activePeserta.nomorRekamMedis) ||
                          st.nama.toLowerCase() === activePeserta.namaLengkap.toLowerCase()
                        );

                        return (
                          <div 
                            key={slot.id} 
                            className={`px-5 py-4 flex flex-col sm:flex-row sm:items-start gap-3 transition-colors ${
                              isMyBooking 
                                ? 'bg-sky-50/40 border-l-4 border-l-sky-600' 
                                : isBooked 
                                ? 'bg-amber-50/20 border-l-4 border-l-amber-500' 
                                : ''
                            }`}
                          >
                            {/* Info Jam & Keterangan */}
                            <div className="flex-1 space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-extrabold text-slate-900 text-sm">
                                  {slot.jamMulai} – {slot.jamSelesai} WIB
                                </span>
                                <span className="text-[11px] text-slate-500 font-mono">{slot.tanggal}</span>
                                {slot.tanggal === todayWIB.dateStr && (
                                  <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black">Hari H</span>
                                )}
                                {!deadline.bisaDaftar ? (
                                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">⛔ Ditutup</span>
                                ) : isBooked ? (
                                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold flex items-center gap-1 shadow-2xs">
                                    <span>🔒 Terisi</span>
                                    <span className="font-semibold text-amber-800">
                                      ({bookedStudents.length} Siswa)
                                    </span>
                                  </span>
                                ) : isFull ? (
                                  <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">Penuh</span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                    {sisaKuota} kuota tersisa
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                <span>📍 Ruang: {slot.ruang}</span>
                              </div>

                              {/* KOTAK INFORMASI SISWA TERDAFTAR (TAMPIL JELAS DAN MENONJOL) */}
                              {isBooked && (
                                <div className="mt-2.5 p-3 rounded-2xl bg-gradient-to-r from-amber-50/90 to-sky-50/60 border border-amber-200/90 shadow-2xs space-y-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 text-[11px] font-black text-amber-950 uppercase tracking-wider">
                                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                      <span>Siswa Terjadwal di Sesi Ini:</span>
                                    </div>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 font-mono">
                                      {bookedStudents.length} / {slot.kuotaMaksimal} Kuota
                                    </span>
                                  </div>

                                  <div className="space-y-1.5">
                                    {bookedStudents.map((st, idx) => {
                                      const isChildThis = activePeserta && (
                                        st.pesertaId === activePeserta.id ||
                                        (st.nomorRekamMedis && st.nomorRekamMedis === activePeserta.nomorRekamMedis) ||
                                        st.nama.toLowerCase() === activePeserta.namaLengkap.toLowerCase()
                                      );

                                      return (
                                        <div
                                          key={idx}
                                          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl border transition-all ${
                                            isChildThis
                                              ? 'bg-sky-50/95 border-sky-300 ring-1 ring-sky-300'
                                              : 'bg-white border-amber-200/70 shadow-2xs'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2.5 min-w-0">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base font-black shrink-0 ${
                                              isChildThis ? 'bg-sky-200 text-sky-900' : 'bg-amber-100 text-amber-900'
                                            }`}>
                                              🧒
                                            </div>
                                            <div className="min-w-0">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                                                  {st.nama}
                                                </span>
                                                {isChildThis && (
                                                  <span className="px-1.5 py-0.5 rounded-md bg-sky-700 text-white text-[9px] font-extrabold tracking-wide">
                                                    Ananda Anda
                                                  </span>
                                                )}
                                              </div>
                                              <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                                                {st.nomorRekamMedis && (
                                                  <span className="font-mono text-sky-800 font-bold bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200 text-[10px]">
                                                    RM: {st.nomorRekamMedis}
                                                  </span>
                                                )}
                                                {st.asalSekolah && (
                                                  <span className="font-medium text-slate-600">· {st.asalSekolah}</span>
                                                )}
                                                {st.namaWali && (
                                                  <span className="text-slate-400">· Wali: {st.namaWali}</span>
                                                )}
                                              </div>
                                            </div>
                                          </div>

                                          {st.kodeBooking && (
                                            <div className="shrink-0 self-start sm:self-auto">
                                              <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                                {st.kodeBooking}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {existingBookingInWeek && !isPsikolog && (
                                <div className="text-[10px] text-amber-700 font-medium pt-0.5">
                                  ⚠️ Sudah terjadwal di pekan ini ({existingBookingInWeek.tanggal})
                                </div>
                              )}
                            </div>

                            {/* Tombol / Status Aksi */}
                            <div className="shrink-0 self-start sm:self-center">
                              {!deadline.bisaDaftar ? (
                                <span className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200 cursor-not-allowed">
                                  Ditutup
                                </span>
                              ) : isBooked ? (
                                isMyBooking ? (
                                  <span className="px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-100 text-sky-900 border border-sky-300 shadow-2xs inline-flex items-center gap-1.5">
                                    <span>✓</span>
                                    <span>Jadwal Ananda</span>
                                  </span>
                                ) : (
                                  <span className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs inline-flex items-center gap-1.5">
                                    <span>🔒 Terisi</span>
                                    <span className="text-[11px] font-medium text-slate-600 max-w-[110px] truncate">
                                      ({bookedStudents[0].nama.split(' ')[0]})
                                    </span>
                                  </span>
                                )
                              ) : isFull ? (
                                <span className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200">
                                  Penuh
                                </span>
                              ) : isPsikolog ? (
                                <button
                                  onClick={() => setPsikologNoticeModal(slot)}
                                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-800 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
                                >
                                  🧠 Daftar via Admin
                                </button>
                              ) : activePeserta ? (
                                isAssignedToThisTerapis ? (
                                  <button
                                    onClick={() => handleOpenBooking(slot)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-700 hover:bg-sky-600 text-white shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
                                  >
                                    ✓ Daftar
                                  </button>
                                ) : isAssignedToOtherTerapis ? (
                                  <span className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed">
                                    🔒 Bukan Terapis Ananda
                                  </span>
                                ) : (
                                  <span className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-100 text-amber-700 border border-amber-300">
                                    ⏳ Belum Di-assign
                                  </span>
                                )
                              ) : (
                                <button
                                  onClick={() => setShowDaftarChoiceModal(slot)}
                                  className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-700 hover:bg-sky-600 text-white shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
                                >
                                  Daftar →
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Modal Pilih Tipe Pendaftar (Siswa Binaan / Siswa Baru) */}
      {showDaftarChoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border-2 border-sky-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">Pendaftaran Jadwal Terapi</div>
                <h3 className="font-extrabold text-slate-900 text-base mt-0.5">
                  {getTerapis(showDaftarChoiceModal.terapisId)?.nama} · {showDaftarChoiceModal.jamMulai}–{showDaftarChoiceModal.jamSelesai}
                </h3>
              </div>
              <button
                onClick={() => setShowDaftarChoiceModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">Anda ingin mendaftar sebagai:</p>

            <div className="space-y-3">
              {/* Pilihan 1: Siswa Binaan / Rutin */}
              <button
                onClick={() => {
                  setShowDaftarChoiceModal(null);
                  navigateTo('/login-peserta');
                }}
                className="w-full p-4 rounded-2xl border-2 border-sky-200 bg-sky-50 hover:bg-sky-50 text-left transition-all group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🎒</span>
                  <div>
                    <div className="font-extrabold text-sky-800 text-sm">Siswa Binaan / Rutin</div>
                    <div className="text-xs text-sky-600 mt-0.5">Sudah terdaftar di ULD dan punya PIN siswa. Login untuk mendaftar sesi ini langsung.</div>
                  </div>
                  <span className="ml-auto text-sky-500 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </button>

              {/* Pilihan 2: Siswa Baru */}
              <button
                onClick={() => {
                  setShowDaftarChoiceModal(null);
                  setShowContactAdminModal(true);
                }}
                className="w-full p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-all group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🆕</span>
                  <div>
                    <div className="font-extrabold text-slate-900 text-sm">Siswa Baru / Asesmen Perdana</div>
                    <div className="text-xs text-slate-600 mt-0.5">Belum pernah terapi di ULD atau ingin asesmen psikolog pertama kali. Perlu menghubungi admin dulu untuk penjadwalan.</div>
                  </div>
                  <span className="ml-auto text-slate-500 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowDaftarChoiceModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

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

            <div className="p-3 bg-sky-50/80 rounded-2xl border border-sky-100 text-[11px] text-sky-800 space-y-1">
              <div>📍 <strong>Loket Fisik Kantor ULD:</strong></div>
              <div>Jl. Hayam Wuruk No. 63, Mangunharjo, Kec. Mayangan, Kota Probolinggo (Senin – Jumat 09.00 – 13.00 WIB).</div>
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
                <div className="text-sky-800 font-semibold">
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
                className="px-4 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white text-xs font-bold shadow"
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

            <div className="p-4 rounded-2xl bg-sky-50/80 border border-sky-100 space-y-2 text-xs">
              <div className="font-bold text-sky-900 text-sm">
                {getSpesialisasiLabel(bookingSlotModal.spesialisasi)}
              </div>
              <div className="text-sky-800">
                Terapis: <strong>{getTerapis(bookingSlotModal.terapisId)?.nama}</strong>
              </div>
              <div className="text-sky-800">
                Jadwal: <strong>{bookingSlotModal.tanggal}</strong> pukul <strong>{bookingSlotModal.jamMulai} - {bookingSlotModal.jamSelesai} WIB</strong>
              </div>
              <div className="text-sky-700">
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
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-600"
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
                className="px-6 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white text-xs font-bold shadow-md disabled:opacity-50"
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
