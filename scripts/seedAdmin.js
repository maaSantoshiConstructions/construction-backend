/**
 * Seed Admin User
 * Run: node backend/scripts/seedAdmin.js
 * Creates a super_admin user if one doesn't already exist.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/maaSantoshi';

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['super_admin', 'company_admin', 'sales_executive', 'channel_partner', 'customer'], default: 'customer' },
    isVerified: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', UserSchema);

const ADMIN = {
  name: 'Super Admin',
  email: 'admin@construction.com',
  phone: '+91 70000 12345',
  password: 'Admin@123',
  role: 'super_admin',
  isVerified: true,
  isActive: true,
};

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB:', MONGO_URI);

    const existing = await User.findOne({ email: ADMIN.email });
    if (existing) {
      console.log(`\n⚠️  Admin already exists:`);
      console.log(`   Email : ${ADMIN.email}`);
      console.log(`   Role  : ${existing.role}`);
      console.log('\nIf you forgot the password, delete the user and re-run this script.');
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ADMIN.password, salt);

    await User.create({ ...ADMIN, password: hashedPassword });

    console.log('\n🎉 Admin user created successfully!');
    console.log('─────────────────────────────────');
    console.log(`   Email    : ${ADMIN.email}`);
    console.log(`   Password : ${ADMIN.password}`);
    console.log(`   Role     : ${ADMIN.role}`);
    console.log('─────────────────────────────────');
    console.log('\n→ Login at: http://localhost:5173/login');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
