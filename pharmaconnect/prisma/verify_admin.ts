import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.user.update({
      where: { email: 'admin@pharmaconnect.com' },
      data: { emailVerified: true },
    });
    console.log('Admin verified successfully');
  } catch (e) {
    console.error('Error verifying admin:', e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
