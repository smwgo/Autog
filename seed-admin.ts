import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = "tiendaautogdaule@gmail.com";
  const password = "tienda2026autog";
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log("Upserting admin user...");

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash: hashedPassword,
      role: 'ROOT',
    },
    create: {
      email,
      name: "Super Administrador",
      passwordHash: hashedPassword,
      role: 'ROOT',
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
