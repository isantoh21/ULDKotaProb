import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  Peserta, 
  Terapis, 
  SlotHarian, 
  PengosonganJadwalRutin,
  BookingTerapi, 
  PendaftaranAsesmenGuest, 
  AdminUser,
  StatistikULD,
  LogAktivitas,
  KategoriAktivitas 
} from '../types';
import { 
  INITIAL_PESERTA, 
  INITIAL_TERAPIS, 
  INITIAL_ADMINS,
  INITIAL_SLOTS, 
  INITIAL_BOOKINGS, 
  INITIAL_ASESMEN_GUEST 
} from './initialData';

const STORAGE_KEYS = {
  PESERTA: 'uld_prob_peserta_v2',
  TERAPIS: 'uld_prob_terapis_v3',
  ADMINS: 'uld_prob_admins_v3',
  SLOTS: 'uld_prob_slots_v3',
  PENGOSONGAN_RUTIN: 'uld_prob_pengosongan_rutin_v1',
  BOOKINGS: 'uld_prob_bookings_v2',
  ASESMEN: 'uld_prob_asesmen_v1',
  LOGS: 'uld_prob_logs_v1',
  SUPABASE_URL: 'uld_prob_supabase_url',
  SUPABASE_KEY: 'uld_prob_supabase_key',
};

// Helper untuk mendapatkan tanggal dan jam saat ini dalam Waktu Indonesia Barat (WIB / UTC+7)
export function getWIBDate(): { dateStr: string; timeStr: string; fullStr: string; hour: number; minute: number } {
  const now = new Date();
  try {
    const formatterDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' });
    const dateStr = formatterDate.format(now); // 'YYYY-MM-DD'
    const formatterTime = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false });
    const timeParts = formatterTime.formatToParts(now);
    const hour = parseInt(timeParts.find(p => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(timeParts.find(p => p.type === 'minute')?.value || '0', 10);
    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} WIB`;
    return { dateStr, timeStr, fullStr: `${dateStr} ${timeStr}`, hour, minute };
  } catch {
    const wibOffset = 7 * 60;
    const localOffset = now.getTimezoneOffset();
    const wibTime = new Date(now.getTime() + (wibOffset + localOffset) * 60 * 1000);
    const dateStr = wibTime.toISOString().split('T')[0];
    const hour = wibTime.getHours();
    const minute = wibTime.getMinutes();
    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} WIB`;
    return { dateStr, timeStr, fullStr: `${dateStr} ${timeStr}`, hour, minute };
  }
}

// Helper Aturan 3: Pendaftaran terapi paling minimal dilakukan H-1 hari di maksimal jam 24.00 WIB
export function checkBatasPendaftaranHMinus1(slotTanggal: string): { 
  bisaDaftar: boolean; 
  pesan?: string;
  isHariH: boolean;
  isLewat: boolean;
  labelBatas: string;
} {
  const { dateStr } = getWIBDate();
  
  // Jika slotTanggal === dateStr, pendaftaran dilakukan di Hari H -> DITOLAK
  if (slotTanggal === dateStr) {
    return {
      bisaDaftar: false,
      isHariH: true,
      isLewat: true,
      labelBatas: 'Hari H (Ditutup)',
      pesan: `Pendaftaran ditutup! Sesuai ketentuan resmi operasional ULD Kota Probolinggo, pendaftaran sesi terapi paling minimal dilakukan H-1 hari di maksimal jam 24.00 WIB. Hari ini (${slotTanggal}) merupakan hari pelaksanaan (Hari H), sehingga pendaftaran tidak dapat diproses.`
    };
  }

  // Jika slotTanggal < dateStr, tanggal sesi telah berlalu -> DITOLAK
  if (slotTanggal < dateStr) {
    return {
      bisaDaftar: false,
      isHariH: false,
      isLewat: true,
      labelBatas: 'Tanggal Lewat (Ditutup)',
      pesan: `Pendaftaran ditutup! Jadwal terapi pada tanggal ${slotTanggal} sudah terlewati.`
    };
  }

  // slotTanggal > dateStr: tanggal adalah masa mendatang (minimal H-1 atau lebih awal sebelum jam 24.00 WIB) -> DITERIMA
  return {
    bisaDaftar: true,
    isHariH: false,
    isLewat: false,
    labelBatas: 'Buka (Memenuhi H-1)'
  };
}

// Helper untuk memformat objek Date menjadi format YYYY-MM-DD sesuai waktu lokal tanpa pergeseran timezone UTC
export function formatLocalDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Helper untuk menghitung batas pekan kalender kerja (Senin - Jumat)
export function getWeekBounds(dateStr: string): { monday: string; friday: string; sunday: string; label: string } {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    const day = d.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const mondayDate = new Date(d);
    mondayDate.setDate(d.getDate() + diffToMonday);

    const fridayDate = new Date(mondayDate);
    fridayDate.setDate(mondayDate.getDate() + 4);

    const sundayDate = new Date(mondayDate);
    sundayDate.setDate(mondayDate.getDate() + 6);

    const monday = formatLocalDate(mondayDate);
    const friday = formatLocalDate(fridayDate);
    const sunday = formatLocalDate(sundayDate);
    return {
      monday,
      friday,
      sunday,
      label: `${monday} s/d ${friday}` // Menampilkan batas hari kerja aktif Senin s/d Jumat
    };
  } catch {
    return { monday: dateStr, friday: dateStr, sunday: dateStr, label: dateStr };
  }
}

// 4 Sesi Reguler Layanan Terapi ULD Kota Probolinggo (Senin - Jumat, 09.00 - 13.00 WIB)
export const DEFAULT_TERAPI_SESSIONS = [
  { start: '09:00', end: '10:00', label: 'Sesi 1 (09.00 - 10.00 WIB)' },
  { start: '10:00', end: '11:00', label: 'Sesi 2 (10.00 - 11.00 WIB)' },
  { start: '11:00', end: '12:00', label: 'Sesi 3 (11.00 - 12.00 WIB)' },
  { start: '12:00', end: '13:00', label: 'Sesi 4 (12.00 - 13.00 WIB)' }
];

class SupabaseDataService {
  private client: SupabaseClient | null = null;
  private isSupabaseConnected = false;
  private autoSyncTimer: any = null;

  constructor() {
    this.initSupabaseClient();
    this.initLocalStorageIfEmpty();
  }

  private initSupabaseClient() {
    const savedUrl = localStorage.getItem(STORAGE_KEYS.SUPABASE_URL) || (import.meta as any).env?.VITE_SUPABASE_URL || '';
    const savedKey = localStorage.getItem(STORAGE_KEYS.SUPABASE_KEY) || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

    if (savedUrl && savedKey) {
      try {
        this.client = createClient(savedUrl, savedKey);
        this.isSupabaseConnected = true;
        // Background auto-sync on startup: tarik foto profil dan data terbaru dari cloud segera
        this.fetchWorkerPhotos().catch(() => {});
        setTimeout(() => {
          this.pullAllDataFromSupabase().catch(() => {});
        }, 500);
      } catch (err) {
        console.warn('Failed to initialize Supabase client, falling back to local store:', err);
        this.client = null;
        this.isSupabaseConnected = false;
      }
    }
  }

