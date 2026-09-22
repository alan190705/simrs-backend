import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ============================================================
// DEFINISI MODUL & PERMISSION
// User → Role → Module Access → Permission
// ============================================================

interface ModuleDef {
  code: string;
  name: string;
  group: string;
  icon?: string;
  order: number;
  permissions: { code: string; name: string }[];
}

const DEFAULT_PERMS = (modName: string) => [
  { code: 'view', name: `Lihat ${modName}` },
  { code: 'create', name: `Buat ${modName}` },
  { code: 'update', name: `Ubah ${modName}` },
  { code: 'delete', name: `Hapus ${modName}` },
];

const MODULES: ModuleDef[] = [
  // ==================== DASHBOARD ====================
  {
    code: 'dashboard',
    name: 'Dashboard',
    group: 'Utama',
    icon: 'LayoutDashboard',
    order: 1,
    permissions: [{ code: 'view', name: 'Lihat Dashboard' }],
  },

  // ==================== PENDAFTARAN ====================
  {
    code: 'loket',
    name: 'Loket',
    group: 'Pendaftaran',
    icon: 'Building2',
    order: 10,
    permissions: DEFAULT_PERMS('Loket'),
  },
  {
    code: 'pasien',
    name: 'Pasien',
    group: 'Pendaftaran',
    icon: 'Users',
    order: 11,
    permissions: DEFAULT_PERMS('Pasien'),
  },
  {
    code: 'antrean',
    name: 'Antrean',
    group: 'Pendaftaran',
    icon: 'ListOrdered',
    order: 12,
    permissions: DEFAULT_PERMS('Antrean'),
  },
  {
    code: 'registrasi',
    name: 'Registrasi',
    group: 'Pendaftaran',
    icon: 'ClipboardPlus',
    order: 13,
    permissions: DEFAULT_PERMS('Registrasi'),
  },

  // ==================== PELAYANAN ====================
  {
    code: 'rawat-jalan',
    name: 'Rawat Jalan',
    group: 'Pelayanan',
    icon: 'Stethoscope',
    order: 20,
    permissions: DEFAULT_PERMS('Rawat Jalan'),
  },
  {
    code: 'igd',
    name: 'IGD',
    group: 'Pelayanan',
    icon: 'Siren',
    order: 21,
    permissions: DEFAULT_PERMS('IGD'),
  },
  {
    code: 'rawat-inap',
    name: 'Rawat Inap',
    group: 'Pelayanan',
    icon: 'Bed',
    order: 22,
    permissions: DEFAULT_PERMS('Rawat Inap'),
  },
  {
    code: 'bedah-sentral',
    name: 'Bedah Sentral',
    group: 'Pelayanan',
    icon: 'Scissors',
    order: 23,
    permissions: DEFAULT_PERMS('Bedah Sentral'),
  },
  {
    code: 'rehabilitasi',
    name: 'Rehabilitasi',
    group: 'Pelayanan',
    icon: 'Activity',
    order: 24,
    permissions: DEFAULT_PERMS('Rehabilitasi'),
  },
  {
    code: 'medical-check-up',
    name: 'Medical Check Up',
    group: 'Pelayanan',
    icon: 'ClipboardCheck',
    order: 25,
    permissions: DEFAULT_PERMS('Medical Check Up'),
  },
  {
    code: 'manajemen-nyeri',
    name: 'Manajemen Nyeri',
    group: 'Pelayanan',
    icon: 'Syringe',
    order: 26,
    permissions: DEFAULT_PERMS('Manajemen Nyeri'),
  },
  {
    code: 'kedokteran-forensik',
    name: 'Kedokteran Forensik',
    group: 'Pelayanan',
    icon: 'FileSearch',
    order: 27,
    permissions: DEFAULT_PERMS('Kedokteran Forensik'),
  },
  {
    code: 'okupasi',
    name: 'Okupasi',
    group: 'Pelayanan',
    icon: 'BriefcaseMedical',
    order: 28,
    permissions: DEFAULT_PERMS('Okupasi'),
  },

  // ==================== REKAM MEDIS ====================
  {
    code: 'rekam-medis',
    name: 'Rekam Medis',
    group: 'Rekam Medis',
    icon: 'FileText',
    order: 30,
    permissions: DEFAULT_PERMS('Rekam Medis'),
  },
  {
    code: 'resume-medis',
    name: 'Resume Medis',
    group: 'Rekam Medis',
    icon: 'FileCheck',
    order: 31,
    permissions: DEFAULT_PERMS('Resume Medis'),
  },
  {
    code: 'pelepasan-informasi',
    name: 'Pelepasan Informasi Medis',
    group: 'Rekam Medis',
    icon: 'FileOutput',
    order: 32,
    permissions: DEFAULT_PERMS('Pelepasan Informasi Medis'),
  },

  // ==================== PENUNJANG MEDIS ====================
  {
    code: 'farmasi',
    name: 'Farmasi',
    group: 'Penunjang Medis',
    icon: 'Pill',
    order: 40,
    permissions: DEFAULT_PERMS('Farmasi'),
  },
  {
    code: 'laboratorium',
    name: 'Laboratorium',
    group: 'Penunjang Medis',
    icon: 'FlaskConical',
    order: 41,
    permissions: DEFAULT_PERMS('Laboratorium'),
  },
  {
    code: 'radiologi',
    name: 'Radiologi',
    group: 'Penunjang Medis',
    icon: 'ScanLine',
    order: 42,
    permissions: DEFAULT_PERMS('Radiologi'),
  },

  // ==================== PPI & SURVEILANS ====================
  {
    code: 'ppi',
    name: 'PPI',
    group: 'PPI & Surveilans',
    icon: 'ShieldCheck',
    order: 50,
    permissions: DEFAULT_PERMS('PPI'),
  },
  {
    code: 'sanitasi',
    name: 'Sanitasi',
    group: 'PPI & Surveilans',
    icon: 'Droplets',
    order: 51,
    permissions: DEFAULT_PERMS('Sanitasi'),
  },
  {
    code: 'skdr',
    name: 'SKDR',
    group: 'PPI & Surveilans',
    icon: 'Radar',
    order: 52,
    permissions: DEFAULT_PERMS('SKDR'),
  },
  {
    code: 'spimker',
    name: 'SPIMKER',
    group: 'PPI & Surveilans',
    icon: 'HardHat',
    order: 53,
    permissions: DEFAULT_PERMS('SPIMKER'),
  },
  {
    code: 'esismal',
    name: 'ESISMAL',
    group: 'PPI & Surveilans',
    icon: 'Bug',
    order: 54,
    permissions: DEFAULT_PERMS('ESISMAL'),
  },
  {
    code: 'dbd',
    name: 'DBD',
    group: 'PPI & Surveilans',
    icon: 'Mosquito',
    order: 55,
    permissions: DEFAULT_PERMS('DBD'),
  },
  {
    code: 'p2bb',
    name: 'P2BB',
    group: 'PPI & Surveilans',
    icon: 'Biohazard',
    order: 56,
    permissions: DEFAULT_PERMS('P2BB'),
  },
  {
    code: 'ispa',
    name: 'ISPA',
    group: 'PPI & Surveilans',
    icon: 'Wind',
    order: 57,
    permissions: DEFAULT_PERMS('ISPA'),
  },
  {
    code: 'diare',
    name: 'Diare',
    group: 'PPI & Surveilans',
    icon: 'Thermometer',
    order: 58,
    permissions: DEFAULT_PERMS('Diare'),
  },
  {
    code: 'gigitan-ular',
    name: 'Gigitan Ular',
    group: 'PPI & Surveilans',
    icon: 'AlertTriangle',
    order: 59,
    permissions: DEFAULT_PERMS('Gigitan Ular'),
  },

  // ==================== GIZI ====================
  {
    code: 'laporan-gizi',
    name: 'Laporan Gizi',
    group: 'Gizi',
    icon: 'Apple',
    order: 60,
    permissions: [
      { code: 'view', name: 'Lihat Laporan Gizi' },
      { code: 'export', name: 'Ekspor Laporan Gizi' },
    ],
  },

  // ==================== LAPORAN ====================
  {
    code: 'laporan-rawat-jalan',
    name: 'Laporan Rawat Jalan',
    group: 'Laporan',
    icon: 'FileBarChart',
    order: 70,
    permissions: [
      { code: 'view', name: 'Lihat Laporan Rawat Jalan' },
      { code: 'export', name: 'Ekspor Laporan Rawat Jalan' },
    ],
  },
  {
    code: 'laporan-rawat-inap',
    name: 'Laporan Rawat Inap',
    group: 'Laporan',
    icon: 'FileBarChart',
    order: 71,
    permissions: [
      { code: 'view', name: 'Lihat Laporan Rawat Inap' },
      { code: 'export', name: 'Ekspor Laporan Rawat Inap' },
    ],
  },
  {
    code: 'laporan-igd',
    name: 'Laporan IGD',
    group: 'Laporan',
    icon: 'FileBarChart',
    order: 72,
    permissions: [
      { code: 'view', name: 'Lihat Laporan IGD' },
      { code: 'export', name: 'Ekspor Laporan IGD' },
    ],
  },
  {
    code: 'laporan-farmasi',
    name: 'Laporan Farmasi',
    group: 'Laporan',
    icon: 'FileBarChart',
    order: 73,
    permissions: [
      { code: 'view', name: 'Lihat Laporan Farmasi' },
      { code: 'export', name: 'Ekspor Laporan Farmasi' },
    ],
  },
  {
    code: 'laporan-laboratorium',
    name: 'Laporan Laboratorium',
    group: 'Laporan',
    icon: 'FileBarChart',
    order: 74,
    permissions: [
      { code: 'view', name: 'Lihat Laporan Laboratorium' },
      { code: 'export', name: 'Ekspor Laporan Laboratorium' },
    ],
  },
  {
    code: 'laporan-radiologi',
    name: 'Laporan Radiologi',
    group: 'Laporan',
    icon: 'FileBarChart',
    order: 75,
    permissions: [
      { code: 'view', name: 'Lihat Laporan Radiologi' },
      { code: 'export', name: 'Ekspor Laporan Radiologi' },
    ],
  },
  {
    code: 'laporan-kematian-pbi',
    name: 'Laporan Kematian Pasien PBI',
    group: 'Laporan',
    icon: 'FileBarChart',
    order: 76,
    permissions: [
      { code: 'view', name: 'Lihat Laporan Kematian PBI' },
      { code: 'export', name: 'Ekspor Laporan Kematian PBI' },
    ],
  },
  {
    code: 'laporan-rl',
    name: 'Laporan RL',
    group: 'Laporan',
    icon: 'FileBarChart',
    order: 77,
    permissions: [
      { code: 'view', name: 'Lihat Laporan RL' },
      { code: 'export', name: 'Ekspor Laporan RL' },
    ],
  },

  // ==================== MANAJEMEN ====================
  {
    code: 'user-management',
    name: 'User',
    group: 'Manajemen',
    icon: 'Shield',
    order: 90,
    permissions: DEFAULT_PERMS('User'),
  },
  {
    code: 'role-management',
    name: 'Role',
    group: 'Manajemen',
    icon: 'UserCog',
    order: 91,
    permissions: DEFAULT_PERMS('Role'),
  },
  {
    code: 'module-access',
    name: 'Module Access',
    group: 'Manajemen',
    icon: 'Grid3x3',
    order: 92,
    permissions: DEFAULT_PERMS('Module Access'),
  },
  {
    code: 'permission-management',
    name: 'Permission',
    group: 'Manajemen',
    icon: 'Key',
    order: 93,
    permissions: DEFAULT_PERMS('Permission'),
  },
  {
    code: 'branch-management',
    name: 'Branch',
    group: 'Manajemen',
    icon: 'Building',
    order: 94,
    permissions: DEFAULT_PERMS('Branch'),
  },
  {
    code: 'audit-log',
    name: 'Audit Log',
    group: 'Manajemen',
    icon: 'History',
    order: 95,
    permissions: [
      { code: 'view', name: 'Lihat Audit Log' },
      { code: 'export', name: 'Ekspor Audit Log' },
    ],
  },
];

