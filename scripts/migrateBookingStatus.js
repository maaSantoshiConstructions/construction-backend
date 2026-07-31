/**
 * Migration Script: Booking Status Redesign
 *
 * Migrates existing Booking documents from the old single `status` field
 * to the new separate `bookingStatus` + `paymentStatus` + `paidAmount` fields.
 *
 * Run once: node backend/scripts/migrateBookingStatus.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGO_URI not found in .env');
  process.exit(1);
}

// ─── Status mapping ───────────────────────────────────────────────────────────
const STATUS_MAP = {
  token:     { bookingStatus: 'active',    paymentStatus: 'token_paid' },
  partial:   { bookingStatus: 'active',    paymentStatus: 'partially_paid' },
  completed: { bookingStatus: 'completed', paymentStatus: 'fully_paid' },
  cancelled: { bookingStatus: 'cancelled', paymentStatus: 'token_paid' },
};

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  const db = mongoose.connection.db;
  const bookingsCol = db.collection('bookings');
  const paymentsCol = db.collection('payments');

  const bookings = await bookingsCol.find({}).toArray();
  console.log(`📋 Found ${bookings.length} bookings to migrate\n`);

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const booking of bookings) {
    try {
      const updates = {};

      // ── 1. Map old status → bookingStatus + paymentStatus ──────────────────
      const oldStatus = booking.status;
      if (oldStatus && STATUS_MAP[oldStatus]) {
        updates.bookingStatus = STATUS_MAP[oldStatus].bookingStatus;
        // paymentStatus will be recalculated below, but set a safe default
        updates.paymentStatus = STATUS_MAP[oldStatus].paymentStatus;
      } else if (!booking.bookingStatus) {
        // No old status and no new status — default to active
        updates.bookingStatus = 'active';
        updates.paymentStatus = 'token_paid';
      } else {
        // Already migrated
        skipped++;
        continue;
      }

      // ── 2. Recalculate paidAmount from successful Payment records ───────────
      const successPayments = await paymentsCol
        .find({
          booking: booking._id,
          $or: [{ status: 'completed' }, { transactionStatus: 'success' }],
          isActive: { $ne: false },
        })
        .toArray();

      const paidAmount = successPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const remainingAmount = Math.max(0, (booking.totalAmount || 0) - paidAmount);
      updates.paidAmount = paidAmount;
      updates.remainingAmount = remainingAmount;

      // ── 3. Recalculate paymentStatus from amounts ───────────────────────────
      const tokenAmount = booking.tokenAmount || 0;
      const totalAmount = booking.totalAmount || 0;

      if (paidAmount <= 0 || paidAmount <= tokenAmount) {
        updates.paymentStatus = 'token_paid';
      } else if (paidAmount < totalAmount) {
        updates.paymentStatus = 'partially_paid';
      } else {
        updates.paymentStatus = 'fully_paid';
      }

      // Override if cancelled
      if (updates.bookingStatus === 'cancelled') {
        updates.paymentStatus = booking.paidAmount > 0 ? 'partially_paid' : 'token_paid';
      }

      // ── 4. Set lastPaymentDate from most recent successful payment ──────────
      if (successPayments.length > 0) {
        const sorted = successPayments.sort((a, b) =>
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        updates.lastPaymentDate = sorted[0].paidAt || sorted[0].createdAt;
      }

      // ── 5. Apply updates ────────────────────────────────────────────────────
      await bookingsCol.updateOne(
        { _id: booking._id },
        { $set: updates }
      );

      migrated++;
      console.log(
        `  ✓ ${booking.bookingId || booking._id} | ${oldStatus || 'no status'} → ${updates.bookingStatus} / ${updates.paymentStatus} | paid: ₹${paidAmount.toLocaleString('en-IN')}`
      );
    } catch (err) {
      errors++;
      console.error(`  ✗ Error on ${booking._id}: ${err.message}`);
    }
  }

  // ── 6. Migrate Payment.status → Payment.transactionStatus ─────────────────
  console.log('\n📋 Migrating Payment.status → transactionStatus...\n');
  const payments = await paymentsCol.find({ transactionStatus: { $exists: false } }).toArray();
  console.log(`  Found ${payments.length} payments without transactionStatus`);

  const statusMap = { completed: 'success', pending: 'pending', failed: 'failed', refunded: 'refunded' };
  for (const p of payments) {
    const ts = statusMap[p.status] || 'success';
    await paymentsCol.updateOne(
      { _id: p._id },
      { $set: { transactionStatus: ts } }
    );
  }

  console.log('\n─────────────────────────────────────────');
  console.log(`✅ Migration complete`);
  console.log(`   Bookings migrated : ${migrated}`);
  console.log(`   Already migrated  : ${skipped}`);
  console.log(`   Errors            : ${errors}`);
  console.log(`   Payments updated  : ${payments.length}`);
  console.log('─────────────────────────────────────────\n');

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
