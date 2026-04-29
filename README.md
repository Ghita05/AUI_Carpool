# AUI Carpool

A peer-to-peer ride-sharing platform built exclusively for the Al Akhawayn University community. The system formalizes inter-city carpooling through identity verification, structured ride lifecycle management, real-time tracking, and a content-based recommendation engine.


## Architecture

The platform follows a **3.5-tier architecture** distributed across three independently deployable packages co-located in this monorepo.

### `/backend` : 0.5 Tier (API Gateway), Business Logic Tier, and Data Tier

The Node.js and Express REST API serving both clients. Encapsulates the entire server-side stack:

- **0.5 Tier (API Gateway):** Express.js middleware chain — Helmet, CORS, Morgan, body parser, rate limiter, JWT authentication, role authorization, Multer file handling, and centralized error handling. Every request traverses this chain before reaching any controller.
- **Business Logic Tier:** Seven domain controllers (auth, ride, vehicle, review, notification, message, route), three pure utility functions (Haversine, namesMatch, scoreRides), four scheduled cron jobs, the OCR pipeline, and the Socket.IO server implementing the GPS-driven ride state machine.
- **Data Tier:** MongoDB Atlas accessed via Mongoose ODM, with eight collections including the unified Ride collection that embeds bookings as subdocuments for atomic seat management.
- **External APIs:** Gemini Flash 2.0 for OCR and review summaries, Google Maps for routing, Cloudinary for image storage, and Nodemailer for email delivery.

### `/mobile` : Presentation Tier (React Native + Expo)

The mobile client distributed as a production APK on Android and through Expo Go on iOS. Organized across nine screen modules corresponding to the system's functional building blocks. Communicates with the backend through an Axios-based service layer with JWT interceptors for silent token refresh, and through a Socket.IO client context for real-time event subscription. Tokens are stored in Expo SecureStore using hardware-backed encryption.

### `/web` : Presentation Tier (React.js Admin Dashboard)

The standalone web admin dashboard built with Create React App, deployed independently from the mobile codebase and scoped to administrative functionality. Consumes the same backend API through a centralized service file. Provides four operational views: platform statistics, user management, ride management, and review moderation. Map rendering uses React-Leaflet with CartoDB Voyager tiles.

---

## Running the Application

### Prerequisites

- Node.js v18 or higher
- npm v9 or higher
- MongoDB Atlas connection string
- Expo CLI: `npm install -g expo-cli`
- An `.env` file in `/backend` with: `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_VERIFICATION_SECRET`, `JWT_RESET_SECRET`, `GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `EMAIL_USER`, `EMAIL_PASS`

---

### Development

**Backend:**
```bash
cd backend
npm install
npm run dev
```


**Mobile:**
```bash
cd mobile
npm install
npx expo start
```
Scan the QR code with Expo Go on your device. Ensure the device is on the same WiFi network as the backend host.

**Web:**
```bash
cd web
npm install
npm start
```
The admin dashboard runs on `http://localhost:3000`.

---

### Production

**Backend** is currently deployed live on **Railway** with TLS termination and a CA-signed certificate. The MongoDB Atlas connection requires no migration overhead.

**Web admin dashboard** is deployed on **Vercel**:
```bash
cd web
npm run build
vercel deploy --prod
```

**Mobile** is currently distributed as a production APK for Android only. The iOS production build requires an Apple Developer account and is planned as part of future deployment phase.

To build the Android APK:
```bash
cd mobile
eas build --platform android --profile production
```

---

## Documentation

Full system documentation, including the requirements engineering output, the system design artifacts (CPMs, DFDs, data dictionaries), the architecture diagrams, and the testing reports, is available in the capstone's final report.