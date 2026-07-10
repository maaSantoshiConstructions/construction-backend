import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Project from '../models/Project.js';
import Plot from '../models/Plot.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/maaSantoshi';

async function sync() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB:', MONGO_URI);

    const projects = await Project.find({ isActive: true });
    console.log(`Found ${projects.length} active projects to sync.`);

    for (const project of projects) {
      const count = await Plot.countDocuments({ project: project._id, isActive: true });
      project.totalPlots = count;
      await project.save();
      console.log(`Synced project: "${project.name}" - Total Active Plots: ${count}`);
    }

    console.log('🎉 Successfully synced all projects plot counts!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Sync failed:', err.message);
    process.exit(1);
  }
}

sync();
