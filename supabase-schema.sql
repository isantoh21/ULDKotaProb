-- ====================================================================
-- SKEMA BASIS DATA & SEED DATA SUPABASE (POSTGRESQL)
-- UNIT LAYANAN DISABILITAS (ULD) KOTA PROBOLINGGO
-- Sistem Pendaftaran Terapi, Asesmen & Log Aktivitas
-- ====================================================================

-- 1. TABEL TENAGA AHLI / TERAPIS (4 PILAR LAYANAN)
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

-- 2. TABEL PETUGAS ADMIN LOKET (SUGENG & HELMI)
CREATE TABLE IF NOT EXISTS public.admin_users (
    id TEXT PRIMARY KEY,
    nama TEXT NOT NULL,
    role_title TEXT NOT NULL,
    pin VARCHAR(6) NOT NULL,
    nomor_telepon TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. TABEL PESERTA / SISWA TERAPI RUTIN
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

-- 4. TABEL SLOT HARIAN LAYANAN TERAPI (SENIN - JUMAT 09.00 - 13.00 WIB)
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

-- 5. TABEL BOOKING PENDAFTARAN TERAPI
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

-- 6. TABEL PENDAFTARAN ASESMEN AWAL LOKET
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

-- 7. TABEL AUDIT LOG AKTIVITAS SISTEM OPERASIONAL ULD
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

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.terapis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peserta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slots_harian ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_terapi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pendaftaran_asesmen_guest ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_aktivitas ENABLE ROW LEVEL SECURITY;

-- Kebijakan akses publik (menggunakan Anon Key client-side)
CREATE POLICY "Public Read/Write Terapis" ON public.terapis FOR ALL USING (true);
CREATE POLICY "Public Read/Write Admin" ON public.admin_users FOR ALL USING (true);
CREATE POLICY "Public Read/Write Peserta" ON public.peserta FOR ALL USING (true);
CREATE POLICY "Public Read/Write Slots" ON public.slots_harian FOR ALL USING (true);
CREATE POLICY "Public Read/Write Bookings" ON public.booking_terapi FOR ALL USING (true);
CREATE POLICY "Public Read/Write Asesmen" ON public.pendaftaran_asesmen_guest FOR ALL USING (true);
CREATE POLICY "Public Read/Write Logs" ON public.log_aktivitas FOR ALL USING (true);

-- ====================================================================
-- SEED DATA AWAL: 4 TENAGA AHLI & 2 PETUGAS ADMIN
-- ====================================================================
INSERT INTO public.admin_users (id, nama, role_title, pin, nomor_telepon)
VALUES 
    ('admin-1', 'Sugeng', 'Admin 1 ULD Kota Probolinggo', '990011', '6285236028521'),
    ('admin-2', 'Helmi', 'Admin 2 ULD Kota Probolinggo', '990022', '6282247952696')
ON CONFLICT (id) DO UPDATE SET 
    nama = EXCLUDED.nama,
    pin = EXCLUDED.pin,
    nomor_telepon = EXCLUDED.nomor_telepon;

INSERT INTO public.terapis (id, nip_or_id, nama, gelar, spesialisasi, spesialisasi_label, pin, nomor_telepon, deskripsi, ruang_praktek, is_active)
VALUES
    ('terapis-1', 'TP-AHMAD-01', 'Ahmad Hafizul Adly, S.Pd.', 'Terapis Perilaku (Behavior Therapist)', 'terapis_perilaku', 'Terapis Perilaku', '223344', '081234567891', 'Fokus intervensi perilaku terapan (ABA), pembiasaan instruksi, bina diri, dan modifikasi tantrum.', 'Ruang Terapi Perilaku & Sensori 1', true),
    ('terapis-2', 'FT-INDARYATI-02', 'Indaryati Machmudi A.Md.Ft.', 'Fisioterapis Pediatrik', 'fisioterapis', 'Fisioterapis', '445566', '081234567892', 'Spesialis stimulasi motorik kasar, latihan penguatan otot, postur, keseimbangan dinamis, dan fisioterapi.', 'Ruang Fisioterapi Gimnasium Inklusif', true),
    ('terapis-3', 'PLB-SALMA-03', 'Salma Salwa Salsabila, S.Pd.', 'Tenaga Pendidikan Luar Biasa (PLB)', 'tenaga_plb', 'Tenaga PLB', '334455', '081234567893', 'Bimbingan kesiapan sekolah inklusi, PPI individual, simbol visual alternatif, dan remedial pra-akademik.', 'Ruang Edukasi & Remedial PLB', true),
    ('terapis-4', 'PSI-IKHSAN-04', 'Muhammad Ikhsan, M.Psi., Psikolog', 'Psikolog Klinis & Perkembangan Anak', 'psikolog', 'Psikolog', '112233', '081234567894', 'Pemeriksaan psikologis komprehensif, asesmen kognitif (IQ), diagnosa autisme/ADHD, konseling keluarga.', 'Ruang Konseling & Observasi Psikologi', true)
ON CONFLICT (id) DO UPDATE SET
    nama = EXCLUDED.nama,
    pin = EXCLUDED.pin,
    ruang_praktek = EXCLUDED.ruang_praktek;

-- ====================================================================
-- SEED DATA AWAL: SISWA TERDAFTAR DENGAN PENETAPAN TERAPIS PEMBINA TETAP
-- ====================================================================
INSERT INTO public.peserta (id, nomor_rekam_medis, nama_lengkap, pin, tanggal_lahir, jenis_kelamin, nama_wali, nomor_telepon, alamat, kecamatan, asal_sekolah, ragam_disabilitas, status, assigned_terapis_id, assigned_terapis_nama, assigned_at)
VALUES
    ('peserta-01', 'ULD-PROB-2026-0001', 'Abimanyu Tri Yoga', '100001', '2019-03-15', 'L', 'Bambang Triyono', '081234567801', 'Jl. Mastrip No. 12', 'Kedopok', 'TK Dharma Wanita 1', 'Autism Spectrum Disorder (ASD)', 'aktif', 'terapis-1', 'Ahmad Hafizul Adly, S.Pd.', '2026-09-01T08:00:00Z'),
    ('peserta-02', 'ULD-PROB-2026-0002', 'Aisyah Putri Rahmadani', '100002', '2020-07-22', 'P', 'Siti Rahmawati', '081234567802', 'Jl. Hayam Wuruk No. 45', 'Mayangan', 'PAUD Terpadu Kasih Ibu', 'Speech Delay / Keterlambatan Bicara', 'aktif', 'terapis-1', 'Ahmad Hafizul Adly, S.Pd.', '2026-09-01T08:00:00Z'),
    ('peserta-03', 'ULD-PROB-2026-0003', 'Alvaro Devano Pratama', '100003', '2018-11-05', 'L', 'Hendra Pratama', '081234567803', 'Jl. Cokroaminoto Gg. 3', 'Kanigaran', 'SDN Sukabumi 2 (Inklusi)', 'Cerebral Palsy (Diplegia Ringan)', 'aktif', 'terapis-2', 'Indaryati Machmudi A.Md.Ft.', '2026-09-01T08:00:00Z'),
    ('peserta-04', 'ULD-PROB-2026-0004', 'Aqila Bilqis Humaira', '100004', '2019-09-30', 'P', 'Nur Hidayah', '081234567804', 'Jl. Sunan Kalijaga No. 18', 'Wonoasih', 'TK Pertiwi Kanigaran', 'Down Syndrome', 'aktif', 'terapis-2', 'Indaryati Machmudi A.Md.Ft.', '2026-09-01T08:00:00Z'),
    ('peserta-05', 'ULD-PROB-2026-0005', 'Bagus Satria Wibowo', '100005', '2017-05-14', 'L', 'Agus Wibowo', '081234567805', 'Jl. Supriyadi No. 89', 'Kademangan', 'SDN Wonoasih 1', 'ADHD & Disregulasi Sensori', 'aktif', 'terapis-3', 'Salma Salwa Salsabila, S.Pd.', '2026-09-01T08:00:00Z'),
    ('peserta-06', 'ULD-PROB-2026-0006', 'Cantika Dewi Lestari', '100006', '2020-01-18', 'P', 'Dewi Sartika', '081234567806', 'Jl. Ikan Kerapu No. 23', 'Mayangan', 'TK Al-Irsyad', 'Global Developmental Delay (GDD)', 'aktif', 'terapis-3', 'Salma Salwa Salsabila, S.Pd.', '2026-09-01T08:00:00Z'),
    ('peserta-07', 'ULD-PROB-2026-0007', 'Daffa Danendra Kusuma', '100007', '2018-08-09', 'L', 'Kuswanto', '081234567807', 'Jl. Basuki Rahmat No. 67', 'Kanigaran', 'SDN Tisnonegaran 1', 'Hambatan Intelektual Ringan', 'aktif', 'terapis-4', 'Muhammad Ikhsan, M.Psi., Psikolog', '2026-09-01T08:00:00Z'),
    ('peserta-08', 'ULD-PROB-2026-0008', 'Elvina Zahra Qatrunnada', '100008', '2019-12-03', 'P', 'Fitria Indriani', '081234567808', 'Jl. KH. Mansyur Gg. Mawar', 'Mayangan', 'TK Tunas Bangsa', 'Selective Mutism & Kecemasan Sosial', 'aktif', 'terapis-4', 'Muhammad Ikhsan, M.Psi., Psikolog', '2026-09-01T08:00:00Z'),
    ('peserta-09', 'ULD-PROB-2026-0009', 'Fajar Ramadhan Al-Ghifari', '100009', '2021-04-12', 'L', 'Achmad Subagyo', '081234567809', 'Jl. KH. Hasan Genggong', 'Kedopok', 'PAUD Kasih Bunda', 'Speech Delay & Oral Motor Immaturity', 'aktif', NULL, NULL, NULL),
    ('peserta-10', 'ULD-PROB-2026-0010', 'Ghaida Naura Sabrina', '100010', '2019-06-25', 'P', 'Eko Prasetyo', '081234567810', 'Jl. Serma Abdurrahman', 'Kanigaran', 'TK Kartika IV-69', 'Keterlambatan Motorik Halus & Bilateral', 'aktif', NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
    nama_lengkap = EXCLUDED.nama_lengkap,
    pin = EXCLUDED.pin,
    assigned_terapis_id = EXCLUDED.assigned_terapis_id,
    assigned_terapis_nama = EXCLUDED.assigned_terapis_nama;

-- ====================================================================
-- SEED DATA AWAL: LOG AKTIVITAS SISTEM
-- ====================================================================
INSERT INTO public.log_aktivitas (id, waktu, kategori, judul, deskripsi, pelaku, role_pelaku, icon)
VALUES
    ('log-init-1', '25 Sep 2026 09:30 WIB', 'pendaftaran_terapi', 'Pendaftaran Terapi di Loket ULD', 'Siswa Abimanyu Tri Yoga (ULD-PROB-2026-0001) didaftarkan ke sesi Terapi Perilaku (ABA) di Loket ULD.', 'Petugas Admin Sugeng', 'admin', '🏥'),
    ('log-init-2', '25 Sep 2026 09:15 WIB', 'pendaftaran_terapi', 'Pendaftaran Terapi di Loket ULD', 'Siswa Alvaro Devano Pratama (ULD-PROB-2026-0003) didaftarkan ke sesi Fisioterapi di Loket ULD.', 'Petugas Admin Helmi', 'admin', '🏥'),
    ('log-init-3', '25 Sep 2026 08:45 WIB', 'asesmen', 'Penjadwalan Asesmen Baru', 'Calon siswa Bima Sakti Wardhana (Wali: Ibu Wardani) dijadwalkan untuk asesmen awal tumbuh kembang loket.', 'Petugas Admin Sugeng', 'admin', '📅'),
    ('log-init-4', '25 Sep 2026 08:20 WIB', 'jadwal_slot', 'Pembukaan Sesi Harian Terapi', 'Tenaga Ahli membuka sesi pelayanan reguler Senin-Jumat pukul 09.00 - 13.00 WIB.', 'Ahmad Hafizul Adly, S.Pd. (Terapis Perilaku)', 'terapis', '🗓️'),
    ('log-init-5', '25 Sep 2026 08:00 WIB', 'sistem', 'Inisialisasi Sistem Loket & Layanan ULD', 'Sistem operasional Unit Layanan Disabilitas Kota Probolinggo aktif dengan sinkronisasi data 4 Tenaga Ahli dan Loket Administrasi.', 'Sistem ULD', 'sistem', '🚀')
ON CONFLICT (id) DO NOTHING;
