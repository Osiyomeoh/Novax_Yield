import mongoose from 'mongoose';
// import { AttestorModel, VerificationRequestModel } from '../models'; // Removed - attestor functionality deprecated
import { VerificationRequestModel } from '../models';

/**
 * Add performance indexes for verification system
 */
export const addVerificationIndexes = async () => {
  try {
    console.log('Adding verification system indexes...');

    // Verification requests indexes
    await VerificationRequestModel.collection.createIndex(
      { status: 1, createdAt: -1 },
      { name: 'status_createdAt_idx' }
    );
    console.log('✅ Created index: status_createdAt_idx');

    await VerificationRequestModel.collection.createIndex(
      { assetType: 1, 'metadata.country': 1 },
      { name: 'assetType_country_idx' }
    );
    console.log('✅ Created index: assetType_country_idx');

    await VerificationRequestModel.collection.createIndex(
      { assignedAttestors: 1, status: 1 },
      { name: 'assignedAttestors_status_idx' }
    );
    console.log('✅ Created index: assignedAttestors_status_idx');

    await VerificationRequestModel.collection.createIndex(
      { expiresAt: 1 },
      { name: 'expiresAt_idx' }
    );
    console.log('✅ Created index: expiresAt_idx');

    await VerificationRequestModel.collection.createIndex(
      { ownerAddress: 1, createdAt: -1 },
      { name: 'ownerAddress_createdAt_idx' }
    );
    console.log('✅ Created index: ownerAddress_createdAt_idx');

    // Attestor indexes - Removed - attestor functionality deprecated
    // await AttestorModel.collection.createIndex(
    //   { type: 1, country: 1, status: 1 },
    //   { name: 'type_country_status_idx' }
    // );
    // console.log('✅ Created index: type_country_status_idx');

    // await AttestorModel.collection.createIndex(
    //   { specialties: 1, status: 1, 'reputation.score': -1 },
    //   { name: 'specialties_status_reputation_idx' }
    // );
    // console.log('✅ Created index: specialties_status_reputation_idx');

    // await AttestorModel.collection.createIndex(
    //   { 'reputation.score': -1, status: 1 },
    //   { name: 'reputation_status_idx' }
    // );
    // console.log('✅ Created index: reputation_status_idx'); // Removed - attestor functionality deprecated

    console.log('🎉 All verification indexes created successfully!');

  } catch (error) {
    console.error('❌ Error creating verification indexes:', error);
    throw error;
  }
};

/**
 * Remove verification indexes (for rollback)
 */
export const removeVerificationIndexes = async () => {
  try {
    console.log('Removing verification system indexes...');

    const indexesToRemove = [
      'status_createdAt_idx',
      'assetType_country_idx',
      'assignedAttestors_status_idx',
      'expiresAt_idx',
      'ownerAddress_createdAt_idx',
      'type_country_status_idx',
      'specialties_status_reputation_idx',
      'reputation_status_idx'
    ];

    for (const indexName of indexesToRemove) {
      try {
        await VerificationRequestModel.collection.dropIndex(indexName);
        console.log(`✅ Removed index: ${indexName}`);
      } catch (error) {
        console.log(`⚠️  Index ${indexName} not found or already removed`);
      }
    }

    console.log('🎉 Verification indexes removal completed!');

  } catch (error) {
    console.error('❌ Error removing verification indexes:', error);
    throw error;
  }
};

// Run migration if called directly
if (require.main === module) {
  const runMigration = async () => {
    try {
      // Connect to MongoDB
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trustbridge');
      console.log('Connected to MongoDB');

      // Run migration
      await addVerificationIndexes();

      // Close connection
      await mongoose.connection.close();
      console.log('Migration completed successfully');
      process.exit(0);

    } catch (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }
  };

  runMigration();
}
