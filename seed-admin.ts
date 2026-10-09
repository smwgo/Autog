import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = "tiendaautodaule@gmail.com";
  const password = "tienda*2026autorepuestotaller*500";
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log("Upserting admin user...");

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role: 'GERENCIA',
      isActive: true,
    },
    create: {
      email,
      username: "admin",
      name: "Super Administrador",
      password: hashedPassword,
      role: 'GERENCIA',
      location: 'PRINCIPAL',
      isActive: true,
    },
  });

  console.log("Admin user created/updated successfully:", user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
