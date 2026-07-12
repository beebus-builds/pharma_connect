import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'patient1@example.com' },
    });

    if (!user) {
      console.log('User not found');
      return;
    }

    const isValid = await bcrypt.compare('password123', user.password);
    console.log(`User: ${user.email}, Password Valid: ${isValid}, Verified: ${user.emailVerified}`);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
