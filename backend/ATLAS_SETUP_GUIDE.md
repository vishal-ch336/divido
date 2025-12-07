# MongoDB Atlas Setup Guide - Step by Step

This guide will walk you through setting up MongoDB Atlas for the ExpenseEase backend.

## Step 1: Create MongoDB Atlas Account

1. Go to https://www.mongodb.com/cloud/atlas
2. Click **"Try Free"** or **"Sign Up"**
3. Sign up with:
   - Email address
   - Password
   - Or use Google/GitHub sign-in
4. Verify your email if required

## Step 2: Create a Free Cluster

1. After logging in, you'll see the **"Deploy a cloud database"** screen
2. Choose **"M0 FREE"** (Free Shared Cluster)
3. Select a **Cloud Provider** (AWS, Google Cloud, or Azure)
4. Choose a **Region** closest to you (e.g., `us-east-1` for US East)
5. Click **"Create"**
6. Wait 1-3 minutes for the cluster to be created

## Step 3: Create Database User

1. In the Atlas dashboard, click **"Database Access"** in the left sidebar
2. Click **"Add New Database User"**
3. Choose **"Password"** authentication method
4. Enter:
   - **Username**: `expenseease-user` (or any username you prefer)
   - **Password**: Click **"Autogenerate Secure Password"** or create your own
   - **⚠️ IMPORTANT**: Copy and save the password! You won't be able to see it again.
5. Under **"Database User Privileges"**, select **"Read and write to any database"**
6. Click **"Add User"**

## Step 4: Whitelist Your IP Address

1. Click **"Network Access"** in the left sidebar
2. Click **"Add IP Address"**
3. For development, click **"Allow Access from Anywhere"** (adds `0.0.0.0/0`)
   - ⚠️ This allows access from any IP (OK for development, not for production)
   - For production, add only your server's IP address
4. Click **"Confirm"**
5. Wait 1-2 minutes for the change to take effect

## Step 5: Get Your Connection String

1. Go back to **"Database"** (or click **"Clusters"** in the left sidebar)
2. Click the **"Connect"** button on your cluster
3. Choose **"Connect your application"**
4. Select:
   - **Driver**: `Node.js`
   - **Version**: `5.5 or later`
5. Copy the connection string (it looks like):
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

## Step 6: Configure Your Connection String

1. Open the connection string you copied
2. Replace `<username>` with your database username (from Step 3)
3. Replace `<password>` with your database password (from Step 3)
4. **Important**: Add the database name before the `?`
   - Change: `mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority`
   - To: `mongodb+srv://user:pass@cluster.mongodb.net/expenseease?retryWrites=true&w=majority`
   - Notice `/expenseease` was added before the `?`

### URL Encoding Special Characters

If your password contains special characters, you MUST encode them:
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `&` → `%26`
- `+` → `%2B`
- `=` → `%3D`
- `/` → `%2F`
- `?` → `%3F`

**Example:**
- Password: `MyP@ss#123`
- Encoded: `MyP%40ss%23123`
- Full URI: `mongodb+srv://user:MyP%40ss%23123@cluster.mongodb.net/expenseease?retryWrites=true&w=majority`

## Step 7: Update Your .env File

1. Navigate to the `backend` directory
2. Create or edit the `.env` file
3. Add your connection string:

```env
PORT=5000
MONGODB_URI=mongodb+srv://yourusername:yourpassword@cluster0.xxxxx.mongodb.net/expenseease?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
FRONTEND_URL=http://localhost:8080
```

**Replace:**
- `yourusername` with your database username
- `yourpassword` with your database password (URL encoded if needed)
- `cluster0.xxxxx` with your actual cluster address

## Step 8: Test the Connection

### Option 1: Use the Test Script

```bash
cd backend
node scripts/test-connection.js
```

You should see:
```
✅ Connection Successful!
   Host: cluster0.xxxxx.mongodb.net
   Database: expenseease
```

### Option 2: Start the Backend Server

```bash
cd backend
npm run dev
```

You should see:
```
🔄 Connecting to MongoDB...
✅ MongoDB Connected Successfully!
   Host: cluster0.xxxxx.mongodb.net
   Database: expenseease
Server running on port 5000
```

## Troubleshooting

### Error: "authentication failed"
- ✅ Check username and password are correct
- ✅ Make sure password is URL encoded if it has special characters
- ✅ Verify the database user exists in Atlas (Database Access)

### Error: "IP not whitelisted"
- ✅ Go to Network Access in Atlas
- ✅ Add your IP address or use "Allow Access from Anywhere"
- ✅ Wait 2-3 minutes for changes to propagate

### Error: "ENOTFOUND" or "ECONNREFUSED"
- ✅ Check your internet connection
- ✅ Verify the cluster is running (not paused) in Atlas
- ✅ Make sure the connection string format is correct

### Error: "timeout"
- ✅ Check your network connection
- ✅ Try again (sometimes Atlas has temporary issues)
- ✅ Verify your IP is whitelisted

## Security Best Practices

1. **Never commit `.env` file to git** - It's already in `.gitignore`
2. **Use strong passwords** for database users
3. **Restrict IP access** in production (don't use "Allow Access from Anywhere")
4. **Rotate passwords** regularly
5. **Use environment variables** in production (not .env files)

## Next Steps

Once connected:
1. ✅ Test the signup endpoint: `POST /api/auth/signup`
2. ✅ Test the login endpoint: `POST /api/auth/login`
3. ✅ Verify data is being saved in Atlas (check Collections in Atlas dashboard)

## Need Help?

- See `backend/MONGODB_SETUP.md` for more details
- See `TROUBLESHOOTING.md` for common issues
- Check MongoDB Atlas documentation: https://docs.atlas.mongodb.com/