// ============================================================
// SEED
// ============================================================

async function main() {
  console.log('🌱 Mulai seed database SIMRS...\n');

  // ---------- 1. SEED MODULES & PERMISSIONS ----------
  console.log('📦 Seed modul & permission...');

  let moduleCount = 0;
  let permissionCount = 0;

  for (const mod of MODULES) {
    const module = await prisma.module.upsert({
      where: { code: mod.code },
      update: {
        name: mod.name,
        group: mod.group,
        icon: mod.icon,
        order: mod.order,
      },
      create: {
        code: mod.code,
        name: mod.name,
        group: mod.group,
        icon: mod.icon,
        order: mod.order,
      },
    });
    moduleCount++;

    for (const perm of mod.permissions) {
      await prisma.permission.upsert({
        where: {
          moduleId_code: {
            moduleId: module.id,
            code: perm.code,
          },
        },
        update: { name: perm.name },
        create: {
          moduleId: module.id,
          code: perm.code,
          name: perm.name,
        },
      });
      permissionCount++;
    }
  }

  console.log(`   ✓ ${moduleCount} modul`);
  console.log(`   ✓ ${permissionCount} permission\n`);

  // ---------- 2. SEED BRANCH ----------
  console.log('🏢 Seed cabang...');
  const branch = await prisma.branch.upsert({
    where: { code: 'MAIN' },
    update: {},
    create: {
      code: 'MAIN',
      name: 'Cabang Utama',
    },
  });
  console.log(`   ✓ Cabang: ${branch.name}\n`);

  // ---------- 3. SEED ROLES ----------
  console.log('👥 Seed role...');
  const roleDefs = [
    { code: 'SUPER_ADMIN', name: 'Super Admin', isSystem: true },
    { code: 'ADMIN', name: 'Admin', isSystem: true },
    { code: 'DOKTER', name: 'Dokter', isSystem: false },
    { code: 'PERAWAT', name: 'Perawat', isSystem: false },
    { code: 'BIDAN', name: 'Bidan', isSystem: false },
    { code: 'FARMASI', name: 'Farmasi', isSystem: false },
    { code: 'KASIR', name: 'Kasir', isSystem: false },
    { code: 'LABORATORIUM', name: 'Laboratorium', isSystem: false },
    { code: 'RADIOLOGI', name: 'Radiologi', isSystem: false },
    { code: 'PENDAFTARAN', name: 'Pendaftaran', isSystem: false },
    { code: 'MANAJEMEN', name: 'Manajemen', isSystem: false },
    { code: 'IT_SUPPORT', name: 'IT Support', isSystem: false },
  ];

  for (const r of roleDefs) {
    await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name },
      create: r,
    });
  }
  console.log(`   ✓ ${roleDefs.length} role\n`);

  // ---------- 4. ASSIGN DEFAULT PERMISSIONS KE ROLE ----------
  console.log('🔐 Assign permission default ke role...');

  // Helper: assign semua permission dari sebuah module ke role
  async function grantModuleToRole(roleCode: string, moduleCode: string) {
    const role = await prisma.role.findUnique({ where: { code: roleCode } });
    const mod = await prisma.module.findUnique({ where: { code: moduleCode } });
    if (!role || !mod) return;

    const perms = await prisma.permission.findMany({
      where: { moduleId: mod.id },
    });

    for (const p of perms) {
      await prisma.roleModulePermission.upsert({
        where: {
          roleId_moduleId_permissionId: {
            roleId: role.id,
            moduleId: mod.id,
            permissionId: p.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          moduleId: mod.id,
          permissionId: p.id,
        },
      });
    }
  }

  // SUPER_ADMIN → semua modul
  for (const mod of MODULES) {
    await grantModuleToRole('SUPER_ADMIN', mod.code);
  }
  console.log('   ✓ SUPER_ADMIN: semua modul');

  // ADMIN → semua modul kecuali manajemen
  const adminModules = MODULES.filter((m) => m.group !== 'Manajemen');
  for (const mod of adminModules) {
    await grantModuleToRole('ADMIN', mod.code);
  }
  console.log('   ✓ ADMIN: semua modul kecuali manajemen');

  // DOKTER
  const dokterMods = [
    'dashboard',
    'rawat-jalan',
    'igd',
    'rawat-inap',
    'rekam-medis',
    'resume-medis',
  ];
  for (const code of dokterMods) {
    await grantModuleToRole('DOKTER', code);
  }
  console.log(`   ✓ DOKTER: ${dokterMods.length} modul`);

  // PERAWAT
  const perawatMods = ['dashboard', 'rawat-inap', 'igd', 'rekam-medis'];
  for (const code of perawatMods) {
    await grantModuleToRole('PERAWAT', code);
  }
  console.log(`   ✓ PERAWAT: ${perawatMods.length} modul`);

  // FARMASI
  for (const code of ['dashboard', 'farmasi']) {
    await grantModuleToRole('FARMASI', code);
  }
  console.log('   ✓ FARMASI: 2 modul');

  // KASIR
  for (const code of ['dashboard', 'laporan-rl']) {
    await grantModuleToRole('KASIR', code);
  }
  console.log('   ✓ KASIR: 2 modul');

  // LABORATORIUM
  for (const code of ['dashboard', 'laboratorium']) {
    await grantModuleToRole('LABORATORIUM', code);
  }
  console.log('   ✓ LABORATORIUM: 2 modul');

  // RADIOLOGI
  for (const code of ['dashboard', 'radiologi']) {
    await grantModuleToRole('RADIOLOGI', code);
  }
  console.log('   ✓ RADIOLOGI: 2 modul');

  // PENDAFTARAN
  const pendaftaranMods = ['dashboard', 'loket', 'pasien', 'antrean', 'registrasi'];
  for (const code of pendaftaranMods) {
    await grantModuleToRole('PENDAFTARAN', code);
  }
  console.log(`   ✓ PENDAFTARAN: ${pendaftaranMods.length} modul`);

  console.log('');

  // ---------- 5. SEED USER ADMIN ----------
  console.log('👤 Seed user admin...');
  const passwordHash = await bcrypt.hash('admin123', 12);

  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash, isActive: true, deletedAt: null },
    create: {
      username: 'admin',
      email: 'admin@simrs.local',
      fullName: 'Super Administrator',
      passwordHash,
      isActive: true,
    },
  });

  // Assign role SUPER_ADMIN ke admin
  const superAdminRole = await prisma.role.findUnique({
    where: { code: 'SUPER_ADMIN' },
  });

  if (superAdminRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId_branchId: {
          userId: adminUser.id,
          roleId: superAdminRole.id,
          branchId: branch.id,
        },
      },
      update: {},
      create: {
        userId: adminUser.id,
        roleId: superAdminRole.id,
        branchId: branch.id,
      },
    });
  }

  // Assign branch default
  await prisma.userBranch.upsert({
    where: {
      userId_branchId: {
        userId: adminUser.id,
        branchId: branch.id,
      },
    },
    update: { isDefault: true },
    create: {
      userId: adminUser.id,
      branchId: branch.id,
      isDefault: true,
    },
  });

  console.log(`   ✓ User: ${adminUser.username} (password: admin123)`);
  console.log('');

  console.log('✅ Seed selesai!\n');
  console.log('Ringkasan:');
  console.log(`  • ${moduleCount} modul`);
  console.log(`  • ${permissionCount} permission`);
  console.log(`  • ${roleDefs.length} role`);
  console.log(`  • 1 user admin (admin / admin123)`);
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seed gagal:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());