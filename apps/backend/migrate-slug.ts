import { PrismaClient } from './src/prisma-client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL || 'postgresql://boilerplate:***@10.21.0.1:5432/boilerplate',
});

function generateSlug(nickname) {
  return nickname
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function main() {
  const prisma = new PrismaClient({ adapter });

  // Cerca utenti con nickname ma senza slug
  const users = await prisma.user.findMany({
    where: { slug: null, nickname: { not: null } },
    select: { id: true, nickname: true },
  });
  console.log(`Utenti con nickname ma senza slug: ${users.length}`);

  if (users.length === 0) {
    console.log('Nessun utente da migrare');
    await prisma.$disconnect();
    return;
  }

  for (const user of users) {
    const slug = generateSlug(user.nickname);
    // Prova ad aggiornare — se lo slug esiste già, genera uno con suffisso numerico
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { slug },
      });
      console.log(`  ${user.id}: ${user.nickname} → /${slug}`);
    } catch (err) {
      // Slug già in uso — aggiungi suffisso
      const existing = await prisma.user.findFirst({ where: { slug } });
      if (existing) {
        let counter = 1;
        let newSlug = `${slug}-${counter}`;
        while (await prisma.user.findFirst({ where: { slug: newSlug } })) {
          counter++;
          newSlug = `${slug}-${counter}`;
        }
        await prisma.user.update({
          where: { id: user.id },
          data: { slug: newSlug },
        });
        console.log(`  ${user.id}: ${user.nickname} → /${newSlug} (slug originale già in uso)`);
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: { slug },
        });
        console.log(`  ${user.id}: ${user.nickname} → /${slug}`);
      }
    }
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Errore:', err.message);
  process.exit(1);
});
