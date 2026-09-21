import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PERMISSIONS = [
  'dashboard:read', 'user:read', 'user:manage', 'role:manage', 'master:manage', 'audit:read', 'report:read',
  'patient:read', 'patient:create', 'patient:update', 'patient:deactivate',
  'registration:read', 'registration:create', 'visit:read', 'visit:manage',
  'medical-record:read', 'medical-record:write-doctor', 'medical-record:write-nursing',
  'prescription:read', 'prescription:create', 'prescription:dispense',
  'laboratory:read', 'laboratory:manage', 'radiology:read', 'radiology:manage',
  'billing:read', 'billing:pay',
];

const NURSING = ['dashboard:read', 'patient:read', 'visit:read', 'medical-record:read', 'medical-record:write-nursing', 'prescription:read'];

// Admin sengaja TIDAK memiliki medical-record:*; akses isi rekam medis hanya lewat role klinis.
const ROLES: Record<string, { name: string; permissions: string[] | '*' }> = {
  SUPER_ADMIN: { name: 'Super Admin', permissions: '*' },
  ADMIN: { name: 'Admin', permissions: ['dashboard:read', 'user:read', 'user:manage', 'role:manage', 'master:manage', 'audit:read', 'report:read', 'patient:read', 'patient:create', 'patient:update', 'patient:deactivate', 'registration:read'] },
  DOKTER: { name: 'Dokter', permissions: ['dashboard:read', 'patient:read', 'visit:read', 'visit:manage', 'medical-record:read', 'medical-record:write-doctor', 'prescription:read', 'prescription:create', 'laboratory:read', 'radiology:read'] },
  PERAWAT: { name: 'Perawat', permissions: NURSING },
  BIDAN: { name: 'Bidan', permissions: NURSING },
  FARMASI: { name: 'Farmasi', permissions: ['dashboard:read', 'patient:read', 'prescription:read', 'prescription:dispense'] },
  LABORATORIUM: { name: 'Laboratorium', permissions: ['dashboard:read', 'patient:read', 'laboratory:read', 'laboratory:manage'] },
  RADIOLOGI: { name: 'Radiologi', permissions: ['dashboard:read', 'patient:read', 'radiology:read', 'radiology:manage'] },
  PENDAFTARAN: { name: 'Pendaftaran', permissions: ['dashboard:read', 'patient:read', 'patient:create', 'patient:update', 'registration:read', 'registration:create', 'visit:read'] },
  KASIR: { name: 'Kasir', permissions: ['dashboard:read', 'patient:read', 'billing:read', 'billing:pay'] },
  MANAJEMEN: { name: 'Manajemen', permissions: ['dashboard:read', 'report:read'] },
  IT_SUPPORT: { name: 'IT Support', permissions: ['dashboard:read', 'user:read', 'master:manage', 'audit:read'] },
};

async function main() {
  const code = process.env.DEFAULT_BRANCH_CODE ?? 'MAIN';
  await prisma.branch.upsert({ where: { code }, update: {}, create: { code, name: 'Cabang Utama' } });

  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({ where: { code: permission }, update: {}, create: { code: permission } });
  }
  const all = await prisma.permission.findMany();

  for (const [roleCode, def] of Object.entries(ROLES)) {
    const role = await prisma.role.upsert({
      where: { code: roleCode },
      update: { name: def.name },
      create: { code: roleCode, name: def.name, isSystem: true },
    });
    const perms = def.permissions === '*' ? all : all.filter((p) => def.permissions.includes(p.code));
    await prisma.rolePermission.createMany({
      data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    });
  }
  console.log(`Seed selesai: cabang ${code}, ${all.length} permission, ${Object.keys(ROLES).length} role.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
