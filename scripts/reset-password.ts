import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function resetPassword() {
  // List all users
  const users = await prisma.user.findMany({
    select: { id: true, email: true, phone: true, fullName: true, role: true }
  });

  console.log("Users in database:");
  console.log(JSON.stringify(users, null, 2));

  // Reset password for all users to 'password123'
  const hashedPassword = await bcrypt.hash("password123", 10);

  for (const user of users) {
    if (user.email) {
      await prisma.user.update({
        where: { id: user.id },
        data: { hashedPassword: hashedPassword }
      });
      console.log(`Reset password for ${user.email} to: password123`);
    }
  }

  console.log("\nDone! You can now login with password: password123");
  process.exit(0);
}

resetPassword().catch(console.error);
