# Quick Start - MongoDB Atlas Setup

## 🚀 Fastest Way to Get Started

### 1. Create MongoDB Atlas Account (2 minutes)

1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Sign up (free)
3. Create a free cluster (M0 - click "Create")

### 2. Setup Database User (1 minute)

1. Click **"Database Access"** → **"Add New Database User"**
2. Username: `expenseease-user`
3. Password: Click **"Autogenerate Secure Password"** → **COPY IT!**
4. Privileges: **"Read and write to any database"**
5. Click **"Add User"**

### 3. Whitelist IP (30 seconds)

1. Click **"Network Access"** → **"Add IP Address"**
2. Click **"Allow Access from Anywhere"** (for development)
3. Click **"Confirm"**

### 4. Get Connection String (1 minute)

1. Click **"Database"** → **"Connect"** on your cluster
2. Choose **"Connect your application"**
3. Driver: **Node.js**, Version: **5.5 or later**
4. **Copy the connection string**

### 5. Configure .env File (2 minutes)

1. In `backend/` directory, create `.env` file:
```bash
cd backend
touch .env
```

2. Add this content (replace with your values):
```env
PORT=5000
MONGODB_URI=mongodb+srv://expenseease-user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/expenseease?retryWrites=true&w=majority
JWT_SECRET=expenseease-super-secret-jwt-key-2024
NODE_ENV=development
FRONTEND_URL=http://localhost:8080
```

**Replace:**
- `YOUR_PASSWORD` with the password you copied (URL encode special chars if needed)
- `cluster0.xxxxx` with your actual cluster address

**URL Encode Special Characters:**
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`

### 6. Test Connection (30 seconds)

```bash
npm run test:connection
```

Should show: `✅ Connection Successful!`

### 7. Start Backend

```bash
npm run dev
```

Should show:
```
✅ MongoDB Connected Successfully!
Server running on port 5000
```

## ✅ Done!

Your backend is now connected to MongoDB Atlas!

## 🐛 Troubleshooting

**"authentication failed"**
- Check username/password in connection string
- URL encode special characters in password

**"IP not whitelisted"**
- Go to Network Access in Atlas
- Add your IP or allow from anywhere

**Need more help?**
- See `ATLAS_SETUP_GUIDE.md` for detailed instructions
- See `MONGODB_SETUP.md` for troubleshooting

