// prisma/seed-address-prices.ts
import { prisma } from "../src/lib/prisma";
import { Prisma } from "../generated/prisma/client";

type Row = { countryCode: string; priceEur: number };

const SERVICE_KEY = "address-verification";

// put your table here (or import it from somewhere)
// NOTE: keep country codes uppercase ISO-2
const PRICES: Row[] = [

  { countryCode: "AT", priceEur: 0.4 },
  { countryCode: "DE", priceEur: 0.4 },

  { countryCode: "TH", priceEur: 0.8 },
  { countryCode: "GI", priceEur: 0.8 },
  { countryCode: "CN", priceEur: 0.8 },
  { countryCode: "IN", priceEur: 0.8 },
  { countryCode: "MX", priceEur: 0.8 },
  { countryCode: "MY", priceEur: 0.8 },
  { countryCode: "NO", priceEur: 0.8 },
  { countryCode: "US", priceEur: 0.8 },
  { countryCode: "GH", priceEur: 0.8 },
  { countryCode: "LU", priceEur: 0.8 },
  { countryCode: "GT", priceEur: 0.8 },

  { countryCode: "AR", priceEur: 1.0 },
  { countryCode: "BR", priceEur: 1.0 },
  { countryCode: "CA", priceEur: 1.0 },
  { countryCode: "CR", priceEur: 1.0 },
  { countryCode: "DK", priceEur: 1.0 },
  { countryCode: "SE", priceEur: 1.0 },
  { countryCode: "TR", priceEur: 1.0 },

  { countryCode: "NZ", priceEur: 1.5 },
  { countryCode: "TW", priceEur: 1.5 },
  { countryCode: "GR", priceEur: 1.5 },
  { countryCode: "ZA", priceEur: 1.5 },
  { countryCode: "IT", priceEur: 1.5 },
  { countryCode: "KE", priceEur: 1.5 },
  { countryCode: "PT", priceEur: 1.5 },
  { countryCode: "AU", priceEur: 1.5 },
  { countryCode: "BE", priceEur: 1.5 },
  { countryCode: "IE", priceEur: 1.5 },

  { countryCode: "NG", priceEur: 1.75 },
  { countryCode: "PE", priceEur: 1.75 },
  { countryCode: "ES", priceEur: 1.75 },
  { countryCode: "FR", priceEur: 1.75 },
  { countryCode: "PL", priceEur: 1.75 },
  { countryCode: "VN", priceEur: 1.75 },
  { countryCode: "CL", priceEur: 1.75 },

  { countryCode: "GB", priceEur: 2.0 },
  { countryCode: "JP", priceEur: 2.0 },
  { countryCode: "CZ", priceEur: 2.0 },
  { countryCode: "NL", priceEur: 2.0 },
  { countryCode: "SK", priceEur: 2.0 },

  { countryCode: "CO", priceEur: 2.25 },
  { countryCode: "FI", priceEur: 2.25 },

  { countryCode: "ID", priceEur: 4.0 },
  { countryCode: "AE", priceEur: 4.0 },
  { countryCode: "SG", priceEur: 4.0 },
  { countryCode: "HK", priceEur: 4.0 },
  { countryCode: "PH", priceEur: 4.0 },

  { countryCode: "RO", priceEur: 5.0 },
];

async function main() {
  const service = await prisma.service.findUnique({
    where: { key: SERVICE_KEY },
    select: { id: true },
  });

  if (!service) {
    throw new Error(`Service not found for key="${SERVICE_KEY}"`);
  }

  // Upsert every country price
  for (const row of PRICES) {
    const cc = String(row.countryCode).trim().toUpperCase();
    const eur = Number(row.priceEur);

    await prisma.serviceCountryPrice.upsert({
      where: {
        service_country_unique: {
          serviceId: service.id,
          countryCode: cc,
        },
      },
      update: {
        priceEur: new Prisma.Decimal(eur),
        active: true,
      },
      create: {
        serviceId: service.id,
        countryCode: cc,
        priceEur: new Prisma.Decimal(eur),
        active: true,
      },
    });
  }

  console.log(`Seeded ${PRICES.length} country prices for "${SERVICE_KEY}"`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