  // TARIK FOTO PROFIL TENAGA AHLI & ADMIN SECARA INSTAN DARI SUPABASE
  public async fetchWorkerPhotos(): Promise<{ terapis: Terapis[]; admins: AdminUser[]; updated: boolean }> {
    if (!this.client || !this.isSupabaseConnected) {
      return { terapis: this.getTerapisList(), admins: this.getAdminList(), updated: false };
    }
    try {
      const [{ data: terapisData, error: tErr }, { data: adminData, error: aErr }] = await Promise.all([
        this.client.from('terapis').select('id, foto_url'),
        this.client.from('admin_users').select('id, foto_url')
      ]);

      if (tErr) console.warn('Supabase fetch terapis photos error:', tErr);
      if (aErr) console.warn('Supabase fetch admin photos error:', aErr);

      let terapisChanged = false;
      const localTerapis = this.getTerapisList();
      if (terapisData && terapisData.length > 0) {
        terapisData.forEach((ct: any) => {
          if (ct.foto_url) {
            const idx = localTerapis.findIndex(t => t.id === ct.id);
            if (idx !== -1 && localTerapis[idx].fotoUrl !== ct.foto_url) {
              localTerapis[idx].fotoUrl = ct.foto_url;
              terapisChanged = true;
            }
          }
        });
        if (terapisChanged) {
          localStorage.setItem(STORAGE_KEYS.TERAPIS, JSON.stringify(localTerapis));
        }
      }

      let adminChanged = false;
      const localAdmins = this.getAdminList();
      if (adminData && adminData.length > 0) {
        adminData.forEach((ca: any) => {
          if (ca.foto_url) {
            const idx = localAdmins.findIndex(a => a.id === ca.id);
            if (idx !== -1 && localAdmins[idx].fotoUrl !== ca.foto_url) {
              localAdmins[idx].fotoUrl = ca.foto_url;
              adminChanged = true;
            }
          }
        });
        if (adminChanged) {
          localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(localAdmins));
        }
      }

      if (terapisChanged || adminChanged) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('uld_data_updated'));
        }
      }

      return {
        terapis: this.getTerapisList(),
        admins: this.getAdminList(),
        updated: terapisChanged || adminChanged
      };
    } catch (err) {
      console.warn('fetchWorkerPhotos error:', err);
      return { terapis: this.getTerapisList(), admins: this.getAdminList(), updated: false };
    }
  }

  // SINKRONISASI OTOMATIS SETIAP SAAT KE SUPABASE (FIRE-AND-FORGET BACKGROUND SYNC)
  public triggerAutoSync(delayMs = 500): void {
    if (!this.client || !this.isSupabaseConnected) return;
    if (this.autoSyncTimer) {
      clearTimeout(this.autoSyncTimer);
    }
    this.autoSyncTimer = setTimeout(() => {
      this.pushAllDataToSupabase().catch(err => {
        console.warn('Background auto-sync to Supabase notice:', err);
      });
    }, delayMs);
  }

  public getSupabaseStatus(): { isConnected: boolean; url: string; hasKey: boolean } {
    const url = localStorage.getItem(STORAGE_KEYS.SUPABASE_URL) || (import.meta as any).env?.VITE_SUPABASE_URL || '';
    const key = localStorage.getItem(STORAGE_KEYS.SUPABASE_KEY) || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
    return {
      isConnected: Boolean(this.client && url && key),
      url: url,
      hasKey: Boolean(key)
    };
  }

  public setSupabaseCredentials(url: string, key: string): boolean {
    if (!url || !key) {
      localStorage.removeItem(STORAGE_KEYS.SUPABASE_URL);
      localStorage.removeItem(STORAGE_KEYS.SUPABASE_KEY);
      this.client = null;
      this.isSupabaseConnected = false;
      return false;
    }

    try {
      localStorage.setItem(STORAGE_KEYS.SUPABASE_URL, url.trim());
      localStorage.setItem(STORAGE_KEYS.SUPABASE_KEY, key.trim());
      this.client = createClient(url.trim(), key.trim());
      this.isSupabaseConnected = true;
      return true;
    } catch (e) {
      console.error('Invalid Supabase configuration', e);
      return false;
    }
  }

  public async testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.client) {
      return { success: false, message: 'Klien Supabase belum diinisialisasi. Silakan masukkan Project URL dan Anon Key.' };
    }
    try {
      const { error } = await this.client.from('terapis').select('id').limit(1);
      if (error) {
        if (error.code === '42P01') {
          return {
            success: false,
            message: 'Terkoneksi ke Supabase, namun tabel belum dibuat! Silakan buka SQL Editor di Supabase lalu jalankan file supabase-schema.sql.'
          };
        }
        return { success: false, message: `Gagal mengakses Supabase: ${error.message}` };
      }
      return { success: true, message: 'Alhamdulillah, koneksi ke basis data Supabase berhasil dan aktif!' };
    } catch (err: any) {
      return { success: false, message: `Kesalahan koneksi: ${err.message || err}` };
    }
  }

  public async pushAllDataToSupabase(): Promise<{ success: boolean; message: string }> {
    if (!this.client) {
      return { success: false, message: 'Klien Supabase belum terhubung.' };
    }
    try {
      // 1. Terapis (Pertahankan foto yang sudah ada di cloud Supabase agar tidak tertimpa null jika perangkat belum unduh)
      const { data: cloudTerapis } = await this.client.from('terapis').select('id, foto_url');
      const localTerapis = this.getTerapisList();
      let terapisUpdatedLocally = false;
      const terapis = localTerapis.map(t => {
        const cloudItem = cloudTerapis?.find((x: any) => x.id === t.id);
        const resolvedFoto = t.fotoUrl || cloudItem?.foto_url || null;
        if (!t.fotoUrl && cloudItem?.foto_url) {
          t.fotoUrl = cloudItem.foto_url;
          terapisUpdatedLocally = true;
        }
        return {
          id: t.id,
          nip_or_id: t.nipOrId,
          nama: t.nama,
          gelar: t.gelar,
          spesialisasi: t.spesialisasi,
          spesialisasi_label: t.spesialisasiLabel,
          pin: t.pin,
          nomor_telepon: t.nomorTelepon,
          deskripsi: t.deskripsi,
          ruang_praktek: t.ruangPraktek,
          foto_url: resolvedFoto,
          is_active: t.isActive
        };
      });
      if (terapisUpdatedLocally) {
        localStorage.setItem(STORAGE_KEYS.TERAPIS, JSON.stringify(localTerapis));
      }
      await this.client.from('terapis').upsert(terapis);

      // 2. Admins (Pertahankan foto yang sudah ada di cloud Supabase)
      const { data: cloudAdmins } = await this.client.from('admin_users').select('id, foto_url');
      const localAdmins = this.getAdminList();
      let adminUpdatedLocally = false;
      const admins = localAdmins.map(a => {
        const cloudAdmin = cloudAdmins?.find((x: any) => x.id === a.id);
        const resolvedFoto = a.fotoUrl || cloudAdmin?.foto_url || null;
        if (!a.fotoUrl && cloudAdmin?.foto_url) {
          a.fotoUrl = cloudAdmin.foto_url;
          adminUpdatedLocally = true;
        }
        return {
          id: a.id,
          nama: a.nama,
          role_title: a.roleTitle,
          pin: a.pin,
          nomor_telepon: a.nomorTelepon,
          foto_url: resolvedFoto
        };
      });
      if (adminUpdatedLocally) {
        localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(localAdmins));
      }
      await this.client.from('admin_users').upsert(admins);

      // 3. Peserta
      const peserta = this.getPesertaList().map(p => {
        let catatan = p.catatanKhusus || '';
        if ((p.status === 'lulus' || p.status === 'selesai_program') && p.alasanLulus && !catatan.includes('[LULUS:')) {
          catatan = `[LULUS: ${p.alasanLulus}${p.diluluskanOleh ? ` | Diluluskan oleh: ${p.diluluskanOleh}` : ''}] ${catatan}`.trim();
        }
        return {
          id: p.id,
          nomor_rekam_medis: p.nomorRekamMedis,
          nama_lengkap: p.namaLengkap,
          pin: p.pin,
          tanggal_lahir: p.tanggalLahir,
          jenis_kelamin: p.jenisKelamin,
          nama_wali: p.namaWali,
          nomor_telepon: p.nomorTelepon,
          alamat: p.alamat,
          kecamatan: p.kecamatan,
          asal_sekolah: p.asalSekolah || null,
          ragam_disabilitas: p.ragamDisabilitas,
          status: p.status,
          terdaftar_sejak: p.terdaftarSejak,
          catatan_khusus: catatan || null,
          assigned_terapis_id: p.assignedTerapisId || null,
          assigned_terapis_nama: p.assignedTerapisNama || null,
          assigned_at: p.assignedAt || null
        };
      });
      await this.client.from('peserta').upsert(peserta);

      // 4. Slots
      // 4. Slots (Hanya hari kerja Senin - Jumat)
      const slots = this.getSlotsList()
        .filter(s => {
          try {
            const d = new Date(s.tanggal + 'T00:00:00');
            const day = d.getDay();
            return day !== 0 && day !== 6;
          } catch {
            return true;
          }
        })
        .map(s => ({
          id: s.id,
          terapis_id: s.terapisId,
          tanggal: s.tanggal,
          jam_mulai: s.jamMulai,
          jam_selesai: s.jamSelesai,
          spesialisasi: s.spesialisasi,
          ruang: s.ruang,
          kuota_maksimal: s.kuotaMaksimal,
          kuota_terisi: s.kuotaTerisi,
          catatan_terapis: s.catatanTerapis || null,
          status_slot: s.statusSlot
        }));
      const { error: sErr } = await this.client.from('slots_harian').upsert(slots);
      if (sErr) console.error('Error upserting slots to Supabase:', sErr);

      // 5. Bookings
      const bookings = this.getBookingsList().map(b => ({
        id: b.id,
        slot_id: b.slotId,
        peserta_id: b.pesertaId,
        terapis_id: b.terapisId,
        kode_booking: b.kodeBooking,
        tanggal: b.tanggal,
        jam_mulai: b.jamMulai,
        jam_selesai: b.jamSelesai,
        spesialisasi: b.spesialisasi,
        ruang: b.ruang,
        status: b.status,
        keluhan_hari_ini: b.keluhanHariIni || null,
        catatan_sesi_terapis: b.catatanSesiTerapis || null,
        asal_sekolah: b.asalSekolah || null,
        didaftarkan_oleh_admin: b.didaftarkanOlehAdmin || null,
        reschedule_count: b.rescheduleCount || 0
      }));
      const { error: bErr } = await this.client.from('booking_terapi').upsert(bookings);
      if (bErr) console.error('Error upserting bookings to Supabase:', bErr);

      // 6. Logs
      const logs = this.getAktivitasLogs().map(l => ({
        id: l.id,
        waktu: l.waktu,
        kategori: l.kategori,
        judul: l.judul,
        deskripsi: l.deskripsi,
        pelaku: l.pelaku,
        role_pelaku: l.rolePelaku || null,
        icon: l.icon || null
      }));
      await this.client.from('log_aktivitas').upsert(logs);

      // 7. Pendaftaran Asesmen Guest
      const asesmenList = this.getAsesmenGuestList().map(a => ({
        id: a.id,
        nomor_registrasi: a.nomorRegistrasi,
        nama_anak: a.namaAnak,
        tanggal_lahir: a.tanggalLahir,
        jenis_kelamin: a.jenisKelamin,
        nama_orang_tua: a.namaOrangTua,
        nik_anak_or_kk: a.nikAnakOrKK,
        nomor_whatsapp: a.nomorWhatsApp,
        alamat_domisili: a.alamatDomisili,
        kecamatan: a.kecamatan,
        jenjang_pendidikan: a.jenjangPendidikan || null,
        asal_sekolah: a.asalSekolah || null,
        nisn_or_npsn: a.nisnOrNpsn || null,
        sudah_terdaftar_dapodik: !!a.sudahTerdaftarDapodik,
        indikasi_awal: a.indikasiAwal,
        dokumen_akan_dibawa: a.dokumenAkanDibawa || [],
        tanggal_rencana_datang: a.tanggalRencanaDatang,
        jam_rencana_datang: a.jamRencanaDatang,
        status: a.status,
        peserta_id_dihasilkan: a.pesertaIdDihasilkan || null,
        pin_dihasilkan: a.pinDihasilkan || null,
        catatan_petugas: a.catatanPetugas || null,
        created_at: a.createdAt || new Date().toISOString()
      }));
      if (asesmenList.length > 0) {
        await this.client.from('pendaftaran_asesmen_guest').upsert(asesmenList);
      }

      // 8. Pengosongan Jadwal Rutin
      const pengosongan = this.getPengosonganRutinList().map(r => ({
        id: r.id,
        terapis_id: r.terapisId,
        hari: r.hari,
        hari_label: r.hariLabel,
        jam_mulai: r.jamMulai,
        jam_selesai: r.jamSelesai || null,
        label_sesi: r.labelSesi,
        alasan: r.alasan || null,
        created_at: r.createdAt
      }));
      if (pengosongan.length > 0) {
        await this.client.from('pengosongan_jadwal_rutin').upsert(pengosongan);
      }

      return { success: true, message: 'Seluruh data lokal berhasil diunggah (push) ke tabel Supabase!' };
    } catch (err: any) {
      return { success: false, message: `Gagal push data: ${err.message || err}` };
    }
  }

  public async pullAllDataFromSupabase(): Promise<{ success: boolean; message: string }> {
    if (!this.client) {
      return { success: false, message: 'Klien Supabase belum terhubung.' };
    }
    try {
      // 1. Terapis
      const { data: terapisData } = await this.client.from('terapis').select('*');
      if (terapisData && terapisData.length > 0) {
        const localList = this.getTerapisList();
        const mapped: Terapis[] = terapisData.map((t: any) => {
          const localItem = localList.find(e => e.id === t.id);
          return {
            id: t.id,
            nipOrId: t.nip_or_id,
            nama: (t.id === 'terapis-2' || (t.nama && t.nama.toLowerCase().includes('indaryati'))) ? 'Indaryati Machmudi, A.Md.Kes' : t.nama,
            gelar: (t.spesialisasi === 'psikolog' || t.id === 'terapis-4' || (t.gelar && t.gelar.toLowerCase().includes('klinis'))) ? 'Psikolog' : t.gelar,
            spesialisasi: t.spesialisasi,
            spesialisasiLabel: t.spesialisasi_label || t.spesialisasi,
            pin: t.pin,
            nomorTelepon: t.nomor_telepon,
            deskripsi: t.deskripsi,
            ruangPraktek: t.ruang_praktek,
            fotoUrl: t.foto_url || localItem?.fotoUrl,
            isActive: t.is_active
          };
        });
        localStorage.setItem(STORAGE_KEYS.TERAPIS, JSON.stringify(mapped));
      }

      // 2. Admins
      const { data: adminData } = await this.client.from('admin_users').select('*');
      if (adminData && adminData.length > 0) {
        const localAdmins = this.getAdminList();
        const mapped: AdminUser[] = adminData.map((a: any) => {
          const localAdmin = localAdmins.find(x => x.id === a.id);
          return {
            id: a.id,
            nama: a.nama,
            roleTitle: a.role_title,
            pin: a.pin,
            nomorTelepon: a.nomor_telepon,
            fotoUrl: a.foto_url || localAdmin?.fotoUrl
          };
        });
        localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(mapped));
      }

      // 3. Peserta
      const { data: pesertaData } = await this.client.from('peserta').select('*');
      if (pesertaData && pesertaData.length > 0) {
        const mapped: Peserta[] = pesertaData.map((p: any) => ({
          id: p.id,
          nomorRekamMedis: p.nomor_rekam_medis,
          namaLengkap: p.nama_lengkap || p.namaLengkap,
          pin: p.pin,
          tanggalLahir: p.tanggal_lahir,
          jenisKelamin: p.jenis_kelamin,
          namaWali: p.nama_wali,
          nomorTelepon: p.nomor_telepon,
          alamat: p.alamat,
          kecamatan: p.kecamatan,
          asalSekolah: p.asal_sekolah,
          ragamDisabilitas: p.ragam_disabilitas,
          status: p.status,
          terdaftarSejak: p.terdaftar_sejak,
          catatanKhusus: p.catatan_khusus,
          assignedTerapisId: p.assigned_terapis_id,
          assignedTerapisNama: (p.assigned_terapis_id === 'terapis-2' || (p.assigned_terapis_nama && p.assigned_terapis_nama.toLowerCase().includes('indaryati'))) ? 'Indaryati Machmudi, A.Md.Kes' : p.assigned_terapis_nama,
          assignedAt: p.assigned_at,
          lulusAt: p.lulus_at || ((p.status === 'lulus' || p.status === 'selesai_program') ? (p.catatan_khusus?.match(/\[LULUS:.*\]/) ? p.terdaftar_sejak : undefined) : undefined),
          alasanLulus: p.alasan_lulus || (p.catatan_khusus?.match(/\[LULUS:\s*([^|\]]+)/)?.[1]?.trim()),
          diluluskanOleh: p.diluluskan_oleh || (p.catatan_khusus?.match(/Diluluskan oleh:\s*([^\]]+)/)?.[1]?.trim())
        }));
        localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(mapped));
      }

      // 4. Slots (Hanya hari kerja Senin - Jumat)
      const { data: slotsData } = await this.client.from('slots_harian').select('*');
      if (slotsData && slotsData.length > 0) {
        const mapped: SlotHarian[] = slotsData
          .filter((s: any) => {
            try {
              const d = new Date(s.tanggal + 'T00:00:00');
              const day = d.getDay();
              return day !== 0 && day !== 6;
            } catch {
              return true;
            }
          })
          .map((s: any) => ({
            id: s.id,
            terapisId: s.terapis_id,
            tanggal: s.tanggal,
            jamMulai: s.jam_mulai,
            jamSelesai: s.jam_selesai,
            spesialisasi: s.spesialisasi,
            ruang: s.ruang,
            kuotaMaksimal: s.kuota_maksimal,
            kuotaTerisi: s.kuota_terisi,
            catatanTerapis: s.catatan_terapis,
            statusSlot: s.status_slot,
            createdAt: s.created_at || new Date().toISOString()
          }));
        localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(mapped));
      }

      // 5. Bookings (Penggabungan cloud + local agar pendaftaran lokal tidak terhapus)
      const { data: bookingsData } = await this.client.from('booking_terapi').select('*');
      if (bookingsData) {
        const mapped: BookingTerapi[] = bookingsData.map((b: any) => ({
          id: b.id,
          slotId: b.slot_id,
          pesertaId: b.peserta_id,
          terapisId: b.terapis_id,
          kodeBooking: b.kode_booking,
          tanggal: b.tanggal,
          jamMulai: b.jam_mulai,
          jamSelesai: b.jam_selesai,
          spesialisasi: b.spesialisasi,
          ruang: b.ruang,
          status: b.status,
          keluhanHariIni: b.keluhan_hari_ini,
          catatanSesiTerapis: b.catatan_sesi_terapis,
          asalSekolah: b.asal_sekolah || undefined,
          didaftarkanOlehAdmin: b.didaftarkan_oleh_admin,
          rescheduleCount: b.reschedule_count || 0,
          createdAt: b.created_at || new Date().toISOString()
        }));

        // Merge: pertahankan booking lokal yang belum tersinkronisasi ke cloud
        const localBookings = this.getBookingsList();
        const mergedBookingsMap = new Map<string, BookingTerapi>();
        mapped.forEach(b => mergedBookingsMap.set(b.id, b));
        localBookings.forEach(b => {
          if (!mergedBookingsMap.has(b.id)) {
            mergedBookingsMap.set(b.id, b);
          }
        });
        const mergedBookings = Array.from(mergedBookingsMap.values());
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(mergedBookings));

        // Sinkronkan kembali kuota slot agar presisi
        this.ensureAutoOpenWeekdaySlots();
      }

      // 6. Logs
      const { data: logsData } = await this.client.from('log_aktivitas').select('*').order('created_at', { ascending: false });
      if (logsData) {
        const mapped: LogAktivitas[] = logsData.map((l: any) => ({
          id: l.id,
          waktu: l.waktu,
          kategori: l.kategori,
          judul: l.judul,
          deskripsi: l.deskripsi,
          pelaku: l.pelaku,
          rolePelaku: l.role_pelaku,
          icon: l.icon
        }));
        localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(mapped));
      }

      // 7. Pendaftaran Asesmen Guest
      const { data: asesmenData } = await this.client.from('pendaftaran_asesmen_guest').select('*');
      if (asesmenData && asesmenData.length > 0) {
        const mapped: PendaftaranAsesmenGuest[] = asesmenData.map((a: any) => ({
          id: a.id,
          nomorRegistrasi: a.nomor_registrasi,
          namaAnak: a.nama_anak,
          tanggalLahir: a.tanggal_lahir,
          jenisKelamin: a.jenis_kelamin,
          namaOrangTua: a.nama_orang_tua,
          nikAnakOrKK: a.nik_anak_or_kk,
          nomorWhatsApp: a.nomor_whatsapp,
          alamatDomisili: a.alamatDomisili,
          kecamatan: a.kecamatan,
          jenjangPendidikan: a.jenjang_pendidikan || 'PAUD/TK',
          asalSekolah: a.asal_sekolah || '',
          nisnOrNpsn: a.nisn_or_npsn || '',
          sudahTerdaftarDapodik: !!a.sudah_terdaftar_dapodik,
          indikasiAwal: a.indikasi_awal,
          dokumenAkanDibawa: a.dokumen_akan_dibawa || [],
          tanggalRencanaDatang: a.tanggal_rencana_datang,
          jamRencanaDatang: a.jam_rencana_datang,
          status: a.status,
          pesertaIdDihasilkan: a.peserta_id_dihasilkan,
          pinDihasilkan: a.pin_dihasilkan,
          catatanPetugas: a.catatan_petugas,
          createdAt: a.created_at || new Date().toISOString()
        }));
        localStorage.setItem(STORAGE_KEYS.ASESMEN, JSON.stringify(mapped));
      }

      // 8. Pengosongan Jadwal Rutin
      const { data: pengosonganData } = await this.client.from('pengosongan_jadwal_rutin').select('*');
      if (pengosonganData && pengosonganData.length > 0) {
        const mapped: PengosonganJadwalRutin[] = pengosonganData.map((p: any) => ({
          id: p.id,
          terapisId: p.terapis_id,
          hari: p.hari,
          hariLabel: p.hari_label,
          jamMulai: p.jam_mulai,
          jamSelesai: p.jam_selesai || undefined,
          labelSesi: p.label_sesi,
          alasan: p.alasan || undefined,
          createdAt: p.created_at || new Date().toISOString()
        }));
        localStorage.setItem(STORAGE_KEYS.PENGOSONGAN_RUTIN, JSON.stringify(mapped));
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('uld_data_updated'));
        window.dispatchEvent(new CustomEvent('uld_log_updated'));
      }

      return { success: true, message: 'Alhamdulillah, data berhasil ditarik (pull) dari Supabase dan disinkronkan!' };
    } catch (err: any) {
      return { success: false, message: `Gagal pull data: ${err.message || err}` };
    }
  }

  private initLocalStorageIfEmpty() {
    const rawPeserta = localStorage.getItem(STORAGE_KEYS.PESERTA);
    if (!rawPeserta) {
      localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(INITIAL_PESERTA));
    } else {
      // Pastikan assignment terapis tersinkronisasi jika data lama belum memilikinya
      try {
        const parsed: Peserta[] = JSON.parse(rawPeserta);
        const hasAssignment = parsed.some(p => p.assignedTerapisId);
        if (!hasAssignment) {
          const updated = parsed.map(p => {
            const init = INITIAL_PESERTA.find(ip => ip.id === p.id);
            if (init && init.assignedTerapisId) {
              return { 
                ...p, 
                assignedTerapisId: init.assignedTerapisId, 
                assignedTerapisNama: init.assignedTerapisNama, 
                assignedAt: init.assignedAt 
              };
            }
            return p;
          });
          localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(updated));
        }
      } catch (e) {
        // ignore
      }
    }

    const rawTerapis = localStorage.getItem(STORAGE_KEYS.TERAPIS);
    if (!rawTerapis) {
      localStorage.setItem(STORAGE_KEYS.TERAPIS, JSON.stringify(INITIAL_TERAPIS));
    } else {
      try {
        const parsedT: Terapis[] = JSON.parse(rawTerapis);
        let updated = false;
        parsedT.forEach(t => {
          if (t.id === 'terapis-4' || t.spesialisasi === 'psikolog' || (t.gelar && t.gelar.toLowerCase().includes('klinis'))) {
            if (t.gelar !== 'Psikolog') {
              t.gelar = 'Psikolog';
              updated = true;
            }
          }
          if (t.id === 'terapis-2' || (t.nama && t.nama.toLowerCase().includes('indaryati'))) {
            if (t.nama !== 'Indaryati Machmudi, A.Md.Kes') {
              t.nama = 'Indaryati Machmudi, A.Md.Kes';
              updated = true;
            }
          }
        });
        if (updated) {
          localStorage.setItem(STORAGE_KEYS.TERAPIS, JSON.stringify(parsedT));
        }
      } catch {
        // ignore
      }
    }
    if (!localStorage.getItem(STORAGE_KEYS.ADMINS)) {
      localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(INITIAL_ADMINS));
    }

    const rawSlots = localStorage.getItem(STORAGE_KEYS.SLOTS);
    if (!rawSlots) {
      localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(INITIAL_SLOTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PENGOSONGAN_RUTIN)) {
      localStorage.setItem(STORAGE_KEYS.PENGOSONGAN_RUTIN, JSON.stringify([]));
    }
    // Pastikan seluruh sesi Senin - Jumat otomatis terbuka untuk setiap pekan
    this.ensureAutoOpenWeekdaySlots();

    if (!localStorage.getItem(STORAGE_KEYS.BOOKINGS)) {
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(INITIAL_BOOKINGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ASESMEN)) {
      localStorage.setItem(STORAGE_KEYS.ASESMEN, JSON.stringify(INITIAL_ASESMEN_GUEST));
    }
    if (!localStorage.getItem(STORAGE_KEYS.LOGS)) {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(this.generateInitialLogs()));
    }
  }

  public resetToSampleData(): void {
    localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(INITIAL_PESERTA));
    localStorage.setItem(STORAGE_KEYS.TERAPIS, JSON.stringify(INITIAL_TERAPIS));
    localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(INITIAL_ADMINS));
    localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(INITIAL_SLOTS));
    localStorage.setItem(STORAGE_KEYS.PENGOSONGAN_RUTIN, JSON.stringify([]));
    this.ensureAutoOpenWeekdaySlots();
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(INITIAL_BOOKINGS));
    localStorage.setItem(STORAGE_KEYS.ASESMEN, JSON.stringify(INITIAL_ASESMEN_GUEST));
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(this.generateInitialLogs()));
  }

  // --- ADMIN METHODS (Sugeng & Helmi) ---
  public getAdminList(): AdminUser[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ADMINS);
      const list: AdminUser[] = data ? JSON.parse(data) : INITIAL_ADMINS;
      // Pastikan nomor WhatsApp resmi selalu tersinkronisasi sesuai instruksi
      const sugeng = list.find(a => a.id === 'admin-1' || a.nama.toLowerCase().includes('sugeng'));
      if (sugeng) sugeng.nomorTelepon = '6285236028521';
      const helmi = list.find(a => a.id === 'admin-2' || a.nama.toLowerCase().includes('helmi'));
      if (helmi) helmi.nomorTelepon = '6282247952696';
      return list;
    } catch {
      return INITIAL_ADMINS;
    }
  }

  public loginAdmin(namaOrId: string, pin: string): { success: boolean; admin?: AdminUser; error?: string } {
    const list = this.getAdminList();
    const query = namaOrId.trim().toLowerCase();
    const cleanPin = pin.trim();

    const matched = list.find(a => {
      const matchName = a.nama.toLowerCase() === query || a.id.toLowerCase() === query || a.nama.toLowerCase().includes(query);
      const matchPin = a.pin === cleanPin;
      return matchName && matchPin;
    });

    if (matched) {
      return { success: true, admin: matched };
    }
    return { success: false, error: 'Nama Admin atau PIN tidak sesuai.' };
  }

  public gantiPinAdmin(adminId: string, pinBaru: string): boolean {
    const list = this.getAdminList();
    const idx = list.findIndex(a => a.id === adminId);
    if (idx !== -1) {
      list[idx].pin = pinBaru.trim();
      localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(list));

      this.catatAktivitas({
        kategori: 'keamanan_pin',
        judul: 'Pembaruan PIN Petugas Admin',
        deskripsi: `PIN login untuk Petugas Admin "${list[idx].nama}" berhasil diperbarui.`,
        pelaku: `Petugas Admin ${list[idx].nama}`,
        rolePelaku: 'admin',
        icon: '🔐'
      });

      if (this.client && this.isSupabaseConnected) {
        this.client.from('admin_users').update({ pin: pinBaru.trim() }).eq('id', adminId).then(({ error }) => {
          if (error) console.error('Supabase direct gantiPinAdmin error:', error);
        });
      }

      this.triggerAutoSync();
      return true;
    }
    return false;
  }

  public gantiPinTerapis(terapisId: string, pinBaru: string): boolean {
    const list = this.getTerapisList();
    const idx = list.findIndex(t => t.id === terapisId);
    if (idx !== -1) {
      list[idx].pin = pinBaru.trim();
      localStorage.setItem(STORAGE_KEYS.TERAPIS, JSON.stringify(list));

      this.catatAktivitas({
        kategori: 'keamanan_pin',
        judul: 'Pembaruan PIN Tenaga Ahli',
        deskripsi: `PIN login untuk Tenaga Ahli "${list[idx].nama}" (${list[idx].spesialisasiLabel}) berhasil diperbarui.`,
        pelaku: list[idx].nama,
        rolePelaku: 'terapis',
        icon: '🔐'
      });

      if (this.client && this.isSupabaseConnected) {
        this.client.from('terapis').update({ pin: pinBaru.trim() }).eq('id', terapisId).then(({ error }) => {
          if (error) console.error('Supabase direct gantiPinTerapis error:', error);
        });
      }

      this.triggerAutoSync();
      return true;
    }
    return false;
  }

  public updateFotoTerapis(terapisId: string, fotoUrl: string): boolean {
    const list = this.getTerapisList();
    const idx = list.findIndex(t => t.id === terapisId);
    if (idx !== -1) {
      list[idx].fotoUrl = fotoUrl;
      localStorage.setItem(STORAGE_KEYS.TERAPIS, JSON.stringify(list));

      this.catatAktivitas({
        kategori: 'sistem',
        judul: 'Pembaruan Foto Profil Tenaga Ahli',
        deskripsi: `Foto profil untuk Tenaga Ahli "${list[idx].nama}" (${list[idx].spesialisasiLabel}) berhasil diperbarui.`,
        pelaku: list[idx].nama,
        rolePelaku: 'terapis',
        icon: '📸'
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('uld_data_updated'));
      }

      // Update langsung dan aman ke database cloud Supabase
      if (this.client) {
        Promise.resolve(
          this.client
            .from('terapis')
            .update({ foto_url: fotoUrl })
            .eq('id', terapisId)
            .then(({ error }: any) => {
              if (error) console.warn('Supabase update foto_url error:', error.message);
            })
        ).catch(console.warn);
      }

      this.triggerAutoSync();
      return true;
    }
    return false;
  }

  public updateFotoAdmin(adminId: string, fotoUrl: string): boolean {
    const list = this.getAdminList();
    const idx = list.findIndex(a => a.id === adminId);
    if (idx !== -1) {
      list[idx].fotoUrl = fotoUrl;
      localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(list));

      this.catatAktivitas({
        kategori: 'sistem',
        judul: 'Pembaruan Foto Profil Petugas Admin',
        deskripsi: `Foto profil untuk Petugas Admin "${list[idx].nama}" berhasil diperbarui.`,
        pelaku: `Petugas Admin ${list[idx].nama}`,
        rolePelaku: 'admin',
        icon: '📸'
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('uld_data_updated'));
      }

      // Update langsung dan aman ke database cloud Supabase
      if (this.client) {
        Promise.resolve(
          this.client
            .from('admin_users')
            .update({ foto_url: fotoUrl })
            .eq('id', adminId)
            .then(({ error }: any) => {
              if (error) console.warn('Supabase update admin foto_url error:', error.message);
            })
        ).catch(console.warn);
      }

      this.triggerAutoSync();
      return true;
    }
    return false;
  }

  public gantiPinPeserta(pesertaId: string, pinBaru: string): boolean {
    return this.resetPinPeserta(pesertaId, pinBaru);
  }

  public toggleSlotStatus(slotId: string): boolean {
    const list = this.getSlotsList();
    const idx = list.findIndex(s => s.id === slotId);
    if (idx !== -1) {
      // Toggle antara 'tersedia' dan 'dibatalkan' (matikan / hidupkan sesi)
      if (list[idx].statusSlot === 'dibatalkan') {
        list[idx].statusSlot = list[idx].kuotaTerisi >= list[idx].kuotaMaksimal ? 'penuh' : 'tersedia';
      } else {
        list[idx].statusSlot = 'dibatalkan';
      }
      localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(list));

      const statusNow = list[idx].statusSlot;
      this.catatAktivitas({
        kategori: 'jadwal_slot',
        judul: statusNow === 'dibatalkan' ? 'Penutupan Slot Sesi Terapi' : 'Pembukaan Kembali Slot Sesi Terapi',
        deskripsi: `Sesi ${list[idx].jamMulai} - ${list[idx].jamSelesai} WIB (${list[idx].tanggal}) statusnya diubah menjadi "${statusNow}".`,
        pelaku: 'Tenaga Ahli / Petugas ULD',
        rolePelaku: 'terapis',
        icon: statusNow === 'dibatalkan' ? '🔒' : '🔓'
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('uld_data_updated'));
      }

      if (this.client && this.isSupabaseConnected) {
        this.client.from('slots_harian').update({
          status_slot: statusNow
        }).eq('id', slotId).then(({ error }) => {
          if (error) console.error('Supabase direct toggleSlotStatus error:', error);
        });
      }

      this.triggerAutoSync();
      return true;
    }
    return false;
  }

  public matikanSemuaSlotTanggal(terapisId: string, tanggal: string): boolean {
    const list = this.getSlotsList(tanggal);
    let changed = false;
    list.forEach(s => {
      if (s.terapisId === terapisId && s.tanggal === tanggal && s.statusSlot !== 'dibatalkan') {
        s.statusSlot = 'dibatalkan';
        changed = true;
      }
    });
    if (changed) {
      localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(list));
      this.catatAktivitas({
        kategori: 'jadwal_slot',
        judul: 'Penonaktifan Seluruh Sesi Tanggal',
        deskripsi: `Seluruh sesi terapi pada tanggal ${tanggal} dimatikan oleh Tenaga Ahli.`,
        pelaku: 'Tenaga Ahli ULD',
        rolePelaku: 'terapis',
        icon: '🛑'
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('uld_data_updated'));
      }

      if (this.client && this.isSupabaseConnected) {
        this.client.from('slots_harian')
          .update({ status_slot: 'dibatalkan' })
          .eq('terapis_id', terapisId)
          .eq('tanggal', tanggal)
          .then(({ error }) => {
            if (error) console.error('Supabase direct matikanSemuaSlotTanggal error:', error);
          });
      }

      this.triggerAutoSync();
    }
    return changed;
  }

  public hidupkanSemuaSlotTanggal(terapisId: string, tanggal: string): boolean {
    const list = this.getSlotsList(tanggal);
    const pengosonganRules = this.getPengosonganRutinByTerapis(terapisId);
    const dayNum = new Date(tanggal + 'T00:00:00').getDay();
    let changed = false;
    list.forEach(s => {
      if (s.terapisId === terapisId && s.tanggal === tanggal && s.statusSlot === 'dibatalkan') {
        const isBlockedPermanen = pengosonganRules.some(r =>
          (r.hari === -1 || r.hari === dayNum) &&
          (r.jamMulai === 'SEMUA' || r.jamMulai === s.jamMulai)
        );
        if (!isBlockedPermanen) {
          s.statusSlot = s.kuotaTerisi >= s.kuotaMaksimal ? 'penuh' : 'tersedia';
          changed = true;
        }
      }
    });
    if (changed) {
      localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(list));
      this.catatAktivitas({
        kategori: 'jadwal_slot',
        judul: 'Pengaktifan Kembali Seluruh Sesi Tanggal',
        deskripsi: `Seluruh sesi terapi pada tanggal ${tanggal} diaktifkan kembali oleh Tenaga Ahli (kecuali yang memiliki aturan pengosongan rutin).`,
        pelaku: 'Tenaga Ahli ULD',
        rolePelaku: 'terapis',
        icon: '🟢'
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('uld_data_updated'));
      }

      if (this.client && this.isSupabaseConnected) {
        const toUpdate = list.filter(s => s.terapisId === terapisId && s.tanggal === tanggal);
        for (const s of toUpdate) {
          this.client.from('slots_harian')
            .update({ status_slot: s.statusSlot })
            .eq('id', s.id)
            .then(({ error }) => {
              if (error) console.error('Supabase direct hidupkanSlot error:', error);
            });
        }
      }

      this.triggerAutoSync();
    }
    return changed;
  }

  // --- PENGOSONGAN JADWAL RUTIN (SEPANJANG MINGGU SELAMANYA SAMPAI DI-REVOKE) ---
  public getPengosonganRutinList(): PengosonganJadwalRutin[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PENGOSONGAN_RUTIN);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public getPengosonganRutinByTerapis(terapisId: string): PengosonganJadwalRutin[] {
    return this.getPengosonganRutinList().filter(r => r.terapisId === terapisId);
  }

  public tambahPengosonganRutin(data: {
    terapisId: string;
    hari: number;
    hariLabel: string;
    jamMulai: string;
    jamSelesai?: string;
    labelSesi: string;
    alasan?: string;
  }): { success: boolean; rule?: PengosonganJadwalRutin; message?: string } {
    const list = this.getPengosonganRutinList();

    // Cek apakah aturan identik sudah ada
    const duplicate = list.find(r =>
      r.terapisId === data.terapisId &&
      r.hari === data.hari &&
      r.jamMulai === data.jamMulai
    );
    if (duplicate) {
      return { 
        success: false, 
        message: `Aturan pengosongan untuk hari ${data.hariLabel} sesi ${data.labelSesi} sudah aktif sebelumnya.` 
      };
    }

    const newRule: PengosonganJadwalRutin = {
      id: `block-rutin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      terapisId: data.terapisId,
      hari: data.hari,
      hariLabel: data.hariLabel,
      jamMulai: data.jamMulai,
      jamSelesai: data.jamSelesai,
      labelSesi: data.labelSesi,
      alasan: data.alasan?.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    list.unshift(newRule);
    localStorage.setItem(STORAGE_KEYS.PENGOSONGAN_RUTIN, JSON.stringify(list));

    // Langsung terapkan pengosongan ke seluruh slot harian yang ada
    const slots = this.getSlotsList();
    let slotUpdatedCount = 0;
    slots.forEach(slot => {
      if (slot.terapisId === data.terapisId) {
        const slotDay = new Date(slot.tanggal + 'T00:00:00').getDay();
        const matchHari = data.hari === -1 ? (slotDay >= 1 && slotDay <= 5) : (slotDay === data.hari);
        const matchJam = data.jamMulai === 'SEMUA' || slot.jamMulai === data.jamMulai;
        if (matchHari && matchJam) {
          if (slot.kuotaTerisi === 0) {
            slot.statusSlot = 'dibatalkan';
            slot.catatanTerapis = data.alasan
              ? `Dikosongkan Rutin: ${data.alasan}`
              : 'Dikosongkan rutin setiap minggu sepanjang masa';
            slotUpdatedCount++;
          }
        }
      }
    });

    localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(slots));

    const terapis = this.getTerapisById(data.terapisId);
    this.catatAktivitas({
      kategori: 'jadwal_slot',
      judul: 'Pengosongan Rutin Jadwal Terapi',
      deskripsi: `${terapis?.nama || 'Tenaga Ahli'} mengosongkan jadwal rutin setiap hari ${data.hariLabel} sesi ${data.labelSesi} sepanjang minggu selamanya.`,
      pelaku: terapis?.nama || 'Tenaga Ahli ULD',
      rolePelaku: 'terapis',
      icon: '🔒'
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('uld_data_updated'));
    }

    // Sinkronisasi langsung ke database Supabase
    if (this.client) {
      this.client.from('pengosongan_jadwal_rutin').upsert({
        id: newRule.id,
        terapis_id: newRule.terapisId,
        hari: newRule.hari,
        hari_label: newRule.hariLabel,
        jam_mulai: newRule.jamMulai,
        jam_selesai: newRule.jamSelesai || null,
        label_sesi: newRule.labelSesi,
        alasan: newRule.alasan || null,
        created_at: newRule.createdAt
      }).then(({ error }) => {
        if (error) console.error('Supabase pengosongan_jadwal_rutin upsert error:', error);
      }).catch(console.warn);

      // Sinkronkan slot yang statusnya dibatalkan
      const affectedSlots = slots.filter(s => s.terapisId === data.terapisId && s.statusSlot === 'dibatalkan');
      for (const s of affectedSlots) {
        this.client.from('slots_harian').update({
          status_slot: 'dibatalkan',
          catatan_terapis: s.catatanTerapis || null
        }).eq('id', s.id).then(({ error }) => {
          if (error) console.error('Supabase slot cancel sync error:', error);
        }).catch(console.warn);
      }
    }

    this.triggerAutoSync();

    return {
      success: true,
      rule: newRule,
      message: `Jadwal hari ${data.hariLabel} sesi ${data.labelSesi} berhasil dikosongkan sepanjang minggu selamanya sampai akses di-revoke.`
    };
  }

  public revokePengosonganRutin(ruleId: string): { success: boolean; message?: string } {
    const list = this.getPengosonganRutinList();
    const ruleIdx = list.findIndex(r => r.id === ruleId);
    if (ruleIdx === -1) {
      return { success: false, message: 'Aturan pengosongan tidak ditemukan atau sudah dicabut.' };
    }

    const removedRule = list[ruleIdx];
    list.splice(ruleIdx, 1);
    localStorage.setItem(STORAGE_KEYS.PENGOSONGAN_RUTIN, JSON.stringify(list));

    // Pulihkan slot-slot yang sebelumnya dibatalkan oleh aturan ini (kecuali jika masih ada aturan lain yang menaunginya)
    const remainingRules = list.filter(r => r.terapisId === removedRule.terapisId);
    const slots = this.getSlotsList();
    let restoredCount = 0;

    slots.forEach(slot => {
      if (slot.terapisId === removedRule.terapisId) {
        const slotDay = new Date(slot.tanggal + 'T00:00:00').getDay();
        const matchHari = removedRule.hari === -1 ? (slotDay >= 1 && slotDay <= 5) : (slotDay === removedRule.hari);
        const matchJam = removedRule.jamMulai === 'SEMUA' || slot.jamMulai === removedRule.jamMulai;

        if (matchHari && matchJam && slot.statusSlot === 'dibatalkan' && slot.kuotaTerisi === 0) {
          const stillBlocked = remainingRules.some(r => {
            const rMatchHari = r.hari === -1 ? (slotDay >= 1 && slotDay <= 5) : (slotDay === r.hari);
            const rMatchJam = r.jamMulai === 'SEMUA' || slot.jamMulai === r.jamMulai;
            return rMatchHari && rMatchJam;
          });

          if (!stillBlocked) {
            slot.statusSlot = 'tersedia';
            slot.catatanTerapis = 'Jadwal reguler otomatis ULD (Senin - Jumat 09.00 - 13.00 WIB)';
            restoredCount++;
          }
        }
      }
    });

    localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(slots));

    const terapis = this.getTerapisById(removedRule.terapisId);
    this.catatAktivitas({
      kategori: 'jadwal_slot',
      judul: 'Revoke Pengosongan Jadwal Rutin',
      deskripsi: `Pengosongan jadwal hari ${removedRule.hariLabel} sesi ${removedRule.labelSesi} telah di-revoke oleh ${terapis?.nama || 'Tenaga Ahli'}. Jadwal diaktifkan kembali.`,
      pelaku: terapis?.nama || 'Tenaga Ahli ULD',
      rolePelaku: 'terapis',
      icon: '🔓'
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('uld_data_updated'));
    }

    // Sinkronisasi langsung ke database Supabase
    if (this.client) {
      this.client.from('pengosongan_jadwal_rutin').delete().eq('id', ruleId).then(({ error }) => {
        if (error) console.error('Supabase direct pengosongan delete error:', error);
      }).catch(console.warn);

      // Sinkronkan slot yang dipulihkan kembali ke tersedia
      const restoredSlots = slots.filter(s => s.terapisId === removedRule.terapisId && s.statusSlot === 'tersedia');
      for (const s of restoredSlots) {
        this.client.from('slots_harian').update({
          status_slot: 'tersedia',
          catatan_terapis: s.catatanTerapis || null
        }).eq('id', s.id).then(({ error }) => {
          if (error) console.error('Supabase slot restore sync error:', error);
        }).catch(console.warn);
      }
    }

    this.triggerAutoSync();

    return {
      success: true,
      message: `Akses jadwal hari ${removedRule.hariLabel} sesi ${removedRule.labelSesi} berhasil di-revoke! Jadwal kembali terbuka dan aktif.`
    };
  }

  // --- PESERTA METHODS ---
  public getPesertaList(): Peserta[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PESERTA);
      const list: Peserta[] = data ? JSON.parse(data) : [];
      let needsSave = false;
      list.forEach(p => {
        if ((p.assignedTerapisId === 'terapis-2' || (p.assignedTerapisNama && p.assignedTerapisNama.toLowerCase().includes('indaryati'))) && p.assignedTerapisNama !== 'Indaryati Machmudi, A.Md.Kes') {
          p.assignedTerapisNama = 'Indaryati Machmudi, A.Md.Kes';
          needsSave = true;
        }
      });
      if (needsSave) {
        localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(list));
      }
      return list;
    } catch {
      return [];
    }
  }

  public getPesertaById(id: string): Peserta | undefined {
    return this.getPesertaList().find(p => p.id === id);
  }

  public loginPeserta(identitasOrId: string, pin: string): { success: boolean; peserta?: Peserta; error?: string } {
    const list = this.getPesertaList();
    const query = identitasOrId.trim().toLowerCase();
    const cleanPin = pin.trim();

    const matched = list.find(p => {
      const matchId = p.id.toLowerCase() === query;
      const matchName = p.namaLengkap.toLowerCase() === query || p.namaLengkap.toLowerCase().includes(query) || p.nomorRekamMedis.toLowerCase() === query;
      const matchPin = p.pin === cleanPin;
      return (matchId || matchName) && matchPin;
    });

    if (matched) {
      if (matched.status !== 'aktif') {
        return { success: false, error: 'Status akun peserta ini sedang tidak aktif. Harap hubungi Admin ULD Kota Probolinggo.' };
      }
      return { success: true, peserta: matched };
    }

    return { 
      success: false, 
      error: 'Nama atau PIN salah. Pastikan PIN yang dimasukkan sudah sesuai.' 
    };
  }

  public tambahPeserta(peserta: Omit<Peserta, 'id' | 'terdaftarSejak'>): Peserta {
    const list = this.getPesertaList();
    const newPeserta: Peserta = {
      ...peserta,
      id: `peserta-${Date.now()}`,
      terdaftarSejak: new Date().toISOString().split('T')[0]
    };
    list.unshift(newPeserta);
    localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(list));

    if (this.client) {
      this.client.from('peserta').upsert({
        id: newPeserta.id,
        nomor_rekam_medis: newPeserta.nomorRekamMedis,
        nama_lengkap: newPeserta.namaLengkap,
        pin: newPeserta.pin,
        tanggal_lahir: newPeserta.tanggalLahir,
        jenis_kelamin: newPeserta.jenisKelamin,
        nama_wali: newPeserta.namaWali,
        nomor_telepon: newPeserta.nomorTelepon || '',
        alamat: newPeserta.alamat || '',
        kecamatan: newPeserta.kecamatan || 'Kota Probolinggo',
        asal_sekolah: newPeserta.asalSekolah || null,
        ragam_disabilitas: newPeserta.ragamDisabilitas,
        status: newPeserta.status,
        terdaftar_sejak: newPeserta.terdaftarSejak,
        catatan_khusus: newPeserta.catatanKhusus || null,
        assigned_terapis_id: newPeserta.assignedTerapisId || null,
        assigned_terapis_nama: newPeserta.assignedTerapisNama || null,
        assigned_at: newPeserta.assignedAt || null
      }).then(({ error }) => {
        if (error) console.error('Supabase tambahPeserta error:', error);
      }).catch(console.warn);
    }

    this.triggerAutoSync();
    return newPeserta;
  }

  // Buat akun siswa terapi rutin baru: nama, asal sekolah, nama ortu, dan PIN
  public buatAkunSiswaBaru(namaAnak: string, namaOrtu: string, pin: string, asalSekolah?: string): Peserta {
    const list = this.getPesertaList();
    const year = new Date().getFullYear();
    const noRM = `ULD-PROB-${year}-${String(list.length + 1).padStart(4, '0')}`;
    const cleanPin = pin.trim() || Math.floor(100000 + Math.random() * 900000).toString();

    const newPeserta: Peserta = {
      id: `peserta-${Date.now()}`,
      nomorRekamMedis: noRM,
      namaLengkap: namaAnak.trim(),
      pin: cleanPin,
      tanggalLahir: '2020-01-01',
      jenisKelamin: 'L',
      namaWali: namaOrtu.trim(),
      nomorTelepon: '',
      alamat: 'Kota Probolinggo',
      kecamatan: 'Kota Probolinggo',
      ragamDisabilitas: 'Terapi Rutin ULD',
      asalSekolah: asalSekolah?.trim() || '-',
      status: 'aktif',
      terdaftarSejak: new Date().toISOString().split('T')[0],
      catatanKhusus: 'Akun resmi diterbitkan langsung oleh Petugas Admin ULD.'
    };

    list.unshift(newPeserta);
    localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(list));

    this.catatAktivitas({
      kategori: 'manajemen_siswa',
      judul: 'Pembuatan Akun Siswa Baru',
      deskripsi: `Akun baru diterbitkan untuk ananda "${namaAnak.trim()}" (Sekolah: ${asalSekolah?.trim() || '-'}, Wali: ${namaOrtu.trim()}) dengan nomor RM ${noRM}.`,
      pelaku: 'Petugas Admin Loket',
      rolePelaku: 'admin',
      icon: '🧒'
    });

    if (this.client) {
      this.client.from('peserta').upsert({
        id: newPeserta.id,
        nomor_rekam_medis: newPeserta.nomorRekamMedis,
        nama_lengkap: newPeserta.namaLengkap,
        pin: newPeserta.pin,
        tanggal_lahir: newPeserta.tanggalLahir,
        jenis_kelamin: newPeserta.jenisKelamin,
        nama_wali: newPeserta.namaWali,
        nomor_telepon: newPeserta.nomorTelepon || '',
        alamat: newPeserta.alamat || '',
        kecamatan: newPeserta.kecamatan || 'Kota Probolinggo',
        asal_sekolah: newPeserta.asalSekolah || null,
        ragam_disabilitas: newPeserta.ragamDisabilitas,
        status: newPeserta.status,
        terdaftar_sejak: newPeserta.terdaftarSejak,
        catatan_khusus: newPeserta.catatanKhusus || null,
        assigned_terapis_id: null,
        assigned_terapis_nama: null,
        assigned_at: null
      }).then(({ error }) => {
        if (error) console.error('Supabase buatAkunSiswaBaru error:', error);
      }).catch(console.warn);
    }

    this.triggerAutoSync();
    return newPeserta;
  }

  public resetPinPeserta(pesertaId: string, pinBaru: string): boolean {
    const list = this.getPesertaList();
    const idx = list.findIndex(p => p.id === pesertaId);
    if (idx !== -1) {
      list[idx].pin = pinBaru;
      localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(list));

      this.catatAktivitas({
        kategori: 'keamanan_pin',
        judul: 'Pembaruan PIN Login Siswa',
        deskripsi: `PIN login siswa an. "${list[idx].namaLengkap}" (${list[idx].nomorRekamMedis}) berhasil diperbarui.`,
        pelaku: 'Siswa / Petugas Admin',
        rolePelaku: 'admin',
        icon: '🔑'
      });

      if (this.client) {
        this.client.from('peserta').update({ pin: pinBaru }).eq('id', pesertaId).then(({ error }) => {
          if (error) console.error('Supabase resetPinPeserta error:', error);
        }).catch(console.warn);
      }

      this.triggerAutoSync();
      return true;
    }
    return false;
  }

  // Meluluskan peserta: ubah status ke 'lulus', simpan tanggal, alasan, dan pelaku, serta batalkan jadwal aktif ke depan untuk membebaskan kuota
  public luluskanPeserta(
    pesertaId: string, 
    alasanLulus?: string, 
    actor?: { nama: string; role: 'terapis' | 'admin' }
  ): boolean {
    const list = this.getPesertaList();
    const idx = list.findIndex(p => p.id === pesertaId);
    if (idx === -1) return false;

    const targetStudent = list[idx];
    targetStudent.status = 'lulus';
    targetStudent.lulusAt = new Date().toISOString();
    targetStudent.alasanLulus = alasanLulus?.trim() || 'Telah menyelesaikan target intervensi terapi ULD';
    targetStudent.diluluskanOleh = actor 
      ? (actor.role === 'admin' ? `Admin (${actor.nama})` : `Terapis (${actor.nama})`)
      : 'Tenaga Ahli ULD';

    list[idx] = targetStudent;
    localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(list));

    // Bebaskan kuota jadwal terapi aktif siswa tersebut jika ada
    const bookings = this.getBookingsList();
    const slots = this.getSlotsList();

    bookings.forEach(b => {
      if (b.pesertaId === pesertaId && (b.status === 'terjadwal' || b.status === 'menunggu_konfirmasi')) {
        b.status = 'batal';
        b.catatanSesiTerapis = `Siswa telah dinyatakan LULUS (${targetStudent.alasanLulus})`;

        const slotIdx = slots.findIndex(s => s.id === b.slotId);
        if (slotIdx !== -1 && slots[slotIdx].kuotaTerisi > 0) {
          slots[slotIdx].kuotaTerisi -= 1;
          if (slots[slotIdx].statusSlot === 'penuh') {
            slots[slotIdx].statusSlot = 'tersedia';
          }
        }
      }
    });

    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
    localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(slots));

    this.catatAktivitas({
      kategori: 'manajemen_siswa',
      judul: 'Kelulusan Siswa Terapi',
      deskripsi: `Siswa an. "${targetStudent.namaLengkap}" (${targetStudent.nomorRekamMedis}) resmi dinyatakan LULUS oleh ${targetStudent.diluluskanOleh}. Catatan: ${targetStudent.alasanLulus}. Kuota sesi aktif otomatis dibebaskan.`,
      pelaku: actor ? `${actor.role === 'admin' ? 'Petugas Admin ' : ''}${actor.nama}` : 'Tenaga Ahli ULD',
      rolePelaku: actor?.role || 'terapis',
      icon: '🎓'
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('uld_data_updated'));
    }

    if (this.client) {
      this.client.from('peserta').update({
        status: 'lulus',
        catatan_khusus: targetStudent.catatanKhusus || null
      }).eq('id', pesertaId).then(({ error }) => {
        if (error) console.error('Supabase luluskanPeserta update error:', error);
      }).catch(console.warn);

      bookings.filter(b => b.pesertaId === pesertaId && b.status === 'batal').forEach(b => {
        this.client!.from('booking_terapi').update({
          status: 'batal',
          catatan_sesi_terapis: b.catatanSesiTerapis || null
        }).eq('id', b.id).then(({ error }) => {
          if (error) console.error('Supabase cancel booking on lulus error:', error);
        }).catch(console.warn);

        const sl = slots.find(s => s.id === b.slotId);
        if (sl) {
          this.client!.from('slots_harian').update({
            kuota_terisi: sl.kuotaTerisi,
            status_slot: sl.statusSlot
          }).eq('id', sl.id).then(({ error }) => {
            if (error) console.error('Supabase slot update on lulus error:', error);
          }).catch(console.warn);
        }
      });
    }

    this.triggerAutoSync();
    return true;
  }

  // Mengaktifkan kembali siswa yang sudah lulus (reaktivasi ke status aktif)
  public aktifkanKembaliPeserta(
    pesertaId: string,
    actor?: { nama: string; role: 'terapis' | 'admin' }
  ): boolean {
    const list = this.getPesertaList();
    const idx = list.findIndex(p => p.id === pesertaId);
    if (idx === -1) return false;

    const p = list[idx];
    p.status = 'aktif';
    if (p.alasanLulus) {
      p.catatanKhusus = `${p.catatanKhusus || ''} [Riwayat Lulus: ${p.lulusAt ? p.lulusAt.split('T')[0] : ''} - ${p.alasanLulus}]`.trim();
    }
    delete p.lulusAt;
    delete p.alasanLulus;
    delete p.diluluskanOleh;
    list[idx] = p;

    localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(list));

    this.catatAktivitas({
      kategori: 'manajemen_siswa',
      judul: 'Reaktivasi Siswa Terapi',
      deskripsi: `Siswa an. "${p.namaLengkap}" (${p.nomorRekamMedis}) yang sebelumnya telah lulus kini diaktifkan kembali statusnya menjadi siswa aktif terapi ULD.`,
      pelaku: actor ? `${actor.role === 'admin' ? 'Petugas Admin ' : ''}${actor.nama}` : 'Tenaga Ahli ULD',
      rolePelaku: actor?.role || 'terapis',
      icon: '🔄'
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('uld_data_updated'));
    }

    if (this.client) {
      this.client.from('peserta').update({
        status: 'aktif',
        catatan_khusus: p.catatanKhusus || null
      }).eq('id', pesertaId).then(({ error }) => {
        if (error) console.error('Supabase aktifkanKembaliPeserta error:', error);
      }).catch(console.warn);
    }

    this.triggerAutoSync();
    return true;
  }

  // Hapus akun siswa lama yang sudah lulus / selesai program
  public hapusPeserta(pesertaId: string, alasanLulus?: string): boolean {
    return this.luluskanPeserta(pesertaId, alasanLulus, { nama: 'Petugas Admin Loket', role: 'admin' });
  }

  // Hapus permanen data siswa jika diperlukan
  public hapusPermanenPeserta(pesertaId: string): boolean {
    const list = this.getPesertaList();
    const filtered = list.filter(p => p.id !== pesertaId);
    if (filtered.length !== list.length) {
      localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(filtered));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('uld_data_updated'));
      }
      if (this.client) {
        this.client.from('peserta').delete().eq('id', pesertaId).then(({ error }) => {
          if (error) console.error('Supabase hapusPermanenPeserta error:', error);
        }).catch(console.warn);
      }
      this.triggerAutoSync();
      return true;
    }
    return false;
  }

  // --- TERAPIS METHODS ---
  public getTerapisList(): Terapis[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TERAPIS);
      const list: Terapis[] = data ? JSON.parse(data) : INITIAL_TERAPIS;
      let needsSave = false;
      list.forEach(t => {
        if (t.id === 'terapis-4' || t.spesialisasi === 'psikolog' || (t.gelar && t.gelar.toLowerCase().includes('klinis'))) {
          if (t.gelar !== 'Psikolog') {
            t.gelar = 'Psikolog';
            needsSave = true;
          }
        }
        if (t.id === 'terapis-2' || (t.nama && t.nama.toLowerCase().includes('indaryati'))) {
          if (t.nama !== 'Indaryati Machmudi, A.Md.Kes') {
            t.nama = 'Indaryati Machmudi, A.Md.Kes';
            needsSave = true;
          }
        }
      });
      if (needsSave) {
        localStorage.setItem(STORAGE_KEYS.TERAPIS, JSON.stringify(list));
      }
      return list;
    } catch {
      return INITIAL_TERAPIS;
    }
  }

  public getTerapisById(id: string): Terapis | undefined {
    return this.getTerapisList().find(t => t.id === id);
  }

  public loginTerapis(nipOrNama: string, pin: string): { success: boolean; terapis?: Terapis; error?: string } {
    const list = this.getTerapisList();
    const query = nipOrNama.trim().toLowerCase();
    const cleanPin = pin.trim();

    const matched = list.find(t => {
      const matchId = t.nipOrId.toLowerCase() === query || t.nama.toLowerCase().includes(query) || t.id.toLowerCase() === query;
      const matchPin = t.pin === cleanPin;
      return matchId && matchPin;
    });

    if (matched) {
      return { success: true, terapis: matched };
    }

    return {
      success: false,
      error: 'ID/NIP atau PIN terapis tidak cocok. Silakan periksa kredensial Anda.'
    };
  }

  // --- PENUGASAN (ASSIGN) SISWA KE TERAPIS TETAP ---
  // Aturan 2: masing-masing terapis bisa assign anak mana aja yang bisa mendaftar ke mereka secara tetap
  public assignPesertaKeTerapis(
    pesertaId: string, 
    terapisId: string, 
    actor?: { nama: string; role: 'terapis' | 'admin' }
  ): { success: boolean; peserta?: Peserta; error?: string } {
    const list = this.getPesertaList();
    const pIdx = list.findIndex(p => p.id === pesertaId);
    if (pIdx === -1) return { success: false, error: 'Data siswa tidak ditemukan.' };

    const terapis = this.getTerapisById(terapisId);
    if (!terapis) return { success: false, error: 'Data tenaga ahli/terapis tidak ditemukan.' };

    const peserta = list[pIdx];

    // ATURAN 1: Siswa binaan yang sudah dipilih terapis lain tidak bisa dipilih lagi oleh terapis lain
    if (peserta.assignedTerapisId && peserta.assignedTerapisId !== terapis.id) {
      return {
        success: false,
        error: `Siswa "${peserta.namaLengkap}" sudah menjadi siswa binaan tetap ${peserta.assignedTerapisNama || 'terapis lain'} dan tidak dapat dipilih lagi oleh terapis lain.`
      };
    }

    peserta.assignedTerapisId = terapis.id;
    peserta.assignedTerapisNama = terapis.nama;
    peserta.assignedAt = new Date().toISOString();
    list[pIdx] = peserta;

    localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(list));

    this.catatAktivitas({
      kategori: 'penugasan_terapis',
      judul: 'Penetapan Siswa Binaan Tetap Terapis',
      deskripsi: `Siswa an. "${peserta.namaLengkap}" (${peserta.nomorRekamMedis}) resmi ditetapkan sebagai siswa binaan tetap kepada ${terapis.nama} (${terapis.spesialisasiLabel}). Siswa hanya dapat mendaftar sesi ke terapis ini.`,
      pelaku: actor ? `${actor.role === 'admin' ? 'Petugas Admin ' : ''}${actor.nama}` : terapis.nama,
      rolePelaku: actor?.role || 'terapis',
      icon: '📌'
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('uld_data_updated'));
    }

    if (this.client) {
      this.client.from('peserta').update({
        assigned_terapis_id: terapis.id,
        assigned_terapis_nama: terapis.nama,
        assigned_at: peserta.assignedAt
      }).eq('id', pesertaId).then(({ error }) => {
        if (error) console.error('Supabase assignPesertaKeTerapis error:', error);
      }).catch(console.warn);
    }

    this.triggerAutoSync();
    return { success: true, peserta };
  }

  public lepasPenugasanPeserta(
    pesertaId: string,
    actor?: { nama: string; role: 'terapis' | 'admin' }
  ): { success: boolean; peserta?: Peserta; error?: string } {
    const list = this.getPesertaList();
    const pIdx = list.findIndex(p => p.id === pesertaId);
    if (pIdx === -1) return { success: false, error: 'Data siswa tidak ditemukan.' };

    const peserta = list[pIdx];
    const prevTerapis = peserta.assignedTerapisNama || 'Terapis';
    delete peserta.assignedTerapisId;
    delete peserta.assignedTerapisNama;
    delete peserta.assignedAt;
    list[pIdx] = peserta;

    localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(list));

    this.catatAktivitas({
      kategori: 'penugasan_terapis',
      judul: 'Pelepasan Siswa Binaan Tetap',
      deskripsi: `Penetapan siswa binaan tetap an. "${peserta.namaLengkap}" (${peserta.nomorRekamMedis}) dari ${prevTerapis} telah dilepas. Siswa kini berstatus belum di-assign.`,
      pelaku: actor ? `${actor.role === 'admin' ? 'Petugas Admin ' : ''}${actor.nama}` : 'Staf ULD',
      rolePelaku: actor?.role || 'terapis',
      icon: '🔓'
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('uld_data_updated'));
    }

    if (this.client) {
      this.client.from('peserta').update({
        assigned_terapis_id: null,
        assigned_terapis_nama: null,
        assigned_at: null
      }).eq('id', pesertaId).then(({ error }) => {
        if (error) console.error('Supabase lepasPenugasanPeserta error:', error);
      }).catch(console.warn);
    }

    this.triggerAutoSync();
    return { success: true, peserta };
  }

  public getSiswaBinaanTerapis(terapisId: string): Peserta[] {
    return this.getPesertaList().filter(p => p.assignedTerapisId === terapisId && p.status === 'aktif');
  }

  public getSiswaBelumDiassign(): Peserta[] {
    return this.getPesertaList().filter(p => !p.assignedTerapisId && p.status === 'aktif');
  }

  public getSiswaLulusList(): Peserta[] {
    return this.getPesertaList().filter(p => p.status === 'lulus' || p.status === 'selesai_program');
  }

  // --- SLOTS HARIAN METHODS (AUTO-OPEN SETIAP MINGGU SENIN - JUMAT) ---
  public ensureAutoOpenWeekdaySlots(targetDate?: string): SlotHarian[] {
    let list: SlotHarian[] = [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SLOTS);
      list = data ? JSON.parse(data) : [];
    } catch {
      list = [];
    }

    // Bersihkan dari slot hari Sabtu (6) dan Minggu (0) yang mungkin sempat tersimpan
    list = list.filter(s => {
      try {
        const d = new Date(s.tanggal + 'T00:00:00');
        const day = d.getDay();
        return day !== 0 && day !== 6;
      } catch {
        return true;
      }
    });

    const { dateStr } = getWIBDate();
    const currentBounds = getWeekBounds(dateStr);
    const todayD = new Date(dateStr + 'T00:00:00');
    const isWeekendNow = todayD.getDay() === 0 || todayD.getDay() === 6;

    // Jika hari ini Sabtu atau Minggu, layanan pekan berjalan telah usai, mulai dari Senin pekan depan
    const startMondayD = new Date(currentBounds.monday + 'T00:00:00');
    if (isWeekendNow) {
      startMondayD.setDate(startMondayD.getDate() + 7);
    }

    // Generate tanggal Senin - Jumat untuk 4 pekan (pekan aktif + 3 pekan ke depan = 20 hari kerja)
    const datesToEnsure: string[] = [];
    for (let w = 0; w < 4; w++) {
      for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
        const d = new Date(startMondayD);
        d.setDate(startMondayD.getDate() + (w * 7) + dayOffset);
        if (d.getDay() >= 1 && d.getDay() <= 5) {
          datesToEnsure.push(formatLocalDate(d));
        }
      }
    }

    // Jika targetDate ditentukan dan jatuh pada hari kerja (Senin - Jumat), sertakan dalam pengecekan
    if (targetDate && /^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      try {
        const td = new Date(targetDate + 'T00:00:00');
        const dayNum = td.getDay();
        if (dayNum >= 1 && dayNum <= 5 && !datesToEnsure.includes(targetDate)) {
          datesToEnsure.push(targetDate);
        }
      } catch {
        // ignore
      }
    }

    let hasAdded = false;
    const terapisList = this.getTerapisList();
    const pengosonganRules = this.getPengosonganRutinList();

    datesToEnsure.forEach(dStr => {
      const dObj = new Date(dStr + 'T00:00:00');
      const dayNum = dObj.getDay();

      terapisList.forEach(t => {
        DEFAULT_TERAPI_SESSIONS.forEach(sess => {
          const matchedRule = pengosonganRules.find(r => 
            r.terapisId === t.id &&
            (r.hari === -1 || r.hari === dayNum) &&
            (r.jamMulai === 'SEMUA' || r.jamMulai === sess.start)
          );

          const existingIdx = list.findIndex(s => s.terapisId === t.id && s.tanggal === dStr && s.jamMulai === sess.start);
          if (existingIdx === -1) {
            list.push({
              id: `slot-auto-${t.id}-${dStr}-${sess.start.replace(':', '')}`,
              terapisId: t.id,
              tanggal: dStr,
              jamMulai: sess.start,
              jamSelesai: sess.end,
              spesialisasi: t.spesialisasi,
              ruang: t.ruangPraktek,
              kuotaMaksimal: 1,
              kuotaTerisi: 0,
              statusSlot: matchedRule ? 'dibatalkan' : 'tersedia',
              catatanTerapis: matchedRule 
                ? (matchedRule.alasan ? `Dikosongkan Rutin: ${matchedRule.alasan}` : 'Dikosongkan rutin setiap minggu sepanjang masa')
                : 'Jadwal reguler otomatis ULD (Senin - Jumat 09.00 - 13.00 WIB)',
              createdAt: new Date().toISOString()
            });
            hasAdded = true;
          } else if (matchedRule && list[existingIdx].statusSlot === 'tersedia' && list[existingIdx].kuotaTerisi === 0) {
            list[existingIdx].statusSlot = 'dibatalkan';
            list[existingIdx].catatanTerapis = matchedRule.alasan 
              ? `Dikosongkan Rutin: ${matchedRule.alasan}` 
              : 'Dikosongkan rutin setiap minggu sepanjang masa';
            hasAdded = true;
          }
        });
      });
    });

    // Sinkronisasi kuota terisi untuk setiap slot berdasarkan pendaftaran aktif di database
    const allBookings = this.getBookingsList();
    list.forEach(slot => {
      const activeBookings = allBookings.filter(b => 
        (b.slotId === slot.id || (b.tanggal === slot.tanggal && b.jamMulai === slot.jamMulai && b.terapisId === slot.terapisId)) &&
        b.status !== 'batal'
      );
      const newFilled = activeBookings.length;
      if (slot.kuotaTerisi !== newFilled) {
        slot.kuotaTerisi = newFilled;
        hasAdded = true;
      }
      if (slot.statusSlot !== 'dibatalkan') {
        const newStatus = slot.kuotaTerisi >= slot.kuotaMaksimal ? 'penuh' : 'tersedia';
        if (slot.statusSlot !== newStatus) {
          slot.statusSlot = newStatus;
          hasAdded = true;
        }
      }
    });

    if (hasAdded) {
      localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(list));
    }

    return list;
  }

  public getSlotsList(targetDate?: string): SlotHarian[] {
    return this.ensureAutoOpenWeekdaySlots(targetDate);
  }

  public bukaSlotHarian(slot: Omit<SlotHarian, 'id' | 'kuotaTerisi' | 'statusSlot' | 'createdAt'>): SlotHarian {
    const list = this.getSlotsList();
    const newSlot: SlotHarian = {
      ...slot,
      id: `slot-${Date.now()}`,
      kuotaTerisi: 0,
      statusSlot: 'tersedia',
      createdAt: new Date().toISOString()
    };
    list.unshift(newSlot);
    localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(list));

    this.catatAktivitas({
      kategori: 'jadwal_slot',
      judul: 'Pembukaan Slot Baru Layanan Terapi',
      deskripsi: `Slot baru sesi ${slot.jamMulai} - ${slot.jamSelesai} WIB dibuka pada tanggal ${slot.tanggal} (${slot.spesialisasi}).`,
      pelaku: 'Terapis / Petugas Loket',
      rolePelaku: 'admin',
      icon: '🗓️'
    });

    if (this.client) {
      this.client.from('slots_harian').upsert({
        id: newSlot.id,
        terapis_id: newSlot.terapisId,
        tanggal: newSlot.tanggal,
        jam_mulai: newSlot.jamMulai,
        jam_selesai: newSlot.jamSelesai,
        ruang: newSlot.ruang,
        spesialisasi: newSlot.spesialisasi,
        kuota_maksimal: newSlot.kuotaMaksimal,
        kuota_terisi: newSlot.kuotaTerisi,
        status_slot: newSlot.statusSlot,
        catatan_terapis: newSlot.catatanTerapis || null,
        created_at: newSlot.createdAt
      }).then(({ error }) => {
        if (error) console.error('Supabase bukaSlotHarian error:', error);
      }).catch(console.warn);
    }

    this.triggerAutoSync();
    return newSlot;
  }

  public batalkanSlot(slotId: string): boolean {
    const list = this.getSlotsList();
    const idx = list.findIndex(s => s.id === slotId);
    if (idx !== -1) {
      list[idx].statusSlot = 'dibatalkan';
      localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(list));

      if (this.client) {
        this.client.from('slots_harian').update({
          status_slot: 'dibatalkan'
        }).eq('id', slotId).then(({ error }) => {
          if (error) console.error('Supabase batalkanSlot error:', error);
        }).catch(console.warn);
      }

      this.triggerAutoSync();
      return true;
    }
    return false;
  }

  // --- BOOKING METHODS ---
  public getBookingsList(): BookingTerapi[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(INITIAL_BOOKINGS));
        return INITIAL_BOOKINGS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_BOOKINGS;
    }
  }

  public buatBookingTerapi(
    pesertaId: string, 
    slotId: string, 
    keluhanHariIni?: string,
    options?: { isAdminBooking?: boolean; adminName?: string }
  ): { success: boolean; booking?: BookingTerapi; error?: string } {
    const slots = this.getSlotsList();
    const slotIdx = slots.findIndex(s => s.id === slotId);

    if (slotIdx === -1) {
      return { success: false, error: 'Jadwal slot terapi tidak ditemukan.' };
    }

    const slot = slots[slotIdx];

    // ATURAN 3: Pendaftaran terapi paling minimal dilakukan H-1 hari di maksimal jam 24.00 WIB
    // Semua jenis pendaftaran pokoknya maksimal H-1 sebelum 23.59 WIB (tanpa pengecualian)
    const deadlineCheck = checkBatasPendaftaranHMinus1(slot.tanggal);
    if (!deadlineCheck.bisaDaftar) {
      return { success: false, error: deadlineCheck.pesan };
    }

    // Ambil data siswa
    const peserta = this.getPesertaById(pesertaId);
    if (!peserta) {
      return { success: false, error: 'Data siswa tidak ditemukan.' };
    }
    const namaSiswa = peserta.namaLengkap;

    // ATURAN 2: masing-masing terapis bisa assign anak mana aja yang bisa mendaftar ke mereka secara tetap,
    // selain itu ga bisa daftar ke mereka. dan siswa tersebut hanya bisa daftar ke terapis tersebut setelahnya.
    if (!peserta.assignedTerapisId) {
      return {
        success: false,
        error: `Siswa "${namaSiswa}" belum di-assign secara tetap ke salah satu Tenaga Ahli/Terapis. Terapis yang bersangkutan harus menetapkan siswa terlebih dahulu sebelum dapat mendaftar.`
      };
    }

    if (peserta.assignedTerapisId !== slot.terapisId) {
      const assignedTerapis = this.getTerapisById(peserta.assignedTerapisId);
      const targetTerapis = this.getTerapisById(slot.terapisId);
      return {
        success: false,
        error: `Siswa "${namaSiswa}" telah ditetapkan secara tetap kepada ${assignedTerapis?.nama || 'Terapis Pembina'} (${assignedTerapis?.spesialisasiLabel || ''}). Siswa hanya dapat mendaftar ke terapis tersebut dan tidak dapat mendaftar ke ${targetTerapis?.nama || 'terapis lain'}.`
      };
    }

    // Khusus konsultasi/asesmen Psikolog: jika bukan siswa binaan tetap, wajib didaftarkan oleh admin loket
    if (slot.spesialisasi === 'psikolog' && !options?.isAdminBooking && peserta.assignedTerapisId !== slot.terapisId) {
      return { 
        success: false, 
        error: 'Pendaftaran konsultasi Psikolog untuk umum hanya dapat dilakukan melalui Petugas Admin ULD di loket atau jika siswa telah ditetapkan sebagai siswa binaan tetap.' 
      };
    }

    // Validasi aturan pengosongan rutin Tenaga Ahli (berlaku selamanya sampai di-revoke)
    const slotDayNum = new Date(slot.tanggal + 'T00:00:00').getDay();
    const activeBlockRule = this.getPengosonganRutinByTerapis(slot.terapisId).find(r =>
      (r.hari === -1 || r.hari === slotDayNum) &&
      (r.jamMulai === 'SEMUA' || r.jamMulai === slot.jamMulai)
    );
    if (activeBlockRule) {
      return {
        success: false,
        error: `Maaf, jadwal sesi ${slot.jamMulai} WIB pada setiap hari ${activeBlockRule.hariLabel} telah dikosongkan secara rutin oleh Tenaga Ahli (${activeBlockRule.alasan || 'Tidak Menerima Layanan Rutin'}).`
      };
    }

    if (slot.statusSlot !== 'tersedia' || slot.kuotaTerisi >= slot.kuotaMaksimal) {
      return { success: false, error: 'Maaf, kuota slot terapi ini sudah penuh atau sudah ditutup.' };
    }

    const bookings = this.getBookingsList();

    // Check if user already booked same slot or same date & time
    const existingSameTime = bookings.find(b => b.pesertaId === pesertaId && b.tanggal === slot.tanggal && b.jamMulai === slot.jamMulai && b.status !== 'batal');
    if (existingSameTime) {
      return { success: false, error: 'Anda sudah memiliki pendaftaran jadwal terapi pada jam yang sama di tanggal ini.' };
    }

    // Batas maksimal pendaftaran adalah 2 pekan ke depan
    const twoWeeksAheadDate = (() => {
      const { dateStr: todayStr } = getWIBDate();
      const d = new Date(todayStr + 'T00:00:00');
      d.setDate(d.getDate() + 14);
      return d.toISOString().split('T')[0];
    })();
    if (slot.tanggal > twoWeeksAheadDate) {
      return {
        success: false,
        error: `Pendaftaran jadwal terapi dibatasi maksimal 2 pekan ke depan (${twoWeeksAheadDate}).`
      };
    }

    // ATURAN 2: Siswa terdaftar hanya bisa mendaftar maksimal 1x dalam seminggu
    const targetWeek = getWeekBounds(slot.tanggal);
    const existingInSameWeek = bookings.find(b => {
      if (b.pesertaId !== pesertaId) return false;
      if (b.status === 'batal') return false; // Abaikan booking yang dibatalkan
      const bWeek = getWeekBounds(b.tanggal);
      return bWeek.monday === targetWeek.monday;
    });

    if (existingInSameWeek) {
      return {
        success: false,
        error: `Siswa terdaftar hanya bisa mendaftar maksimal 1x dalam seminggu. ${namaSiswa} sudah memiliki jadwal terapi pada ${existingInSameWeek.tanggal} (Pukul ${existingInSameWeek.jamMulai} - ${existingInSameWeek.jamSelesai} WIB). Silakan pilih pekan berikutnya atau batalkan jadwal sebelumnya.`
      };
    }

    const counter = bookings.length + 1;
    const kodeBooking = `TRP-${slot.tanggal.replace(/-/g, '').slice(2)}-${String(counter).padStart(3, '0')}`;

    const newBooking: BookingTerapi = {
      id: `booking-${Date.now()}`,
      slotId: slot.id,
      pesertaId: pesertaId,
      namaPeserta: peserta.namaLengkap,
      nomorRekamMedis: peserta.nomorRekamMedis,
      asalSekolah: peserta.asalSekolah,
      terapisId: slot.terapisId,
      kodeBooking: kodeBooking,
      tanggal: slot.tanggal,
      jamMulai: slot.jamMulai,
      jamSelesai: slot.jamSelesai,
      spesialisasi: slot.spesialisasi,
      ruang: slot.ruang,
      status: 'terjadwal',
      keluhanHariIni: keluhanHariIni || '',
      didaftarkanOlehAdmin: options?.isAdminBooking ? (options.adminName || 'Admin ULD') : undefined,
      createdAt: new Date().toISOString()
    };

    // Update slot filled count
    slot.kuotaTerisi += 1;
    if (slot.kuotaTerisi >= slot.kuotaMaksimal) {
      slot.statusSlot = 'penuh';
    }
    slots[slotIdx] = slot;
    localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(slots));

    bookings.unshift(newBooking);
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));

    this.catatAktivitas({
      kategori: 'pendaftaran_terapi',
      judul: options?.isAdminBooking ? 'Pendaftaran Terapi di Loket ULD' : 'Pendaftaran Terapi Mandiri',
      deskripsi: `Siswa "${namaSiswa}" didaftarkan ke sesi ${slot.spesialisasi} (${slot.tanggal}, ${slot.jamMulai}-${slot.jamSelesai} WIB). Kode: ${kodeBooking}.`,
      pelaku: options?.adminName ? `Petugas Admin ${options.adminName}` : namaSiswa,
      rolePelaku: options?.isAdminBooking ? 'admin' : 'peserta',
      icon: '🏥'
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('uld_data_updated'));
    }

    // Direct instant sync to Supabase database
    if (this.client && this.isSupabaseConnected) {
      const slotPayload = {
        id: slot.id,
        terapis_id: slot.terapisId,
        tanggal: slot.tanggal,
        jam_mulai: slot.jamMulai,
        jam_selesai: slot.jamSelesai,
        spesialisasi: slot.spesialisasi,
        ruang: slot.ruang,
        kuota_maksimal: slot.kuotaMaksimal,
        kuota_terisi: slot.kuotaTerisi,
        catatan_terapis: slot.catatanTerapis || null,
        status_slot: slot.statusSlot
      };
      const bookingPayload = {
        id: newBooking.id,
        slot_id: newBooking.slotId,
        peserta_id: newBooking.pesertaId,
        terapis_id: newBooking.terapisId,
        kode_booking: newBooking.kodeBooking,
        tanggal: newBooking.tanggal,
        jam_mulai: newBooking.jamMulai,
        jam_selesai: newBooking.jamSelesai,
        spesialisasi: newBooking.spesialisasi,
        ruang: newBooking.ruang,
        status: newBooking.status,
        keluhan_hari_ini: newBooking.keluhanHariIni || null,
        catatan_sesi_terapis: newBooking.catatanSesiTerapis || null,
        asal_sekolah: newBooking.asalSekolah || null,
        didaftarkan_oleh_admin: newBooking.didaftarkanOlehAdmin || null,
        reschedule_count: newBooking.rescheduleCount || 0
      };

      this.client.from('slots_harian').upsert(slotPayload).then(({ error: sErr }) => {
        if (sErr) console.error('Supabase direct slot sync error:', sErr);
        return this.client!.from('booking_terapi').upsert(bookingPayload);
      }).then((res: any) => {
        if (res?.error) console.error('Supabase direct booking sync error:', res.error);
        else console.log('✓ Booking & Slot sukses tersimpan langsung di database Supabase!');
      }).catch(err => {
        console.error('Supabase direct sync error:', err);
      });
    }

    this.triggerAutoSync();
    return { success: true, booking: newBooking };
  }

  public getPesertaWeeklyBooking(pesertaId: string, dateStr: string): BookingTerapi | undefined {
    const targetWeek = getWeekBounds(dateStr);
    const bookings = this.getBookingsList();
    return bookings.find(b => {
      if (b.pesertaId !== pesertaId) return false;
      if (b.status === 'batal') return false;
      const bWeek = getWeekBounds(b.tanggal);
      return bWeek.monday === targetWeek.monday;
    });
  }

  public updateBookingStatus(bookingId: string, status: BookingTerapi['status'], catatanSesi?: string): boolean {
    const bookings = this.getBookingsList();
    const idx = bookings.findIndex(b => b.id === bookingId);
    if (idx !== -1) {
      bookings[idx].status = status;
      if (catatanSesi !== undefined) {
        bookings[idx].catatanSesiTerapis = catatanSesi;
      }
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));

      this.catatAktivitas({
        kategori: 'jadwal_slot',
        judul: status === 'batal' ? 'Pembatalan Sesi Terapi' : `Pembaruan Sesi: ${status.toUpperCase()}`,
        deskripsi: `Sesi terapi (${bookings[idx].kodeBooking}) diperbarui menjadi "${status}". ${catatanSesi ? `Catatan: ${catatanSesi}` : ''}`,
        pelaku: catatanSesi?.includes('Sugeng') ? 'Petugas Admin Sugeng' : catatanSesi?.includes('Helmi') ? 'Petugas Admin Helmi' : 'Staf ULD',
        rolePelaku: 'admin',
        icon: status === 'batal' ? '❌' : '📋'
      });

      if (this.client && this.isSupabaseConnected) {
        this.client.from('booking_terapi').update({
          status: status,
          catatan_sesi_terapis: catatanSesi || null
        }).eq('id', bookingId).then(({ error }) => {
          if (error) console.error('Supabase status update error:', error);
        });
      }

      this.triggerAutoSync();
      return true;
    }
    return false;
  }

  public batalkanBooking(bookingId: string, alasan?: string): boolean {
    const bookings = this.getBookingsList();
    const idx = bookings.findIndex(b => b.id === bookingId);
    if (idx !== -1) {
      const b = bookings[idx];
      b.status = 'batal';
      b.catatanSesiTerapis = alasan || 'Dibatalkan oleh siswa/wali';
      bookings[idx] = b;
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));

      // Restore slot kuota
      const slots = this.getSlotsList();
      const slotIdx = slots.findIndex(s => s.id === b.slotId);
      if (slotIdx !== -1) {
        slots[slotIdx].kuotaTerisi = Math.max(0, slots[slotIdx].kuotaTerisi - 1);
        if (slots[slotIdx].statusSlot === 'penuh') {
          slots[slotIdx].statusSlot = 'tersedia';
        }
        localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(slots));
      }

      this.catatAktivitas({
        kategori: 'pendaftaran_terapi',
        judul: 'Pembatalan Jadwal Terapi',
        deskripsi: `Sesi terapi (${b.kodeBooking}) pada ${b.tanggal} (${b.jamMulai} - ${b.jamSelesai} WIB) telah dibatalkan. Kuota slot dikembalikan.`,
        pelaku: 'Siswa / Orang Tua',
        rolePelaku: 'peserta',
        icon: '❌'
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('uld_data_updated'));
      }

      // Direct instant sync of cancellation to Supabase database
      if (this.client && this.isSupabaseConnected) {
        this.client.from('booking_terapi').update({
          status: 'batal',
          catatan_sesi_terapis: alasan || 'Dibatalkan oleh siswa/wali'
        }).eq('id', bookingId).then(({ error }) => {
          if (error) console.error('Supabase cancel booking sync error:', error);
          else console.log('✓ Pembatalan sukses tersimpan di database Supabase!');
        });

        if (slotIdx !== -1) {
          this.client.from('slots_harian').update({
            kuota_terisi: slots[slotIdx].kuotaTerisi,
            status_slot: slots[slotIdx].statusSlot
          }).eq('id', b.slotId).then(({ error }) => {
            if (error) console.error('Supabase slot restore sync error:', error);
          });
        }
      }

      this.triggerAutoSync();
      return true;
    }
    return false;
  }

  // ATURAN 2: Peserta terapi rutin boleh mengganti sendiri jadwalnya maksimal 1 kali apabila salah memilih hari dan waktu
  public gantiJadwalTerapiMandiri(
    bookingId: string, 
    newSlotId: string, 
    alasan?: string
  ): { success: boolean; booking?: BookingTerapi; error?: string } {
    const bookings = this.getBookingsList();
    const bIdx = bookings.findIndex(b => b.id === bookingId);
    if (bIdx === -1) {
      return { success: false, error: 'Data pendaftaran jadwal terapi tidak ditemukan.' };
    }

    const b = bookings[bIdx];
    if (b.status === 'batal') {
      return { success: false, error: 'Jadwal yang telah dibatalkan tidak dapat dipindahkan.' };
    }

    // Maksimal 1 kali ganti jadwal mandiri oleh peserta
    const currentCount = b.rescheduleCount || 0;
    if (currentCount >= 1) {
      return { 
        success: false, 
        error: 'Batas penggantian jadwal mandiri telah tercapai (maksimal 1 kali per tiket sesi terapi). Silakan hubungi loket ULD jika ada kendala mendesak.' 
      };
    }

    const slots = this.getSlotsList();
    const newSlotIdx = slots.findIndex(s => s.id === newSlotId);
    if (newSlotIdx === -1) {
      return { success: false, error: 'Slot jadwal baru tidak ditemukan.' };
    }

    const newSlot = slots[newSlotIdx];

    // Cek Aturan 3: Batas H-1 jam 24.00 WIB untuk slot baru
    const deadlineCheck = checkBatasPendaftaranHMinus1(newSlot.tanggal);
    if (!deadlineCheck.bisaDaftar) {
      return { success: false, error: `Slot baru tidak dapat dipilih: ${deadlineCheck.pesan}` };
    }

    // Cek apakah slot baru adalah terapis pembina yang sama (Aturan 2)
    if (newSlot.terapisId !== b.terapisId) {
      return { success: false, error: 'Jadwal hanya dapat dipindahkan ke sesi tenaga ahli / terapis pembina tetap Anda.' };
    }

    // Cek kuota slot baru
    if (newSlot.statusSlot !== 'tersedia' || newSlot.kuotaTerisi >= newSlot.kuotaMaksimal) {
      return { success: false, error: 'Slot waktu baru yang dipilih sudah terisi penuh atau ditutup.' };
    }

    // Lepaskan kuota slot lama
    const oldSlotIdx = slots.findIndex(s => s.id === b.slotId);
    if (oldSlotIdx !== -1 && slots[oldSlotIdx].kuotaTerisi > 0) {
      slots[oldSlotIdx].kuotaTerisi -= 1;
      if (slots[oldSlotIdx].statusSlot === 'penuh') {
        slots[oldSlotIdx].statusSlot = 'tersedia';
      }
    }

    // Tambahkan kuota slot baru
    newSlot.kuotaTerisi += 1;
    if (newSlot.kuotaTerisi >= newSlot.kuotaMaksimal) {
      newSlot.statusSlot = 'penuh';
    }
    slots[newSlotIdx] = newSlot;
    localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(slots));

    const oldTanggal = b.tanggal;
    const oldJam = `${b.jamMulai} - ${b.jamSelesai} WIB`;

    // Update data booking
    b.slotId = newSlot.id;
    b.tanggal = newSlot.tanggal;
    b.jamMulai = newSlot.jamMulai;
    b.jamSelesai = newSlot.jamSelesai;
    b.ruang = newSlot.ruang;
    b.rescheduleCount = currentCount + 1;
    b.catatanSesiTerapis = `[Reschedule Mandiri 1/1]: Dipindahkan oleh siswa dari ${oldTanggal} (${oldJam}) ke ${newSlot.tanggal} (${newSlot.jamMulai} - ${newSlot.jamSelesai} WIB). ${alasan ? `Alasan: ${alasan}` : ''}`;
    bookings[bIdx] = b;
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));

    const peserta = this.getPesertaById(b.pesertaId);

    this.catatAktivitas({
      kategori: 'pendaftaran_terapi',
      judul: 'Ganti Jadwal Terapi Mandiri Siswa (Reschedule 1/1)',
      deskripsi: `Siswa an. "${peserta?.namaLengkap || b.pesertaId}" memindahkan jadwal sesi dari ${oldTanggal} (${oldJam}) ke ${newSlot.tanggal} (${newSlot.jamMulai} - ${newSlot.jamSelesai} WIB). Batas ganti mandiri 1/1 tercapai.`,
      pelaku: peserta?.namaLengkap || 'Siswa / Orang Tua',
      rolePelaku: 'peserta',
      icon: '🔄'
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('uld_data_updated'));
    }

    if (this.client) {
      // 1. Update data booking
      this.client.from('booking_terapi').update({
        slot_id: newSlot.id,
        tanggal: newSlot.tanggal,
        jam_mulai: newSlot.jamMulai,
        jam_selesai: newSlot.jamSelesai,
        ruang: newSlot.ruang,
        reschedule_count: b.rescheduleCount,
        catatan_sesi_terapis: b.catatanSesiTerapis
      }).eq('id', bookingId).then(({ error }) => {
        if (error) console.error('Supabase gantiJadwal booking update error:', error);
      }).catch(console.warn);

      // 2. Update old slot kuota
      if (oldSlotIdx !== -1) {
        this.client.from('slots_harian').update({
          kuota_terisi: slots[oldSlotIdx].kuotaTerisi,
          status_slot: slots[oldSlotIdx].statusSlot
        }).eq('id', slots[oldSlotIdx].id).then(({ error }) => {
          if (error) console.error('Supabase old slot restore error:', error);
        }).catch(console.warn);
      }

      // 3. Update new slot kuota
      this.client.from('slots_harian').update({
        kuota_terisi: newSlot.kuotaTerisi,
        status_slot: newSlot.statusSlot
      }).eq('id', newSlot.id).then(({ error }) => {
        if (error) console.error('Supabase new slot fill error:', error);
      }).catch(console.warn);
    }

    this.triggerAutoSync();

    return { success: true, booking: b };
  }

  // ATURAN 3: Terapis bisa membatalkan jadwal apabila mendadak soalnya butuh
  public batalkanBookingOlehTerapis(
    bookingId: string, 
    terapisNama: string, 
    alasanMendadak: string
  ): { success: boolean; error?: string } {
    const bookings = this.getBookingsList();
    const idx = bookings.findIndex(b => b.id === bookingId);
    if (idx === -1) {
      return { success: false, error: 'Data sesi pendaftaran tidak ditemukan.' };
    }

    const b = bookings[idx];
    b.status = 'batal';
    b.catatanSesiTerapis = `Dibatalkan mendadak oleh Tenaga Ahli (${terapisNama}): ${alasanMendadak || 'Keperluan mendesak / dinas luar kota'}`;
    bookings[idx] = b;
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));

    // Bebaskan kuota slot
    const slots = this.getSlotsList();
    const slotIdx = slots.findIndex(s => s.id === b.slotId);
    if (slotIdx !== -1) {
      slots[slotIdx].kuotaTerisi = Math.max(0, slots[slotIdx].kuotaTerisi - 1);
      if (slots[slotIdx].statusSlot === 'penuh') {
        slots[slotIdx].statusSlot = 'tersedia';
      }
      localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(slots));
    }

    const peserta = this.getPesertaById(b.pesertaId);

    this.catatAktivitas({
      kategori: 'pendaftaran_terapi',
      judul: 'Pembatalan Sesi Terapi Mendadak oleh Tenaga Ahli',
      deskripsi: `Sesi an. "${peserta?.namaLengkap || b.pesertaId}" (${b.tanggal} pukul ${b.jamMulai} - ${b.jamSelesai} WIB) dibatalkan mendadak oleh ${terapisNama}. Alasan: ${alasanMendadak || 'Keperluan mendesak'}. Kuota telah dikembalikan.`,
      pelaku: terapisNama,
      rolePelaku: 'terapis',
      icon: '⚠️'
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('uld_data_updated'));
    }

    if (this.client) {
      this.client.from('booking_terapi').update({
        status: 'batal',
        catatan_sesi_terapis: b.catatanSesiTerapis
      }).eq('id', bookingId).then(({ error }) => {
        if (error) console.error('Supabase batalkanBookingOlehTerapis error:', error);
      }).catch(console.warn);

      if (slotIdx !== -1) {
        this.client.from('slots_harian').update({
          kuota_terisi: slots[slotIdx].kuotaTerisi,
          status_slot: slots[slotIdx].statusSlot
        }).eq('id', b.slotId).then(({ error }) => {
          if (error) console.error('Supabase slot restore error:', error);
        }).catch(console.warn);
      }
    }

    this.triggerAutoSync();

    return { success: true };
  }

  // --- GUEST ASESMEN METHODS ---
  public getAsesmenGuestList(): PendaftaranAsesmenGuest[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ASESMEN);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public getAsesmenById(id: string): PendaftaranAsesmenGuest | undefined {
    return this.getAsesmenGuestList().find(a => a.id === id || a.nomorRegistrasi === id);
  }

  public daftarAsesmenGuest(data: Omit<PendaftaranAsesmenGuest, 'id' | 'nomorRegistrasi' | 'status' | 'createdAt'>): PendaftaranAsesmenGuest {
    const list = this.getAsesmenGuestList();
    const year = new Date().getFullYear();
    const counter = list.length + 1;
    const nomorRegistrasi = `ASM-PROB-${year}-${String(counter).padStart(4, '0')}`;

    const newGuest: PendaftaranAsesmenGuest = {
      ...data,
      id: `guest-${Date.now()}`,
      nomorRegistrasi,
      status: 'menunggu_verifikasi_fisik',
      createdAt: new Date().toISOString()
    };

    list.unshift(newGuest);
    localStorage.setItem(STORAGE_KEYS.ASESMEN, JSON.stringify(list));

    if (this.client) {
      this.client.from('pendaftaran_asesmen_guest').upsert({
        id: newGuest.id,
        nomor_registrasi: newGuest.nomorRegistrasi,
        nama_anak: newGuest.namaAnak,
        tanggal_lahir: newGuest.tanggalLahir,
        jenis_kelamin: newGuest.jenisKelamin,
        nama_orang_tua: newGuest.namaOrangTua,
        nik_anak_or_kk: newGuest.nikAnakOrKK,
        nomor_whatsapp: newGuest.nomorWhatsApp,
        alamat_domisili: newGuest.alamatDomisili,
        kecamatan: newGuest.kecamatan,
        jenjang_pendidikan: newGuest.jenjangPendidikan || null,
        asal_sekolah: newGuest.asalSekolah || null,
        nisn_or_npsn: newGuest.nisnOrNpsn || null,
        sudah_terdaftar_dapodik: newGuest.sudahTerdaftarDapodik || false,
        indikasi_awal: newGuest.indikasiAwal,
        dokumen_akan_dibawa: newGuest.dokumenAkanDibawa || [],
        tanggal_rencana_datang: newGuest.tanggalRencanaDatang,
        jam_rencana_datang: newGuest.jamRencanaDatang,
        status: newGuest.status,
        created_at: newGuest.createdAt
      }).then(({ error }) => {
        if (error) console.error('Supabase direct daftarAsesmenGuest error:', error);
      }).catch(console.warn);
    }

    this.triggerAutoSync();
    return newGuest;
  }

  // Penjadwalan Asesmen Baru Khusus oleh Petugas Admin ULD
  public jadwalkanAsesmenOlehAdmin(data: {
    namaAnak: string;
    namaOrangTua: string;
    nomorWhatsApp: string;
    tanggalRencanaDatang: string;
    jamRencanaDatang: string;
    indikasiAwal?: string;
    petugasAdmin: string;
  }): PendaftaranAsesmenGuest {
    const list = this.getAsesmenGuestList();
    const year = new Date().getFullYear();
    const counter = list.length + 1;
    const nomorRegistrasi = `ASM-PROB-${year}-${String(counter).padStart(4, '0')}`;

    const newAsesmen: PendaftaranAsesmenGuest = {
      id: `guest-${Date.now()}`,
      nomorRegistrasi,
      namaAnak: data.namaAnak.trim(),
      tanggalLahir: '2020-01-01',
      jenisKelamin: 'L',
      namaOrangTua: data.namaOrangTua.trim(),
      nikAnakOrKK: '',
      nomorWhatsApp: data.nomorWhatsApp.trim(),
      alamatDomisili: 'Kota Probolinggo',
      kecamatan: 'Kota Probolinggo',
      jenjangPendidikan: 'PAUD/TK',
      asalSekolah: '',
      nisnOrNpsn: '',
      sudahTerdaftarDapodik: true,
      indikasiAwal: data.indikasiAwal || 'Asesmen awal tumbuh kembang terjadwal loket ULD',
      dokumenAkanDibawa: ['Kartu Keluarga (KK)', 'KTP Orang Tua/Wali', 'Buku KIA Pink'],
      tanggalRencanaDatang: data.tanggalRencanaDatang,
      jamRencanaDatang: data.jamRencanaDatang,
      status: 'menunggu_verifikasi_fisik',
      catatanPetugas: `Dijadwalkan oleh Petugas Admin: ${data.petugasAdmin}`,
      createdAt: new Date().toISOString()
    };

    list.unshift(newAsesmen);
    localStorage.setItem(STORAGE_KEYS.ASESMEN, JSON.stringify(list));

    this.catatAktivitas({
      kategori: 'asesmen',
      judul: 'Penjadwalan Asesmen Baru',
      deskripsi: `Calon siswa "${data.namaAnak}" (Wali: ${data.namaOrangTua}) dijadwalkan asesmen awal pada ${data.tanggalRencanaDatang} (${data.jamRencanaDatang}). No. Reg: ${nomorRegistrasi}.`,
      pelaku: `Petugas Admin ${data.petugasAdmin || 'Loket'}`,
      rolePelaku: 'admin',
      icon: '📅'
    });

    if (this.client) {
      this.client.from('pendaftaran_asesmen_guest').upsert({
        id: newAsesmen.id,
        nomor_registrasi: newAsesmen.nomorRegistrasi,
        nama_anak: newAsesmen.namaAnak,
        tanggal_lahir: newAsesmen.tanggalLahir,
        jenis_kelamin: newAsesmen.jenisKelamin,
        nama_orang_tua: newAsesmen.namaOrangTua,
        nik_anak_or_kk: newAsesmen.nikAnakOrKK || '-',
        nomor_whatsapp: newAsesmen.nomorWhatsApp,
        alamat_domisili: newAsesmen.alamatDomisili,
        kecamatan: newAsesmen.kecamatan,
        jenjang_pendidikan: newAsesmen.jenjangPendidikan || null,
        asal_sekolah: newAsesmen.asalSekolah || null,
        nisn_or_npsn: newAsesmen.nisnOrNpsn || null,
        sudah_terdaftar_dapodik: newAsesmen.sudahTerdaftarDapodik || false,
        indikasi_awal: newAsesmen.indikasiAwal,
        dokumen_akan_dibawa: newAsesmen.dokumenAkanDibawa || [],
        tanggal_rencana_datang: newAsesmen.tanggalRencanaDatang,
        jam_rencana_datang: newAsesmen.jamRencanaDatang,
        status: newAsesmen.status,
        catatan_petugas: newAsesmen.catatanPetugas || null,
        created_at: newAsesmen.createdAt
      }).then(({ error }) => {
        if (error) console.error('Supabase direct jadwalkanAsesmenOlehAdmin error:', error);
      }).catch(console.warn);
    }

    this.triggerAutoSync();
    return newAsesmen;
  }

  public verifikasiGuestDanTerbitkanPeserta(
    guestId: string, 
    pinBaru: string, 
    nomorRMManual?: string,
    catatanPetugas?: string
  ): { success: boolean; peserta?: Peserta; error?: string } {
    const guestList = this.getAsesmenGuestList();
    const guestIdx = guestList.findIndex(g => g.id === guestId);

    if (guestIdx === -1) {
      return { success: false, error: 'Pendaftaran asesmen tidak ditemukan.' };
    }

    const guest = guestList[guestIdx];
    const pesertaList = this.getPesertaList();

    const noRM = nomorRMManual || `ULD-PROB-${new Date().getFullYear()}-${String(pesertaList.length + 1).padStart(4, '0')}`;
    const generatedPin = pinBaru || Math.floor(100000 + Math.random() * 900000).toString();

    const newPeserta: Peserta = {
      id: `peserta-${Date.now()}`,
      nomorRekamMedis: noRM,
      namaLengkap: guest.namaAnak,
      pin: generatedPin,
      tanggalLahir: guest.tanggalLahir,
      jenisKelamin: guest.jenisKelamin,
      namaWali: guest.namaOrangTua,
      nomorTelepon: guest.nomorWhatsApp,
      alamat: guest.alamatDomisili,
      kecamatan: guest.kecamatan,
      asalSekolah: guest.asalSekolah,
      ragamDisabilitas: guest.indikasiAwal,
      status: 'aktif',
      terdaftarSejak: new Date().toISOString().split('T')[0],
      catatanKhusus: `Asal pendaftaran: ${guest.nomorRegistrasi} (${guest.jenjangPendidikan} - NISN/NPSN: ${guest.nisnOrNpsn || '-'}). Terdaftar DAPODIK.`
    };

    pesertaList.unshift(newPeserta);
    localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(pesertaList));

    // Update guest record
    guest.status = 'terbit_akun_peserta';
    guest.pesertaIdDihasilkan = newPeserta.id;
    guest.pinDihasilkan = generatedPin;
    if (catatanPetugas) guest.catatanPetugas = catatanPetugas;
    guestList[guestIdx] = guest;
    localStorage.setItem(STORAGE_KEYS.ASESMEN, JSON.stringify(guestList));

    if (this.client) {
      // 1. Update guest record
      this.client.from('pendaftaran_asesmen_guest').update({
        status: guest.status,
        peserta_id_dihasilkan: guest.pesertaIdDihasilkan,
        pin_dihasilkan: guest.pinDihasilkan,
        catatan_petugas: guest.catatanPetugas || null
      }).eq('id', guestId).then(({ error }) => {
        if (error) console.error('Supabase direct guest update error:', error);
      }).catch(console.warn);

      // 2. Upsert new peserta
      this.client.from('peserta').upsert({
        id: newPeserta.id,
        nomor_rekam_medis: newPeserta.nomorRekamMedis,
        nama_lengkap: newPeserta.namaLengkap,
        pin: newPeserta.pin,
        tanggal_lahir: newPeserta.tanggalLahir,
        jenis_kelamin: newPeserta.jenisKelamin,
        nama_wali: newPeserta.namaWali,
        nomor_telepon: newPeserta.nomorTelepon,
        alamat: newPeserta.alamat,
        kecamatan: newPeserta.kecamatan,
        asal_sekolah: newPeserta.asalSekolah || null,
        ragam_disabilitas: newPeserta.ragamDisabilitas,
        status: newPeserta.status,
        terdaftar_sejak: newPeserta.terdaftarSejak,
        catatan_khusus: newPeserta.catatanKhusus || null
      }).then(({ error }) => {
        if (error) console.error('Supabase direct verifikasi terbitkan peserta error:', error);
      }).catch(console.warn);
    }

    this.triggerAutoSync();

    return { success: true, peserta: newPeserta };
  }

  // --- STATISTIK ---
  public getStatistik(): StatistikULD {
    const peserta = this.getPesertaList();
    const terapis = this.getTerapisList();
    const bookings = this.getBookingsList();
    const asesmen = this.getAsesmenGuestList();

    return {
      totalPesertaAktif: peserta.filter(p => p.status === 'aktif').length,
      totalTerapis: terapis.filter(t => t.isActive).length,
      totalBookingBulanIni: bookings.length,
      totalAsesmenMenungguVerifikasi: asesmen.filter(a => a.status === 'menunggu_verifikasi_fisik').length
    };
  }

  // --- LOG AKTIVITAS SISTEM ---
  public generateInitialLogs(): LogAktivitas[] {
    const today = new Date().toISOString().split('T')[0];
    return [
      {
        id: 'log-init-1',
        waktu: `${today} 09:30 WIB`,
        kategori: 'pendaftaran_terapi',
        judul: 'Pendaftaran Terapi di Loket ULD',
        deskripsi: 'Siswa Muhammad Rayhan Pratama (ULD-PROB-2026-0001) didaftarkan ke sesi Terapi Perilaku (ABA) di Loket ULD.',
        pelaku: 'Petugas Admin Sugeng',
        rolePelaku: 'admin',
        icon: '🏥'
      },
      {
        id: 'log-init-2',
        waktu: `${today} 09:15 WIB`,
        kategori: 'pendaftaran_terapi',
        judul: 'Pendaftaran Terapi di Loket ULD',
        deskripsi: 'Siswa Siti Aisyah Nur (ULD-PROB-2026-0002) didaftarkan ke sesi Fisioterapi di Loket ULD.',
        pelaku: 'Petugas Admin Helmi',
        rolePelaku: 'admin',
        icon: '🏥'
      },
      {
        id: 'log-init-3',
        waktu: `${today} 08:45 WIB`,
        kategori: 'asesmen',
        judul: 'Penjadwalan Asesmen Baru',
        deskripsi: 'Calon siswa Bima Sakti Wardhana (Wali: Ibu Wardani) dijadwalkan untuk asesmen awal tumbuh kembang loket.',
        pelaku: 'Petugas Admin Sugeng',
        rolePelaku: 'admin',
        icon: '📅'
      },
      {
        id: 'log-init-4',
        waktu: `${today} 08:20 WIB`,
        kategori: 'jadwal_slot',
        judul: 'Pembukaan Sesi Harian Terapi',
        deskripsi: 'Tenaga Ahli membuka sesi pelayanan reguler Senin-Jumat pukul 09.00 - 13.00 WIB.',
        pelaku: 'Sri Wahyuni, S.Tr.Kes. (Terapis Wicara)',
        rolePelaku: 'terapis',
        icon: '🗓️'
      },
      {
        id: 'log-init-5',
        waktu: `${today} 08:00 WIB`,
        kategori: 'sistem',
        judul: 'Inisialisasi Sistem Loket & Layanan ULD',
        deskripsi: 'Sistem operasional Unit Layanan Disabilitas Kota Probolinggo aktif dengan sinkronisasi data 4 Tenaga Ahli dan Loket Administrasi.',
        pelaku: 'Sistem ULD',
        rolePelaku: 'sistem',
        icon: '🚀'
      }
    ];
  }

  public getAktivitasLogs(): LogAktivitas[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LOGS);
      if (data) return JSON.parse(data);
      const initialLogs = this.generateInitialLogs();
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(initialLogs));
      return initialLogs;
    } catch {
      return this.generateInitialLogs();
    }
  }

  public catatAktivitas(log: Omit<LogAktivitas, 'id' | 'waktu'> & { waktu?: string }): LogAktivitas {
    const list = this.getAktivitasLogs();
    const { fullStr } = getWIBDate();
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const timeFormatted = `${dateFormatted} ${fullStr.split(' ')[1] || 'WIB'}`;

    const newLog: LogAktivitas = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      waktu: log.waktu || timeFormatted,
      ...log
    };

    list.unshift(newLog);
    // Keep max 500 logs
    const trimmed = list.slice(0, 500);
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(trimmed));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('uld_log_updated', { detail: newLog }));
    }

    if (this.client) {
      this.client.from('log_aktivitas').insert({
        id: newLog.id,
        waktu: newLog.waktu,
        kategori: newLog.kategori,
        judul: newLog.judul,
        deskripsi: newLog.deskripsi,
        pelaku: newLog.pelaku,
        role_pelaku: newLog.rolePelaku || null,
        icon: newLog.icon || null,
        metadata: newLog.metadata || null
      }).then(({ error }) => {
        if (error) console.warn('Supabase direct log_aktivitas insert error:', error.message);
      }).catch(console.warn);
    }

    this.triggerAutoSync();
    return newLog;
  }

  public bersihkanSemuaLog(): void {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify([]));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('uld_log_updated', { detail: [] }));
    }
    if (this.client) {
      this.client.from('log_aktivitas').delete().neq('id', '___all___').then(({ error }) => {
        if (error) console.warn('Supabase clean logs error:', error.message);
      }).catch(console.warn);
    }
  }

  public resetLogsToInitial(): void {
    const init = this.generateInitialLogs();
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(init));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('uld_log_updated', { detail: init }));
    }
  }

  // --- SQL SCHEMA EXPORT FOR SUPABASE ---
  public generateSupabaseSqlSchema(): string {
    return `-- ========================================================
-- SKEMA BASIS DATA SUPABASE (POSTGRESQL)
-- UNIT LAYANAN DISABILITAS (ULD) KOTA PROBOLINGGO
-- ========================================================

-- 1. Tabel Tenaga Ahli / Terapis
CREATE TABLE IF NOT EXISTS public.terapis (
    id TEXT PRIMARY KEY,
    nip_or_id TEXT UNIQUE NOT NULL,
    nama TEXT NOT NULL,
    gelar TEXT NOT NULL,
    spesialisasi VARCHAR(50) NOT NULL CHECK (spesialisasi IN ('terapis_perilaku', 'fisioterapis', 'tenaga_plb', 'psikolog')),
    spesialisasi_label TEXT NOT NULL,
    pin VARCHAR(6) NOT NULL,
    nomor_telepon TEXT NOT NULL,
    deskripsi TEXT,
    ruang_praktek TEXT NOT NULL,
    foto_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Tabel Petugas Admin Loket (Sugeng & Helmi)
CREATE TABLE IF NOT EXISTS public.admin_users (
    id TEXT PRIMARY KEY,
    nama TEXT NOT NULL,
    role_title TEXT NOT NULL,
    pin VARCHAR(6) NOT NULL,
    nomor_telepon TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Tabel Peserta / Siswa Terapi Rutin
CREATE TABLE IF NOT EXISTS public.peserta (
    id TEXT PRIMARY KEY,
    nomor_rekam_medis TEXT UNIQUE NOT NULL,
    nama_lengkap TEXT NOT NULL,
    pin VARCHAR(6) NOT NULL,
    tanggal_lahir DATE NOT NULL,
    jenis_kelamin VARCHAR(1) CHECK (jenis_kelamin IN ('L', 'P')),
    nama_wali TEXT NOT NULL,
    nomor_telepon TEXT NOT NULL,
    alamat TEXT NOT NULL,
    kecamatan TEXT NOT NULL,
    asal_sekolah TEXT,
    ragam_disabilitas TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif', 'selesai_program', 'lulus')),
    terdaftar_sejak DATE DEFAULT CURRENT_DATE,
    catatan_khusus TEXT,
    assigned_terapis_id TEXT REFERENCES public.terapis(id) ON DELETE SET NULL,
    assigned_terapis_nama TEXT,
    assigned_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Tabel Slot Harian Layanan Terapi (Senin - Jumat 09.00 - 13.00 WIB)
CREATE TABLE IF NOT EXISTS public.slots_harian (
    id TEXT PRIMARY KEY,
    terapis_id TEXT NOT NULL REFERENCES public.terapis(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL,
    jam_mulai VARCHAR(5) NOT NULL,
    jam_selesai VARCHAR(5) NOT NULL,
    spesialisasi VARCHAR(50) NOT NULL,
    ruang TEXT NOT NULL,
    kuota_maksimal INTEGER DEFAULT 1,
    kuota_terisi INTEGER DEFAULT 0,
    catatan_terapis TEXT,
    status_slot VARCHAR(20) DEFAULT 'tersedia' CHECK (status_slot IN ('tersedia', 'penuh', 'dibatalkan')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Tabel Booking Pendaftaran Terapi
CREATE TABLE IF NOT EXISTS public.booking_terapi (
    id TEXT PRIMARY KEY,
    slot_id TEXT NOT NULL REFERENCES public.slots_harian(id) ON DELETE CASCADE,
    peserta_id TEXT NOT NULL REFERENCES public.peserta(id) ON DELETE CASCADE,
    terapis_id TEXT NOT NULL REFERENCES public.terapis(id) ON DELETE CASCADE,
    kode_booking TEXT UNIQUE NOT NULL,
    tanggal DATE NOT NULL,
    jam_mulai VARCHAR(5) NOT NULL,
    jam_selesai VARCHAR(5) NOT NULL,
    spesialisasi VARCHAR(50) NOT NULL,
    ruang TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'terjadwal' CHECK (status IN ('menunggu_konfirmasi', 'terjadwal', 'hadir', 'selesai', 'tidak_hadir', 'batal')),
    keluhan_hari_ini TEXT,
    catatan_sesi_terapis TEXT,
    didaftarkan_oleh_admin TEXT,
    reschedule_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Tabel Pendaftaran Asesmen Awal Guest
CREATE TABLE IF NOT EXISTS public.pendaftaran_asesmen_guest (
    id TEXT PRIMARY KEY,
    nomor_registrasi TEXT UNIQUE NOT NULL,
    nama_anak TEXT NOT NULL,
    tanggal_lahir DATE NOT NULL,
    jenis_kelamin VARCHAR(1) CHECK (jenis_kelamin IN ('L', 'P')),
    nama_orang_tua TEXT NOT NULL,
    nik_anak_or_kk TEXT NOT NULL,
    nomor_whatsapp TEXT NOT NULL,
    alamat_domisili TEXT NOT NULL,
    kecamatan TEXT NOT NULL,
    jenjang_pendidikan TEXT,
    asal_sekolah TEXT,
    nisn_or_npsn TEXT,
    sudah_terdaftar_dapodik BOOLEAN DEFAULT FALSE,
    indikasi_awal TEXT NOT NULL,
    dokumen_akan_dibawa TEXT[] NOT NULL DEFAULT '{}',
    tanggal_rencana_datang DATE NOT NULL,
    jam_rencana_datang TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'menunggu_verifikasi_fisik' CHECK (status IN ('menunggu_verifikasi_fisik', 'dokumen_diverifikasi', 'terbit_akun_peserta', 'batal')),
    peserta_id_dihasilkan TEXT REFERENCES public.peserta(id),
    pin_dihasilkan VARCHAR(6),
    catatan_petugas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Tabel Audit Log Aktivitas Sistem Operasional ULD
CREATE TABLE IF NOT EXISTS public.log_aktivitas (
    id TEXT PRIMARY KEY,
    waktu TEXT NOT NULL,
    kategori TEXT NOT NULL,
    judul TEXT NOT NULL,
    deskripsi TEXT NOT NULL,
    pelaku TEXT NOT NULL,
    role_pelaku TEXT,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. Tabel Pengosongan Jadwal Rutin (Sepanjang Minggu Selamanya Sampai Di-revoke)
CREATE TABLE IF NOT EXISTS public.pengosongan_jadwal_rutin (
    id TEXT PRIMARY KEY,
    terapis_id TEXT NOT NULL REFERENCES public.terapis(id) ON DELETE CASCADE,
    hari INTEGER NOT NULL,
    hari_label VARCHAR(30) NOT NULL,
    jam_mulai VARCHAR(5) NOT NULL,
    jam_selesai VARCHAR(5),
    label_sesi TEXT NOT NULL,
    alasan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS Policies
ALTER TABLE public.terapis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peserta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slots_harian ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_terapi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pendaftaran_asesmen_guest ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_aktivitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengosongan_jadwal_rutin ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read/Write Terapis" ON public.terapis FOR ALL USING (true);
CREATE POLICY "Public Read/Write Admin" ON public.admin_users FOR ALL USING (true);
CREATE POLICY "Public Read/Write Peserta" ON public.peserta FOR ALL USING (true);
CREATE POLICY "Public Read/Write Slots" ON public.slots_harian FOR ALL USING (true);
CREATE POLICY "Public Read/Write Bookings" ON public.booking_terapi FOR ALL USING (true);
CREATE POLICY "Public Read/Write Asesmen" ON public.pendaftaran_asesmen_guest FOR ALL USING (true);
CREATE POLICY "Public Read/Write Logs" ON public.log_aktivitas FOR ALL USING (true);
CREATE POLICY "Public Read/Write PengosonganRutin" ON public.pengosongan_jadwal_rutin FOR ALL USING (true);
`;
  }
}

export const db = new SupabaseDataService();
