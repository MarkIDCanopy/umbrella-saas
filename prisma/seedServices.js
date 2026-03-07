// prisma/seedServices.js
require("dotenv/config");

const { PrismaClient } = require("../generated/prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL in environment.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 1 credit = €0.20 of usage value (your model)
const CREDIT_EUR = 0.2;
const eurToCredits = (eur) => Math.ceil(Number(eur) / CREDIT_EUR);

// Service keys MUST match your code (SERVICE_KEY constants)
const SERVICES = [
  {
    key: "address-verification",
    name: "Address Verification",
    // cheapest tier is €0.80 => 4 credits
    priceCredits: eurToCredits(0.8), // 4
    description:
      "Validate, normalize, and geocode addresses worldwide with high accuracy.",
    features: [
      "Global coverage",
      "Real-time validation",
      "Batch processing",
      "Geocoding",
    ],
  },
  {
    key: "phone-status",
    name: "Phone Status Check",
    // €0.20 => 1 credit
    priceCredits: eurToCredits(0.2), // 1
    description:
      "Check whether a phone number is active, reachable, roaming, or disconnected in real time.",
    features: [
      "Live subscriber status",
      "Device reachability",
      "Roaming detection",
      "Carrier & location data",
    ],
  },
  {
    key: "phone-id",
    name: "Phone ID",
    // €0.40 => 2 credits
    priceCredits: eurToCredits(0.4), // 2
    description:
      "Enrich phone numbers with identity, lifecycle, and carrier intelligence.",
    features: [
      "Subscriber status",
      "SIM swap detection",
      "Porting & deactivation history",
      "Contact & age verification (where supported)",
    ],
  },
  {
    key: "phone-risk",
    name: "Phone Risk Score",
    // €0.20 => 1 credits
    priceCredits: eurToCredits(0.2), // 1
    description:
      "Assess fraud risk by analyzing behavioral, network, and historical signals.",
    features: [
      "Numerical risk score",
      "Risk level & recommendation",
      "IP & email correlation",
      "Behavioral anomaly detection",
    ],
  },
  {
    key: "sms-verification",
    name: "SMS Verification",
    // €0.20 => 1 credit
    priceCredits: eurToCredits(0.2), // 1
    description:
      "Verify phone ownership by sending one-time passcodes (OTP) via SMS.",
    features: [
      "Global SMS delivery",
      "OTP generation & validation",
      "Verification lifecycle states",
      "Fraud-resistant flows",
    ],
  },
  {
    key: "email-verification",
    name: "Email Verification",
    // €0.20 => 1 credit
    priceCredits: eurToCredits(0.2), // 1
    description:
      "Verify users using secure one-time passcodes delivered via email.",
    features: [
      "Email-based OTP delivery",
      "Lower-cost fallback channel",
      "Verification & match handling",
    ],
  },
  {
    key: "full-phone-intelligences",
    name: "Full Phone Intelligence",
    // €0.80 => 4 credits
    priceCredits: eurToCredits(0.8), // 4
    description:
      "Get a complete identity and risk assessment in a single request.",
    features: [
      "Risk scoring & insights",
      "SIM swap & call forwarding",
      "Carrier & location intelligence",
      "Behavioral & historical signals",
    ],
  },
  {
  key: "kyb",
  name: "IDC KYB",
  // adjust to your actual pricing
  priceCredits: eurToCredits(4.0),
  description:
    "Verify business entities with company search and detailed corporate data for KYB, onboarding, and risk checks.",
  features: [
    "Entity lookup",
    "Corporate ownership data",
    "Transparency insights",
    "KYB onboarding support",
  ],
},
];

async function main() {
  for (const s of SERVICES) {
    await prisma.service.upsert({
      where: { key: s.key },
      update: {
        name: s.name,
        description: s.description,
        priceCredits: s.priceCredits,
        features: s.features,
        active: true,
      },
      create: {
        key: s.key,
        name: s.name,
        description: s.description,
        priceCredits: s.priceCredits,
        features: s.features,
        active: true,
      },
    });
  }

  console.log(`Seeded ${SERVICES.length} services.`);
}

main()
  .catch((e) => {
    console.error("Error seeding services:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
