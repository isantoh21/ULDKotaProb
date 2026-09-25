export type UserRole = 'guest' | 'peserta' | 'terapis' | 'admin';

export type TerapisSpesialisasi = 
  | 'terapis_perilaku'
  | 'fisioterapis'
  | 'tenaga_plb'
  | 'psikolog';

export interface Peserta {
  id: string;
  nomorRekamMedis: string; // e.g., ULD-PROB-2026-001
  namaLengkap: string;
  pin: string; // 6 digit PIN provided by admin
  tanggalLahir: string;
  jenisKelamin: 'L' | 'P';
  namaWali: string;
  nomorTelepon: string;
  alamat: string;
  kecamatan: string; // Wonoasih, Mayangan, Kanigaran, Kedopok, Kademangan
  ragamDisabilitas: string; // Spektrum Autisme, Cerebral Palsy, Down Syndrome, dll.
  asalSekolah?: string;
  status: 'aktif' | 'nonaktif' | 'selesai_program';
  terdaftarSejak: string;
  catatanKhusus?: string;
  assignedTerapisId?: string; // ID terapis yang di-assign secara tetap
  assignedTerapisNama?: string; // Nama terapis tetap
  assignedAt?: string; // Tanggal penetapan
}

export interface Terapis {
  id: string;
  nipOrId: string;
  nama: string;
  gelar: string;
  spesialisasi: TerapisSpesialisasi;
  spesialisasiLabel: string;
  pin: string; // PIN for quick login
  nomorTelepon: string;
  deskripsi: string;
  ruangPraktek: string;
  fotoUrl?: string;
  isActive: boolean;
}

export interface SlotHarian {
  id: string;
  terapisId: string;
  tanggal: string; // YYYY-MM-DD
  jamMulai: string; // HH:mm
  jamSelesai: string; // HH:mm
  spesialisasi: TerapisSpesialisasi;
  ruang: string;
  kuotaMaksimal: number;
  kuotaTerisi: number;
  catatanTerapis?: string;
  statusSlot: 'tersedia' | 'penuh' | 'dibatalkan';
  createdAt: string;
}

export interface PengosonganJadwalRutin {
  id: string;
  terapisId: string;
  hari: number; // 1 = Senin, 2 = Selasa, 3 = Rabu, 4 = Kamis, 5 = Jumat, -1 = Setiap Hari (Senin - Jumat)
  hariLabel: string; // 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Setiap Hari Kerja'
  jamMulai: string; // '09:00', '10:00', '11:00', '12:00', or 'SEMUA'
  jamSelesai?: string; // '10:00', '11:00', '12:00', '13:00', or 'SEMUA'
  labelSesi: string; // e.g. 'Sesi 1 (09.00 - 10.00 WIB)' or 'Semua Sesi (09.00 - 13.00 WIB)'
  alasan?: string;
  createdAt: string;
}

export interface BookingTerapi {
  id: string;
  slotId: string;
  pesertaId: string;
  namaPeserta?: string;
  nomorRekamMedis?: string;
  asalSekolah?: string;
  terapisId: string;
  kodeBooking: string; // e.g. TRP-2609-001
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  spesialisasi: TerapisSpesialisasi;
  ruang: string;
  status: 'menunggu_konfirmasi' | 'terjadwal' | 'hadir' | 'selesai' | 'tidak_hadir' | 'batal';
  keluhanHariIni?: string;
  catatanSesiTerapis?: string;
  didaftarkanOlehAdmin?: string; // e.g. 'Sugeng' or 'Helmi'
  rescheduleCount?: number; // Maksimal 1 kali ganti jadwal mandiri oleh peserta
  createdAt: string;
}

export interface PendaftaranAsesmenGuest {
  id: string;
  nomorRegistrasi: string; // e.g. ASM-PROB-2026-089
  namaAnak: string;
  tanggalLahir: string;
  jenisKelamin: 'L' | 'P';
  namaOrangTua: string;
  nikAnakOrKK: string;
  nomorWhatsApp: string;
  alamatDomisili: string;
  kecamatan: string;
  jenjangPendidikan: 'PAUD/TK' | 'SD/MI' | 'SMP/MTs';
  asalSekolah: string;
  nisnOrNpsn: string;
  sudahTerdaftarDapodik: boolean;
  indikasiAwal: string; // Gejala atau dugaan kebutuhan khusus
  dokumenAkanDibawa: string[]; // KK, KTP Wali, Buku KIA, Rujukan Puskesmas/RSUD, Bukti Dapodik
  tanggalRencanaDatang: string; // Tanggal verifikasi berkas langsung ke ULD
  jamRencanaDatang: string;
  status: 'menunggu_verifikasi_fisik' | 'dokumen_diverifikasi' | 'terbit_akun_peserta' | 'batal';
  pesertaIdDihasilkan?: string; // ID Peserta if verified
  pinDihasilkan?: string;
  catatanPetugas?: string;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  nama: string;
  roleTitle: string;
  pin: string;
  nomorTelepon: string;
}

export interface StatistikULD {
  totalPesertaAktif: number;
  totalTerapis: number;
  totalBookingBulanIni: number;
  totalAsesmenMenungguVerifikasi: number;
}

export type KategoriAktivitas = 
  | 'pendaftaran_terapi' 
  | 'asesmen' 
  | 'manajemen_siswa' 
  | 'penugasan_terapis'
  | 'jadwal_slot' 
  | 'keamanan_pin' 
  | 'sistem';

export interface LogAktivitas {
  id: string;
  waktu: string;
  kategori: KategoriAktivitas;
  judul: string;
  deskripsi: string;
  pelaku: string;
  rolePelaku: 'admin' | 'terapis' | 'peserta' | 'sistem';
  icon?: string;
  metadata?: Record<string, any>;
}
