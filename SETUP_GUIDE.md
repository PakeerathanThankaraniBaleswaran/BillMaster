# Quick Setup Guide

## 📦 Step 1: Install Dependencies

### Backend
```bash
cd backend
npm install
```

### Frontend
```bash
cd frontend
npm install
```

## 🔧 Step 2: Configure Environment Variables

### Backend Configuration
Create `backend/.env` file with the following:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/billmaster
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=30d
CORS_ORIGIN=http://localhost:3000
```

**Note:** 
- For MongoDB Atlas, use: `mongodb+srv://username:password@cluster.mongodb.net/billmaster`
- Generate a strong JWT_SECRET (e.g., use `openssl rand -base64 32`)

### ✅ Local vs Atlas (Important)
- **Local MongoDB** = Data is stored on the same computer where MongoDB is installed (e.g., the client’s laptop).
- **MongoDB Atlas** = Data is stored in the cloud (internet required).

If your requirement is “client laptop-லேயே data store ஆகணும்”, choose **Local MongoDB**.

### Frontend Configuration
Create `frontend/.env` file with the following:
```env
VITE_API_URL=http://localhost:5000/api
```

## 🗄️ Step 3: Start MongoDB

Make sure MongoDB is running on your system:

**Local MongoDB:**
```bash
# On Linux/Mac
sudo systemctl start mongod

# Or check if it's running
mongosh
```

**Local MongoDB (Windows - Client Laptop):**
1. Download and install **MongoDB Community Server**:
  - During installation, keep **Install MongoDB as a Service** enabled.
  - Optional: Install **MongoDB Compass** (GUI).
2. Start MongoDB service:
  - Open **Services** → start **MongoDB Server**
  - OR run in admin CMD:
    ```bat
    net start MongoDB
    ```
3. Verify MongoDB is running:
  - Open **Command Prompt** and run:
    ```bat
    mongosh
    ```
4. Use local connection string in [backend/.env](backend/.env):
  - Recommended:
    ```env
    MONGODB_URI=mongodb://127.0.0.1:27017/billmaster
    ```

**Where is data stored (Windows)?**
- If installed as a service with default settings, MongoDB stores files under a data directory configured in the service (commonly `C:\Program Files\MongoDB\Server\<version>\data\` or `C:\data\db`).
- You can confirm it inside `mongosh` with:
  - `db.adminCommand({ getCmdLineOpts: 1 })`

**MongoDB Atlas:**
- No local setup needed, just use your connection string in `.env`

### MongoDB Atlas Setup (Quick)
1. Create an account and a cluster
2. **Database Access**: create a DB user (username/password)
3. **Network Access**: allow your client IP (avoid `0.0.0.0/0` in production)
4. **Connect → Drivers**: copy the connection string
5. Paste in [backend/.env](backend/.env):
  ```env
  MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>/<db>?retryWrites=true&w=majority
  ```

## 🚀 Step 4: Run the Application

### Terminal 1 - Start Backend
```bash
cd backend
npm run dev
```

You should see:
```
✅ MongoDB Connected: ...
🚀 Server running in development mode on port 5000
📍 Server URL: http://localhost:5000
```

### Terminal 2 - Start Frontend
```bash
cd frontend
npm run dev
```

You should see:
```
  VITE v5.0.8  ready in XXX ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

## ✅ Step 5: Verify Setup

1. **Backend Health Check:**
   - Open browser: `http://localhost:5000/api/health`
   - Should return: `{"success":true,"message":"Server is running!"}`

2. **Frontend:**
   - Open browser: `http://localhost:3000`
   - Should see the BillMaster welcome page

## 🧪 Test API Endpoints

### Register a User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## 🐛 Troubleshooting

### MongoDB Connection Issues
- **Error: "MongoServerError: connect ECONNREFUSED"**
  - Make sure MongoDB is running: `sudo systemctl status mongod`
  - Check your MONGODB_URI in `.env`

### Port Already in Use
- **Error: "Port 5000 already in use"**
  - Change PORT in `backend/.env`
  - Or kill the process: `lsof -ti:5000 | xargs kill`

### Frontend Can't Connect to Backend
- Check CORS_ORIGIN in `backend/.env` matches frontend URL
- Verify VITE_API_URL in `frontend/.env`

## 🌐 Deploy (Netlify Frontend)

Netlify hosts the **frontend only** (static files). Your Express API in `backend/` must be deployed separately (Render/Railway/VPS/etc).

### Netlify build settings
- **Base directory**: `frontend`
- **Build command**: `npm run build`
- **Publish directory**: `dist`

### Required environment variables

On **Netlify** (Site settings → Environment variables):
```env
VITE_API_URL=https://<YOUR-BACKEND-HOST>/api
```

On your **backend host** (Render/Railway/etc):
```env
CORS_ORIGIN=https://<YOUR-NETLIFY-SITE>.netlify.app
```

### Quick health check
- Backend should respond: `GET https://<YOUR-BACKEND-HOST>/api/health`
- Frontend signup/login should stop showing 404

## 📚 Next Steps

1. ✅ Your MERN stack is ready!
2. Start building features by adding:
   - New models in `backend/models/`
   - New controllers in `backend/controllers/`
   - New routes in `backend/routes/`
   - New pages in `frontend/src/pages/`
   - New components in `frontend/src/components/`

Happy Coding! 🎉

