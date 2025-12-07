# ExpenseEase Backend

Backend API for ExpenseEase India built with Node.js, Express, and MongoDB.

## Setup

1. Install dependencies:
```bash
npm install
```

2. **Set up MongoDB:**
   
   **Option A: MongoDB Atlas (Recommended - Free Cloud Database)**
   - Follow the detailed guide: `ATLAS_SETUP_GUIDE.md`
   - Quick steps:
     1. Create free account at https://www.mongodb.com/cloud/atlas
     2. Create a free cluster (M0)
     3. Create database user
     4. Whitelist your IP (or allow from anywhere for dev)
     5. Get connection string
     6. Update `.env` with your connection string

   **Option B: Local MongoDB**
   - Install MongoDB locally
   - Start MongoDB service
   - Use: `mongodb://localhost:27017/expenseease`

3. Create a `.env` file in the backend directory:
```
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/expenseease?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
FRONTEND_URL=http://localhost:8080
```

   **For MongoDB Atlas:** Replace `username`, `password`, and `cluster.mongodb.net` with your actual values.
   
   **For Local MongoDB:** Use `mongodb://localhost:27017/expenseease`

4. **Test the connection** (optional but recommended):
```bash
npm run test:connection
```

5. Start the server:
```bash
npm run dev
```

The server will run on `http://localhost:5000`

You should see:
```
🔄 Connecting to MongoDB...
✅ MongoDB Connected Successfully!
   Host: cluster0.xxxxx.mongodb.net
   Database: expenseease
Server running on port 5000
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Groups
- `GET /api/groups` - Get all groups for current user (protected)
- `GET /api/groups/:id` - Get single group (protected)
- `POST /api/groups` - Create a new group (protected)

### Expenses
- `GET /api/expenses` - Get all expenses (protected, optional ?groupId query)
- `POST /api/expenses` - Create a new expense (protected)

### Activity
- `GET /api/activity` - Get activity logs (protected, optional ?groupId query)

### Dashboard
- `GET /api/dashboard/summary` - Get dashboard summary (protected)

## Environment Variables

- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `NODE_ENV` - Environment (development/production)
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:8080)

