import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Booking from '../models/Booking.js';
import Plot from '../models/Plot.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/maaSantoshi';

async function sync() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB:', MONGO_URI);

    const bookings = await Booking.find({ isActive: true });
    console.log(`Found ${bookings.length} active bookings to sync.`);

    for (const booking of bookings) {
      let plotStatus = 'available';
      let owner = null;

      if (booking.status === 'completed') {
        plotStatus = 'sold';
        owner = booking.customer;
      } else if (booking.status === 'token' || booking.status === 'partial') {
        plotStatus = 'reserved';
        owner = booking.customer;
      }

      await Plot.findByIdAndUpdate(booking.plot, {
        status: plotStatus,
        owner: owner,
        booking: booking._id,
      });

      console.log(`Synced plot for Booking: ${booking.bookingId} -> status: ${plotStatus}, owner: ${owner}`);
    }

    console.log('🎉 Successfully synced all booking owner references on plots!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Sync failed:', err.message);
    process.exit(1);
  }
}

sync();
