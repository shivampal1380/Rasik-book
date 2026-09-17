import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const env = (key, fallback) => process.env[key] || fallback;

async function upsertUser({ name, email, password, role }) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { name, email, passwordHash, role },
  });
}

async function main() {
  const adminEmail = env('SEED_ADMIN_EMAIL', 'admin@nirankari.local');
  const adminPassword = env('SEED_ADMIN_PASSWORD', 'admin12345');

  const admin = await upsertUser({
    name: env('SEED_ADMIN_NAME', 'Administrator'),
    email: adminEmail,
    password: adminPassword,
    role: 'SUPER_ADMIN',
  });
  console.log(`✔ Super Admin user ready: ${admin.email} (role ${admin.role})`);

  const operator = await upsertUser({
    name: 'Data Entry Operator',
    email: env('SEED_OPERATOR_EMAIL', 'operator@nirankari.local'),
    password: env('SEED_OPERATOR_PASSWORD', 'operator123'),
    role: 'OPERATOR',
  });
  console.log(`✔ Operator user ready: ${operator.email}`);

  const existing = await prisma.book.count();
  if (existing > 0) {
    console.log(`ℹ  ${existing} book(s) already exist — skipping demo data.`);
    return;
  }

  const demoBooks = [
    { code: 'A01', bookNumber: '1256', area: 'MAHAKALI' },
    { code: 'A01', bookNumber: '1257', area: 'MAHAKALI' },
  ];

  for (const spec of demoBooks) {
    const book = await prisma.book.create({
      data: {
        code: spec.code,
        bookNumber: spec.bookNumber,
        area: spec.area,
        pracharak: 'Sample Pracharak',
        createdBy: admin.id,
      },
    });

    const heads = ['BHETA', 'B_FUND', 'SBF', 'LANGAR', 'PCS', 'SS', 'FF', 'SD', 'MPD', 'MED', 'ASS', 'MSS', 'LSS'];
    for (let i = 1; i <= 56; i++) {
      const head = heads[i % heads.length];
      const amount = ((i * 137) % 900) + 100;
      const creator = i % 3 === 0 ? operator.id : admin.id;
      await prisma.bookEntry.create({
        data: {
          bookId: book.id,
          entryNumber: i,
          head,
          amount,
          createdBy: creator,
        },
      });
    }
    await prisma.book.update({
      where: { id: book.id },
      data: { currentEntryNumber: 57 },
    });
    console.log(`✔ Demo book ${spec.code} / ${spec.bookNumber} created with 56 entries.`);
  }

  console.log('\nSeed complete.');
  console.log('Login (admin):');
  console.log(`  email:    ${adminEmail}`);
  console.log(`  password: ${adminPassword}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });