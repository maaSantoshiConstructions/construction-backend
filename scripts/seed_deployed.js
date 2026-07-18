import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import Project from '../models/Project.js';
import Plot from '../models/Plot.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read the dumped data
const dataPath = join(__dirname, 'dumped_data.json');
if (!fs.existsSync(dataPath)) {
  console.error('❌ Error: dumped_data.json not found. Run node scripts/dump_local.js first.');
  process.exit(1);
}

const { projects, plots } = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

async function seed() {
  const targetURI = process.argv[2] || process.env.MONGODB_URI;

  if (!targetURI) {
    console.error('❌ Error: Please provide a MongoDB connection URI as an argument or set MONGODB_URI.');
    console.log('Usage: node scripts/seed_deployed.js <MONGODB_URI>');
    process.exit(1);
  }

  try {
    console.log(`🔌 Connecting to target MongoDB: ${targetURI.replace(/:([^@]+)@/, ':****@')}`);
    await mongoose.connect(targetURI);
    console.log('✅ Connected successfully!');

    // 1. Clear existing projects & plots in the target DB
    console.log('🧹 Clearing existing projects and plots from target database...');
    await Project.deleteMany({});
    await Plot.deleteMany({});

    // 2. Map and insert projects
    console.log(`🚀 Inserting ${projects.length} projects...`);
    const projectDocs = projects.map(p => ({
      ...p,
      _id: new mongoose.Types.ObjectId(p._id),
      createdBy: p.createdBy ? new mongoose.Types.ObjectId(p.createdBy) : null
    }));
    await Project.insertMany(projectDocs);

    // 3. Map and insert plots
    console.log(`🚀 Inserting ${plots.length} plots...`);
    const plotDocs = plots.map(p => ({
      ...p,
      _id: new mongoose.Types.ObjectId(p._id),
      project: p.project ? new mongoose.Types.ObjectId(p.project) : null
    }));
    await Plot.insertMany(plotDocs);

    console.log('🎉 Database successfully seeded with local projects and plots!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
}

seed();
