import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaClient } from './generated/prisma/client.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Helper to generate random hash-like strings (simulating IP hashes)
function generateIpHash(): string {
  return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

// Helper to generate random date within a range
function randomDate(daysBack: number): Date {
  const now = new Date();
  const past = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  return new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()));
}

// Helper to pick random item from array
function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper to generate random integer in range
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const INPUT_FORMATS = ['svg', 'png'];
const OUTPUT_FORMATS = ['ico', 'icns', 'png'];
const OUTPUT_SIZES = [16, 32, 48, 64, 128, 256, 512, 1024, 2048];
const SCALES = [50, 75, 90, 100, 110, 125, 150, 175, 200];
const CORNER_RADII = [0, 5, 10, 15, 20, 25, 30, 50];
const BG_REMOVAL_MODES = ['none', 'auto', 'white', 'black', 'transparent'];
const PNG_DPIS = [72, 96, 150, 300, 600];
const PNG_COLORSPACES = ['sRGB', 'RGB', 'Grayscale'];
const PNG_COLOR_DEPTHS = [8, 16, 24, 32];
const SOURCE_RESOLUTIONS = [
  { width: 16, height: 16 },
  { width: 32, height: 32 },
  { width: 64, height: 64 },
  { width: 128, height: 128 },
  { width: 256, height: 256 },
  { width: 512, height: 512 },
  { width: 1024, height: 1024 },
  { width: 2048, height: 2048 },
  { width: 4096, height: 4096 },
  // Non-square resolutions
  { width: 800, height: 600 },
  { width: 1920, height: 1080 },
  { width: 1200, height: 630 },
  { width: 500, height: 500 },
  { width: 300, height: 300 },
];

const ERROR_MESSAGES = [
  'Invalid SVG format',
  'File too large',
  'Conversion timeout',
  'Unsupported color space',
  'Memory limit exceeded',
  'Invalid image dimensions',
];

const SAMPLE_USERS = [
  { email: 'admin@example.com', name: 'Admin User' },
  { email: 'john.doe@example.com', name: 'John Doe' },
  { email: 'jane.smith@example.com', name: 'Jane Smith' },
  { email: 'developer@test.com', name: 'Test Developer' },
  { email: 'designer@company.io', name: 'UI Designer' },
];

async function clearDatabase() {
  console.log('🗑️  Clearing database...');

  // Delete in order to respect foreign key constraints (if any)
  await prisma.conversionMetric.deleteMany();
  await prisma.rateLimit.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Database cleared');
}

async function seedUsers() {
  console.log('👤 Seeding users...');

  const users = await Promise.all(
    SAMPLE_USERS.map((user) =>
      prisma.user.create({
        data: {
          email: user.email,
          name: user.name,
        },
      }),
    ),
  );

  console.log(`✅ Created ${users.length} users`);
  return users;
}

