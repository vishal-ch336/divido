# MongoDB Connection Setup Guide

## Error: "bad auth : authentication failed"

This error occurs when MongoDB cannot authenticate with the provided credentials. Here's how to fix it:

## Solution 1: Use Local MongoDB (No Authentication)

If you want to use local MongoDB without authentication:

1. Make sure MongoDB is running locally:
   ```bash
   # macOS
   brew services start mongodb-community
   
   # Linux
   sudo systemctl start mongod
   
   # Windows
   net start MongoDB
   ```

2. Update your `.env` file:
   ```env
   MONGODB_URI=mongodb://localhost:27017/expenseease
   ```

## Solution 2: Use MongoDB Atlas (Recommended)

### Step 1: Create MongoDB Atlas Account
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for a free account
3. Create a free cluster (M0 - Free tier)

### Step 2: Create Database User
1. In Atlas dashboard, go to **Database Access**
2. Click **Add New Database User**
3. Choose **Password** authentication
4. Enter username and generate a secure password (SAVE THIS!)
5. Set user privileges to **Read and write to any database**
6. Click **Add User**

### Step 3: Whitelist Your IP
1. Go to **Network Access**
2. Click **Add IP Address**
3. Click **Allow Access from Anywhere** (for development) or add your specific IP
4. Click **Confirm**

### Step 4: Get Connection String
1. Go to **Database** → Click **Connect**
2. Choose **Connect your application**
3. Select **Node.js** and version **5.5 or later**
4. Copy the connection string (looks like):
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### Step 5: Update .env File
Replace `<username>` and `<password>` with your database user credentials:

```env
MONGODB_URI=mongodb+srv://yourusername:yourpassword@cluster0.xxxxx.mongodb.net/expenseease?retryWrites=true&w=majority
```

**Important:**
- Replace `yourusername` with your database username
- Replace `yourpassword` with your database password (URL encode special characters)
- Replace `cluster0.xxxxx` with your actual cluster address
- Add `/expenseease` before the `?` to specify the database name

### URL Encoding Special Characters
If your password contains special characters, encode them:
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `&` → `%26`
- `+` → `%2B`
- `=` → `%3D`

Example: If password is `P@ssw0rd#123`, use `P%40ssw0rd%23123`

## Solution 3: Local MongoDB with Authentication

If you have local MongoDB with authentication enabled:

```env
MONGODB_URI=mongodb://username:password@localhost:27017/expenseease?authSource=admin
```

## Testing the Connection

After updating your `.env` file:

1. Restart your backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. You should see:
   ```
   MongoDB Connected: cluster0.xxxxx.mongodb.net
   Server running on port 5000
   ```

3. If you still get errors, check:
   - Username and password are correct
   - IP address is whitelisted (for Atlas)
   - Connection string format is correct
   - No extra spaces in the connection string

## Quick Test Script

You can test your connection string directly:

```bash
node -e "require('dotenv').config(); const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(() => { console.log('✅ Connected!'); process.exit(0); }).catch(err => { console.error('❌ Error:', err.message); process.exit(1); });"
```

## Common Issues

### Issue: "authentication failed"
- **Fix**: Check username/password in connection string
- **Fix**: Make sure database user exists in Atlas

### Issue: "IP not whitelisted"
- **Fix**: Add your IP to Network Access in Atlas

### Issue: "ECONNREFUSED"
- **Fix**: MongoDB is not running (local) or connection string is wrong

### Issue: "bad auth" with local MongoDB
- **Fix**: Remove authentication or use: `mongodb://localhost:27017/expenseease`

