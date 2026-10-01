// import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
dotenv.config({
    path: 'apps/api/.env',
});
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL is not configured');
}
const adapter = new PrismaPg({
    connectionString,
});
const prisma = new PrismaClient({
    adapter,
});
async function main() {
    const ownerName = process.env.OWNER_NAME;
    const ownerEmail = process.env.OWNER_EMAIL;
    const ownerPassword = process.env.OWNER_PASSWORD;
    const staffName = process.env.STAFF_NAME;
    const staffEmail = process.env.STAFF_EMAIL;
    const staffPassword = process.env.STAFF_PASSWORD;
    if (!ownerName ||
        !ownerEmail ||
        !ownerPassword ||
        !staffName ||
        !staffEmail ||
        !staffPassword) {
        throw new Error('OWNER_NAME, OWNER_EMAIL and OWNER_PASSWORD must be configured in .env');
    }
    const passwordHash = await bcrypt.hash(ownerPassword, 12);
    const restaurant = await prisma.restaurant.upsert({
        where: {
            id: 'default-restaurant',
        },
        update: {},
        create: {
            id: 'default-restaurant',
            name: 'My Restaurant',
            description: 'Welcome to our restaurant.',
            currency: 'INR',
            isActive: true,
        },
    });
    const owner = await prisma.user.upsert({
        where: {
            email: ownerEmail.toLowerCase(),
        },
        update: {
            name: ownerName,
            passwordHash,
            role: 'OWNER',
            restaurantId: restaurant.id,
            isActive: true,
        },
        create: {
            name: ownerName,
            email: ownerEmail.toLowerCase(),
            passwordHash,
            role: 'OWNER',
            restaurantId: restaurant.id,
            isActive: true,
        },
    });
    const staffPasswordHash = await bcrypt.hash(staffPassword, 12);
    const staff = await prisma.user.upsert({
        where: {
            email: staffEmail.toLowerCase(),
        },
        update: {
            name: staffName,
            passwordHash: staffPasswordHash,
            role: 'STAFF',
            restaurantId: restaurant.id,
            isActive: true,
        },
        create: {
            name: staffName,
            email: staffEmail.toLowerCase(),
            passwordHash: staffPasswordHash,
            role: 'STAFF',
            restaurantId: restaurant.id,
            isActive: true,
        },
    });
    console.log('');
    console.log('Restaurant setup completed');
    console.log('---------------------------');
    console.log(`Restaurant: ${restaurant.name}`);
    console.log(`Owner: ${owner.name}`);
    console.log(`Email: ${owner.email}`);
    console.log(`Role: ${owner.role}`);
    console.log('');
    console.log(`Staff: ${staff.name}`);
    console.log(`Email: ${staff.email}`);
    console.log(`Role: ${staff.role}`);
}
main()
    .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
