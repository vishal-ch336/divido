# MongoDB Atlas Connection Checklist

Use this checklist to verify your MongoDB Atlas setup is correct.

## ✅ Pre-Setup Checklist

- [ ] MongoDB Atlas account created
- [ ] Free cluster (M0) created and running
- [ ] Database user created with read/write permissions
- [ ] IP address whitelisted (or "Allow Access from Anywhere" enabled)
- [ ] Connection string copied from Atlas

## ✅ Configuration Checklist

- [ ] `.env` file exists in `backend/` directory
- [ ] `MONGODB_URI` is set in `.env`
- [ ] Connection string includes database name (`/expenseease`)
- [ ] Username and password are correct in connection string
- [ ] Special characters in password are URL encoded
- [ ] `JWT_SECRET` is set in `.env`
- [ ] `PORT` is set to 5000 (or your preferred port)
- [ ] `FRONTEND_URL` is set to `http://localhost:8080`

## ✅ Connection String Format

Your connection string should look like:

**MongoDB Atlas:**
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/expenseease?retryWrites=true&w=majority
```

**Key Points:**
- ✅ Starts with `mongodb+srv://`
- ✅ Has username and password (no `<` or `>` brackets)
- ✅ Has cluster address (e.g., `cluster0.xxxxx.mongodb.net`)
- ✅ Has database name `/expenseease` before the `?`
- ✅ Has query parameters `?retryWrites=true&w=majority`

## ✅ Testing Checklist

### Test 1: Connection Script
```bash
cd backend
npm run test:connection
```

**Expected Output:**
```
✅ Connection Successful!
   Host: cluster0.xxxxx.mongodb.net
   Database: expenseease
```

### Test 2: Backend Server
```bash
cd backend
npm run dev
```

**Expected Output:**
```
🔄 Connecting to MongoDB...
✅ MongoDB Connected Successfully!
   Host: cluster0.xxxxx.mongodb.net
   Database: expenseease
Server running on port 5000
```

### Test 3: Health Endpoint
Open in browser: `http://localhost:5000/api/health`

**Expected Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "database": "connected",
  "timestamp": "2024-12-07T..."
}
```

### Test 4: Frontend-Backend Connection
1. Open browser console (F12)
2. Run:
```javascript
fetch('http://localhost:5000/api/health')
  .then(r => r.json())
  .then(d => console.log('✅ Connected:', d))
  .catch(e => console.error('❌ Error:', e))
```

**Expected:** Should log the health check response

## ❌ Common Errors

### Error: "authentication failed"
- [ ] Check username is correct
- [ ] Check password is correct
- [ ] Verify password special characters are URL encoded
- [ ] Verify database user exists in Atlas

### Error: "IP not whitelisted"
- [ ] Go to Network Access in Atlas
- [ ] Add your IP or enable "Allow Access from Anywhere"
- [ ] Wait 2-3 minutes for changes to propagate

### Error: "ENOTFOUND" or "ECONNREFUSED"
- [ ] Check internet connection
- [ ] Verify cluster is running (not paused) in Atlas
- [ ] Check connection string format is correct

### Error: "timeout"
- [ ] Check network connection
- [ ] Try again (sometimes temporary Atlas issues)
- [ ] Verify IP is whitelisted

## ✅ Final Verification

Once all tests pass:

1. **Backend is running** ✅
2. **MongoDB is connected** ✅
3. **Health endpoint works** ✅
4. **Frontend can reach backend** ✅

## 🚀 Next Steps

1. Test signup: `POST /api/auth/signup`
2. Test login: `POST /api/auth/login`
3. Verify data in Atlas (check Collections in dashboard)

## 📚 Need Help?

- **Quick Start:** See `QUICK_START.md`
- **Detailed Guide:** See `ATLAS_SETUP_GUIDE.md`
- **Troubleshooting:** See `MONGODB_SETUP.md` or `../TROUBLESHOOTING.md`

