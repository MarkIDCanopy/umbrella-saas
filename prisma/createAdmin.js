require("dotenv/config");

const { PrismaClient } = require("../generated/prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: ["error", "warn"],
});

async function main() {
  const email = "mark@idcanopy.com";
  const password = "ChangeMeNow123!"; // set your real password here
  const fullName = "Mark";

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      isAdmin: true,
      adminRole: "admin",
      fullName,
      emailVerifiedAt: new Date(),
    },
    create: {
      email,
      passwordHash,
      fullName,
      isAdmin: true,
      adminRole: "admin",
      emailVerifiedAt: new Date(),
    },
  });

  console.log("Admin user ready:");
  console.log({
    id: user.id,
    email: user.email,
    isAdmin: user.isAdmin,
    adminRole: user.adminRole,
  });
}

main()
  .catch((e) => {
    console.error("createAdmin failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });