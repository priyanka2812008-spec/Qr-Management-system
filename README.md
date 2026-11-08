# Hacker's Unity — Hackathon QR Check-in & Smart Seating Platform

> A complete system for ticketing, signed QR-based entry, live team verification, AI-planned seating, and food coupons — built for Hacker's Unity hackathons.

---

## 📁 Project Structure (प्रोजेक्ट स्ट्रक्चर)

User request ke mutabiq frontend, backend or `.env` files ko clearly organize kiya gaya hai:

```text
hackers unity/
│
├── .env                       # Root environment configuration (Global)
├── .env.example               # Root example template
├── package.json               # Root scripts to run both apps
├── README.md                  # Comprehensive Documentation & Setup Guide
│
├── backend/                   # ⚙️ BACKEND (Node.js, Express, Socket.io)
│   ├── .env                   # Backend specific environment variables
│   ├── .env.example           # Backend env template
│   ├── package.json           # Backend dependencies (Express, CORS, Socket.io, Dotenv)
│   ├── testEngine.js          # Automated end-to-end unit test suite
│   ├── data/
│   │   └── db.json            # Auto-seeded local JSON database (events, participants, teams, seats, coupons, logs)
│   └── src/
│       ├── config/
│       │   └── env.js         # Environment loader
│       ├── db/
│       │   └── db.js          # Database engine with auto-seeding & persistence
│       ├── security/
│       │   └── qrSigner.js    # HMAC-SHA256 signature generator & tamper verification
│       ├── services/
│       │   ├── seatEngine.js  # Deterministic Seat Allocation Engine (team clustering & capacity safety)
│       │   ├── couponService.js # Meal coupon generator, time-window checker & single-use redemption
│       │   └── groqPlanner.js # Groq LLM (Llama 3.3/3.1) seating & food planner with schema validation
│       ├── routes/
│       │   ├── checkin.js     # POST /api/checkin/scan & POST /api/checkin/confirm
│       │   ├── ai.js          # POST /api/ai/plan & POST /api/ai/plan/approve
│       │   ├── coupons.js     # POST /api/coupons/redeem & GET /api/coupons/stats
│       │   ├── dashboard.js   # GET /api/dashboard/stats & GET /api/dashboard/export (CSV)
│       │   ├── seating.js     # GET /api/seating & POST /api/seating/swap (Organizer override)
│       │   └── participants.js# GET /api/participants & GET /api/participants/:id/ticket
│       └── server.js          # Express app + HTTP server + Socket.io WebSocket server
│
└── frontend/                  # 💻 FRONTEND (React 18, Vite, Tailwind CSS, Lucide, Canvas Confetti)
    ├── .env                   # Frontend environment variables (VITE_API_URL, VITE_SOCKET_URL)
    ├── .env.example           # Frontend env template
    ├── package.json           # Frontend dependencies
    ├── vite.config.js         # Vite configuration with API proxy
    ├── tailwind.config.js     # Tailwind typography & brand palette
    ├── index.html             # HTML entry point with Plus Jakarta Sans & JetBrains Mono
    └── src/
        ├── App.jsx            # Main app shell with real-time sync & view switcher
        ├── main.jsx           # React DOM root
        ├── index.css          # Tailwind base & scanner laser animation
        ├── context/
        │   └── SocketContext.jsx # Real-time live synchronization provider (Socket.io)
        ├── services/
        │   └── api.js         # REST API client connecting to backend
        └── components/
            ├── Navbar.jsx               # Hacker's Unity branding, LIVE SYNC badge & navigation
            ├── DashboardView.jsx        # Organizer Dashboard (Live counters, hourly graph, team table, CSV export)
            ├── CoordinatorScannerView.jsx # Coordinator Scanner PWA (Live viewfinder, 4 scan states, badge printer)
            ├── ParticipantTicketView.jsx  # Participant Ticket card, signed QR code, seat badge & meal coupons
            ├── AISeatingPlannerView.jsx   # Seating Map (12 tables T1-T12, Rows A/B/C, Groq AI generator & approval)
            └── FoodCounterScannerView.jsx # Food Counter Scanner (One-time use validation, time-windows, diet display)
```

---

## 🔑 Environment Files (.env Files)

Is project me **separate `.env` files** provide ki gayi hain:

### 1. Root `.env` (`.env`)
```env
PORT=5000
NODE_ENV=development
FRONTEND_PORT=5173
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
QR_HMAC_SECRET=hackers_unity_super_secret_hmac_key_2026_xyz
JWT_SECRET=hackers_unity_jwt_secret_token_auth_998877
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

### 2. Backend `.env` (`backend/.env`)
```env
PORT=5000
NODE_ENV=development
QR_HMAC_SECRET=hackers_unity_super_secret_hmac_key_2026_xyz
JWT_SECRET=hackers_unity_jwt_secret_token_auth_998877
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
GOOGLE_SHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
CORS_ORIGIN=http://localhost:5173
```

### 3. Frontend `.env` (`frontend/.env`)
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_EVENT_NAME="Hacker's Unity Hackathon 2026"
VITE_EVENT_VENUE="Main Tech Hall, Convention Center"
```

---

## 🚀 How to Run (Start Kaise Karein)

### Option A (Sabse Aasan — Single Command):
Root folder me bas yeh command run karein:
```bash
npm run dev
```
*(Yeh ek hi terminal me backend aur frontend dono ko colored live logs ke saath start kar dega!)*

Windows users root folder me **`start.bat`** file par double-click karke bhi dono servers direct launch kar sakte hain.

---

### Option B (Alag-alag Terminals Me):

#### Step 1: Start Backend Server
Terminal 1 me:
```bash
cd backend
npm run dev
```
Backend will start on: **`http://localhost:5000`**

#### Step 2: Start Frontend Application
Terminal 2 me:
```bash
cd frontend
npm run dev
```
Frontend will start on: **`http://localhost:5173`**

### Or Run from Root (Using root scripts):
```bash
# Terminal 1:
npm run dev:backend

# Terminal 2:
npm run dev:frontend
```

---

## 🎯 Key Capabilities Implemented (Document ke mutabiq)

1. **Signed QR Ticket Generation**:
   - Har participant ko tamper-proof HMAC-SHA256 signed QR ticket generate hota hai.
   - Screenshot modify ya tamper karne par red warning security state trigger hoti hai.

2. **Coordinator Scanner PWA (4 Scan Result States)**:
   - **Valid - Slot confirmed**: Name, team, slot CONFIRMED dikhata hai. Tap "Confirm check-in".
   - **Valid - Slot not confirmed**: Pending slot alert; Help desk routing ya Organizer override.
   - **Already checked in**: Pehle scan ka time aur assigned seat batata hai; duplicate admission block karta hai.
   - **Invalid / tampered QR**: Red warning; security ke liye koi data reveal nahi karta.

3. **Deterministic Seat Engine**:
   - Ek hi team ke members ko ek hi table par cluster karta hai.
   - Table bharne par same row ke adjacent table par allocate karta hai.
   - Reserved seats (Judges/Mentors/Accessibility) general pool se exclude rehti hain.
   - Double-booking 100% mathematically impossible hai.

4. **Groq AI Seating & Food Planner (Llama 3.3)**:
   - Google Sheet reference le kar Hall layout (12 tables, 96 seats, 3 rows, 4 meals) plan karta hai.
   - Backend strict JSON schema validator check karta hai.
   - Organizer review karke "Approve plan" ya "Regenerate" kar sakta hai.

5. **Food Coupon Service**:
   - Check-in confirm hote hi automatic meal coupons issue hote hain.
   - One-time use: Ek coupon QR code ek hi baar redeem ho sakta hai.
   - Time-window rule: Specified meal hours me hi valid rehta hai.
   - Diet aware: Veg / Non-Veg / Jain food staff ke screen par prominently display hota hai.

6. **Organizer Dashboard**:
   - Real-time counters: Registered (412), Checked-in (287), Pending (125), Coupons issued (287).
   - Check-ins by hour bar chart (peak arrival tracking).
   - Live stream recent check-ins.
   - Complete attendance report CSV export.
   - Live synchronization through WebSockets (Socket.io).

---

## 🧪 Testing Backend Core Logic

Aap backend core logic ko directly test kar sakte hain:
```bash
cd backend
npm test
```
Yeh automatically test karta hai:
- Signed QR Token creation & verification
- Deterministic Seat allocation
- Coupon generation & single-use redemption
- Duplicate claim prevention
- Groq AI schema planning

