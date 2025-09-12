import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando script de seed...');

  // Datos para el usuario administrador
  const adminEmail = process.env.ADMIN_EMAIL || 'david@intermaritime.org';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Lexus0110.'; // ¡Cambia esto en producción!
  const adminName = 'Administrador Principal';

  // Hashear la contraseña
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  // Crear o actualizar el usuario administrador
  // Usamos upsert para evitar duplicados si se ejecuta el seed varias veces
  try {
    const adminUser = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        name: adminName,
        password: hashedPassword,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
      create: {
        email: adminEmail,
        name: adminName,
        password: hashedPassword,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    console.log(`Usuario administrador creado/actualizado: ${adminUser.email}`);
  } catch (e: any) {
    if (e.code === 'P2002' && e.meta?.target?.includes('email')) {
      console.warn(`El usuario ${adminEmail} ya existe. Saltando creación.`);
    } else {
      console.error('Error al sembrar el usuario administrador:', e);
      throw e; // Lanza el error para que el proceso falle si es grave
    }
  }

  console.log('Script de seed finalizado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });