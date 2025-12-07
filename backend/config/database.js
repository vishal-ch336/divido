import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('❌ Error: MONGODB_URI is not defined in environment variables');
      console.error('Please create a .env file in the backend directory with MONGODB_URI');
      process.exit(1);
    }

    // MongoDB connection options optimized for Atlas
    const options = {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      family: 4, // Use IPv4, skip trying IPv6
    };

    console.log('🔄 Connecting to MongoDB...');
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    
    console.log(`✅ MongoDB Connected Successfully!`);
    console.log(`   Host: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

  } catch (error) {
    console.error(`\n❌ MongoDB Connection Error: ${error.message}\n`);
    
    // Provide helpful error messages based on error type
    if (error.message.includes('authentication failed') || error.message.includes('bad auth')) {
      console.error('🔐 Authentication Failed!');
      console.error('   Possible issues:');
      console.error('   1. Incorrect username or password in connection string');
      console.error('   2. Database user doesn\'t exist in MongoDB Atlas');
      console.error('   3. Special characters in password need URL encoding');
      console.error('\n   For MongoDB Atlas:');
      console.error('   - Check Database Access in Atlas dashboard');
      console.error('   - Verify username and password are correct');
      console.error('   - URL encode special characters: @ → %40, # → %23, etc.');
      console.error('\n   Example Atlas URI:');
      console.error('   mongodb+srv://username:password@cluster.mongodb.net/expenseease?retryWrites=true&w=majority');
      
    } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      console.error('🌐 Network Connection Failed!');
      console.error('   Possible issues:');
      console.error('   1. MongoDB Atlas cluster is not accessible');
      console.error('   2. Your IP address is not whitelisted in Atlas');
      console.error('   3. Network connectivity issues');
      console.error('\n   For MongoDB Atlas:');
      console.error('   - Go to Network Access in Atlas dashboard');
      console.error('   - Add your IP address or click "Allow Access from Anywhere"');
      console.error('   - Wait a few minutes for changes to propagate');
      
    } else if (error.message.includes('timeout')) {
      console.error('⏱️  Connection Timeout!');
      console.error('   Possible issues:');
      console.error('   1. Network is slow or unstable');
      console.error('   2. MongoDB Atlas cluster might be paused');
      console.error('   3. Firewall blocking connection');
      
    } else if (error.message.includes('Invalid connection string')) {
      console.error('📝 Invalid Connection String!');
      console.error('   Check your MONGODB_URI format in .env file');
      console.error('   Example: mongodb+srv://user:pass@cluster.mongodb.net/dbname?retryWrites=true&w=majority');
      
    } else {
      console.error('❌ MongoDB Connection Error!');
      console.error('   Please check:');
      console.error('   1. MONGODB_URI in .env file is correct');
      console.error('   2. MongoDB Atlas cluster is running');
      console.error('   3. Network connectivity');
      console.error('   4. See backend/MONGODB_SETUP.md for detailed setup instructions');
    }
    
    console.error('\n📚 For help, see: backend/MONGODB_SETUP.md\n');
    process.exit(1);
  }
};

export default connectDB;