async function seedConversionMetrics(count: number = 500) {
  console.log(`📊 Seeding ${count} conversion metrics...`);

  // Generate a pool of IP hashes to simulate repeat users
  const ipHashes = Array.from({ length: 50 }, () => generateIpHash());

  const metrics = [];

  for (let i = 0; i < count; i++) {
    const inputFormat = randomPick(INPUT_FORMATS);
    const outputFormat = randomPick(OUTPUT_FORMATS);
    const success = Math.random() > 0.05; // 95% success rate
    // Generate varied input file sizes across different ranges
    const inputSizeBytes = randomPick([
      randomInt(100, 1024), // < 1 KB (tiny files)
      randomInt(1024, 10 * 1024), // 1-10 KB
      randomInt(10 * 1024, 50 * 1024), // 10-50 KB
      randomInt(50 * 1024, 100 * 1024), // 50-100 KB
      randomInt(100 * 1024, 500 * 1024), // 100-500 KB
      randomInt(500 * 1024, 1024 * 1024), // 500 KB - 1 MB
      randomInt(1024 * 1024, 5 * 1024 * 1024), // > 1 MB (large files)
    ]);

    // Generate realistic conversion options matching the admin service expectations
    const conversionOptions: Record<string, unknown> = {
      scale: randomPick(SCALES),
      outputSize: randomPick(OUTPUT_SIZES),
    };

    // Add corner radius sometimes
    if (Math.random() > 0.5) {
      conversionOptions.cornerRadius = randomPick(CORNER_RADII);
    }

    // Add background removal mode sometimes
    if (Math.random() > 0.4) {
      conversionOptions.backgroundRemovalMode = randomPick(BG_REMOVAL_MODES);
    }

    // Add PNG-specific options when output is PNG
    if (outputFormat === 'png') {
      conversionOptions.pngDpi = randomPick(PNG_DPIS);
      if (Math.random() > 0.5) {
        conversionOptions.pngColorspace = randomPick(PNG_COLORSPACES);
      }
      if (Math.random() > 0.5) {
        conversionOptions.pngColorDepth = randomPick(PNG_COLOR_DEPTHS);
      }
    }

    // Add source resolution (simulating viewBox/input dimensions)
    if (Math.random() > 0.2) {
      const resolution = randomPick(SOURCE_RESOLUTIONS);
      conversionOptions.sourceWidth = resolution.width;
      conversionOptions.sourceHeight = resolution.height;
    }

    metrics.push({
      ipHash: randomPick(ipHashes),
      inputFormat,
      outputFormat,
      inputSizeBytes,
      outputSizeBytes: success ? randomInt(inputSizeBytes * 0.5, inputSizeBytes * 3) : null,
      processingTimeMs: success ? randomInt(50, 2000) : randomInt(100, 5000),
      success,
      errorMessage: success ? null : randomPick(ERROR_MESSAGES),
      conversionOptions,
      createdAt: randomDate(30), // Last 30 days
    });
  }

  // Batch insert for performance
  await prisma.conversionMetric.createMany({
    data: metrics,
  });

  console.log(`✅ Created ${count} conversion metrics`);
}

async function seedRateLimits() {
  console.log('🚦 Seeding rate limits...');

  // Create some active rate limit entries
  const ipHashes = Array.from({ length: 10 }, () => generateIpHash());
  const now = new Date();

  const rateLimits = ipHashes.map((ipHash, index) => {
    const windowStart = new Date(now.getTime() - randomInt(0, 60) * 60 * 1000); // Within last hour
    const expiresAt = new Date(windowStart.getTime() + 60 * 60 * 1000); // 1 hour window

    return {
      ipHash,
      count: randomInt(1, 50),
      windowStart,
      expiresAt,
    };
  });

  await prisma.rateLimit.createMany({
    data: rateLimits,
  });

  console.log(`✅ Created ${rateLimits.length} rate limit entries`);
}

async function printStats() {
  console.log('\n📈 Database Statistics:');

  const [userCount, metricCount, rateLimitCount] = await Promise.all([
    prisma.user.count(),
    prisma.conversionMetric.count(),
    prisma.rateLimit.count(),
  ]);

  const successCount = await prisma.conversionMetric.count({
    where: { success: true },
  });

  const formatStats = await prisma.conversionMetric.groupBy({
    by: ['outputFormat'],
    _count: { outputFormat: true },
  });

  console.log(`   Users: ${userCount}`);
  console.log(`   Conversion Metrics: ${metricCount}`);
  console.log(`   - Success Rate: ${((successCount / metricCount) * 100).toFixed(1)}%`);
  console.log(`   - By Output Format:`);
  formatStats.forEach((stat) => {
    console.log(`     - ${stat.outputFormat}: ${stat._count.outputFormat}`);
  });
  console.log(`   Rate Limits: ${rateLimitCount}`);
}

async function main() {
  console.log('🌱 Starting database seed...\n');

  try {
    await clearDatabase();
    await seedUsers();
    await seedConversionMetrics(500);
    await seedRateLimits();
    await printStats();

    console.log('\n✅ Seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
