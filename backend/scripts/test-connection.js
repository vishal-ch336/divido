#!/usr/bin/env node

/**
 * Test MongoDB Connection Script
 * 
 * This script tests the MongoDB connection without starting the full server.
 * Useful for debugging connection issues.
 * 
 * Usage: node scripts/test-connection.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const testConnection = async () => {
  console.log('🧪 Testing MongoDB Connection...\n');
  
  // Check if MONGODB_URI is set
  if (!process.env.MONGODB_URI) {
    console.error('❌ Error: MONGODB_URI is not set in .env file');
    console.error('   Please create a .env file in the backend directory');
    console.error('   See backend/MONGODB_SETUP.md for instructions\n');
    process.exit(1);
  }

  // Mask password in connection string for display
  const maskedUri = process.env.MONGODB_URI.replace(/:([^:@]+)@/, ':***@');
  console.log(`📝 Connection String: ${maskedUri}\n`);

  try {
    const options = {
      serverSelectionTimeoutMS: 10000, // 10 second timeout
      socketTimeoutMS: 45000,
    };

    console.log('🔄 Attempting to connect...');
    const startTime = Date.now();
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    const duration = Date.now() - startTime;
    
    console.log('\n✅ Connection Successful!\n');
    console.log(`   Host: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);
    console.log(`   Connection Time: ${duration}ms`);
    console.log(`   Ready State: ${conn.connection.readyState === 1 ? 'Connected' : 'Disconnected'}\n`);
    
    // Test a simple operation
    console.log('🧪 Testing database operation...');
    const collections = await conn.connection.db.listCollections().toArray();
    console.log(`   Found ${collections.length} collection(s) in database\n`);
    
    await mongoose.disconnect();
    console.log('✅ Test completed successfully!\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Connection Failed!\n');
    console.error(`Error: ${error.message}\n`);
    
    // Provide specific guidance based on error
    if (error.message.includes('authentication failed') || error.message.includes('bad auth')) {
      console.error('💡 Fix: Check your username and password in the connection string');
      console.error('   Make sure to URL encode special characters in password\n');
    } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      console.error('💡 Fix: Check Network Access in MongoDB Atlas');
      console.error('   Make sure your IP address is whitelisted\n');
    } else if (error.message.includes('timeout')) {
      console.error('💡 Fix: Check your network connection');
      console.error('   The connection timed out - try again\n');
    }
    
    console.error('📚 For detailed setup instructions, see: backend/MONGODB_SETUP.md\n');
    process.exit(1);
  }
};

// Run the test
testConnection();

