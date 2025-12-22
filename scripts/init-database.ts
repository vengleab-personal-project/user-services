/**
 * Database Initialization Script
 * 
 * This script initializes the PostgreSQL database with Prisma
 * Run with: npx tsx scripts/init-database.ts
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../src/utils/logger';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🚀 Initializing PostgreSQL database with Prisma...\n');

  try {
    // Test connection
    await prisma.$connect();
    console.log('✓ Database connection successful');

    // Check if tables exist by trying a simple query
    const userCount = await prisma.user.count();
    console.log(`✓ Database schema is ready (${userCount} users found)`);

    // Show table statistics
    const stats = {
      users: await prisma.user.count(),
      sessions: await prisma.session.count(),
      forms: await prisma.form.count(),
      policies: await prisma.policy.count(),
      subscriptions: await prisma.subscription.count(),
      usageRecords: await prisma.usageRecord.count(),
      usageEvents: await prisma.usageEvent.count(),
    };

    console.log('\n📊 Database Statistics:');
    console.log(`   Users: ${stats.users}`);
    console.log(`   Sessions: ${stats.sessions}`);
    console.log(`   Forms: ${stats.forms}`);
    console.log(`   Policies: ${stats.policies}`);
    console.log(`   Subscriptions: ${stats.subscriptions}`);
    console.log(`   Usage Records: ${stats.usageRecords}`);
    console.log(`   Usage Events: ${stats.usageEvents}`);

    console.log('\n✅ Database initialization complete!\n');
    console.log('Next steps:');
    console.log('  1. Run policy seeding: npx tsx scripts/seed-policies.ts');
    console.log('  2. Start the development server: pnpm dev');
    console.log('  3. Or build for production: pnpm build\n');

  } catch (error: any) {
    console.error('\n❌ Database initialization failed:', error.message);
    
    if (error.code === 'P1001') {
      console.error('\n⚠️  Cannot reach database server.');
      console.error('   Make sure PostgreSQL is running and DATABASE_URL is correct.');
      console.error('   Current DATABASE_URL:', process.env.DATABASE_URL || 'Not set');
    } else if (error.code === 'P2021') {
      console.error('\n⚠️  Database tables do not exist.');
      console.error('   Run migrations first: pnpm prisma:migrate');
    } else {
      console.error('   Error details:', error);
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

