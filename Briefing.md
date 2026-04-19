# AUI Carpool — Technical Briefing

## Architecture Overview

**Monorepo** with 3 packages under one root:
- `backend/` — Node.js + Express REST API + Socket.IO
- `mobile/` — React Native (Expo SDK 54) mobile app
- `web/` — React web dashboard (mock data only, not wired to API)

## Backend

### Stack
Express 4.21 · MongoDB Atlas (Mongoose 8.7) · Socket.IO 4.8 · JWT auth · Nodemailer SMTP · Multer file uploads · Helmet + CORS + rate limiting

### Server Configuration (server.js)
- **Dual-server mode**: HTTPS on port 5000 (self-signed cert in `backend/certs/`) + HTTP fallback on port 5001 (for Expo Go which can't trust self-signed certs)
- Socket.IO attached to **both** servers
- Middleware chain: `helmet()` → `cors()` → `morgan('dev')` → `express.json(10mb)` → `express.urlencoded` → static `/uploads` → rate limit (100 req/15min on `/api/`)

### Data Models (8 collections)

| Model | Key Fields |
|-------|-----------|
| **User** | email (@aui.ma only), password (bcrypt), role (Passenger/Driver/Admin), verificationStatus, averageRating, totalCompletedRides, cancellationCount, accountStatus, dismissedRideRequests[] |
| **Vehicle** | ownerId→User, brand/model/color/licensePlate(unique)/year, sizeCategory, luggageCapacity, smokingPolicy, registrationCardImage |
| **Ride** | driverId→User, vehicleId→Vehicle, departureLocation/destination, stops[], departureDateTime, totalSeats/availableSeats, pricePerSeat, status (Draft/Active/Full/Completed/Cancelled), genderPreference, route (embedded lat/lng subdoc), timeChangeCount, cancellationReason/Date |
| **Booking** | rideId→Ride, passengerId→User, groupId, seatsCount, status (Pending/Confirmed/Cancelled/Completed), pickupLocation, price, requestedStop/stopStatus/stopDecisionDate, luggageDeclaration, cancellationReason/Date |
| **RideRequest** | passengerId→User (owner), groupPassengerIds[], leftMembers{} (Map: userId→leaveCount), departureLocation/destination, stops[], travelDateTime, passengerCount, maxPrice, status (Open/Accepted/Expired/Cancelled), acceptedRideId→Ride |
| **Message** | senderId→User, receiverId→User (null for group), groupRideId→Ride (channel identifier), rideId→Ride (context), content, readStatus, action (Mixed, e.g. stop_request) |
| **Notification** | userId→User, title, content, type (Booking/Reminder/Cancellation/Alert/System), readStatus |
| **Review** | authorId→User, subjectId→User, rideId→Ride, rating (1–5), content. Unique constraint: one review per author+subject+ride |

### Auth System (authController.js, tokens.js)
- **4 JWT token types**, each with its own secret:
  - Access (15min) — API auth, payload: `{userId, role}`
  - Refresh (7d) — stored on User doc, payload: `{userId}`
  - Verification (24h) — email verification link, payload: `{userId, email, purpose:'email-verification'}`
  - Reset (1h) — password reset link, payload: `{userId, email, purpose:'password-reset'}`
- **3-step signup**: send-verification → poll check-verification → register (complete profile)
- **Password reset**: Backend-rendered HTML page at `/api/users/reset-password-page?token=...` with CSP nonce for inline script (to work with Helmet). Uses `addEventListener` + `fetch` for form submission.
- **Email verification**: Backend-rendered HTML page at `/api/users/verify-email?token=...`
- **Middleware**: `authenticate` (JWT verify + user lookup + active check) · `authorize(...roles)` (role-based)

### OCR Document Verification (utils/ocr.js)
Tesseract.js v5 with `fra+eng+ara` languages. Processes three Moroccan document types via label-finding + pattern matching:

| Document | Extracted Fields | Validation |
|----------|------------------|------------|
| **CashWallet** (AUI student card) | holderName, studentId, isAuiCard | 3-strategy name extraction (above STUDENT line, ALL-CAPS lines, mixed-case), AUI detection via Arabic root `جامع` + English patterns, Unicode directional mark stripping |
| **Driver License** (Permis de Conduire) | holderName (first+last), licenseNumber, cni | Label-finding + ALL-CAPS word detection (`[A-Z]{3,}`), keyword blacklist filtering, searches below label line first with 4+ char fallback |
| **Registration Card** (Carte Grise) | licensePlate, ownerName, expiryDate, isExpired | Multiple plate regex patterns, `Propriétaire` label extraction, expiry date parsing + check |

- **Name matching**: Levenshtein distance with 30% tolerance (`namesMatch()`)
- **Wrong document detection**: `detectDocumentType()` based on keyword patterns, returns early with `detectedTypeLabel`
- **Missing field validation**: All endpoints reject with 400 + helpful re-upload message if essential fields can't be extracted
- **Pre-auth OCR preview**: `POST /api/users/ocr-preview` — public endpoint (no JWT), accepts `docType` param (`cashwallet` | `license` | `regcard`), runs OCR + validates, cleans up uploaded file after. Used during signup for real-time verification before registration.

### API Endpoints (6 route files, ~60+ endpoints)

**Auth** (`/api/users`): send-verification, check-verification, register, verify-email, resend-verification, login, logout, recover-password, reset-password-page (GET, renders HTML), reset-password, refresh-token, ocr-preview (pre-auth, supports cashwallet/license/regcard), getMe, searchUsers, sortUsers, getUserProfile, updateProfile (with file upload), updatePreferences, deactivateAccount, uploadCashWallet, uploadDriverLicense, suspendAccount (Admin), issueWarning (Admin)

**Vehicles** (`/api/vehicles`): CRUD (create with registration card image, modify, delete, list, details, select)

**Rides** (`/api/rides`): postRideOffer, modifyRide (max 10 time changes, ±24h window, price immutable), cancelRide (2h minimum before departure, notifies all passengers), completeRide (marks bookings complete, increments counters, sends review reminders), getAvailableRides (filtered/paginated/sorted), getRideDetails, getMyRides

**Ride Requests** (`/api/rides/requests`): postRideRequest (solo + group with auto-include owner), modifyRideRequest (re-add limited to 3 leaves), deleteRideRequest, cancelGroupRideRequest, acceptRideRequest (auto-creates Ride + Bookings), dismissRideRequest, leaveRideRequest (ownership transfer logic), transferGroupOwner, getRideRequests (excludes dismissed), getMyRideRequests

**Bookings** (`/api/rides/.../bookings`): bookRide (single), bookGroupRide (batch), declareLuggage, requestAdditionalStop (creates stop_request action message), respondToStopRequest (accept adds to ride.stops), getStopRequests, cancelBooking, getCurrentBookings, getBookingHistory, getPassengerList

**Reviews** (`/api/reviews`): writeReview (validates both parties participated in completed ride), modifyReview, deleteReview, removeInappropriateReview (Admin), getUserReviews, getUserRatings, getReviewSummary (keyword analysis, requires 10+ reviews)

**Notifications** (`/api/notifications`): getNotifications (paginated), getUnreadCount, markAsRead, markAllAsRead

**Messages** (`/api/messages`): sendMessage, getConversations (aggregation pipeline), getMessageHistory, searchMessages, deleteConversation, getChannels (group ride channels), getChannelMessages, sendChannelMessage

### Real-time (socket/index.js)
JWT-authenticated Socket.IO with rooms: `user:{userId}` (auto-join), `ride:{rideId}` (location tracking), `channel:{rideId}` (group chat). Events: location-update → driver-location broadcast, send-message → new-message, send-channel-message → new-channel-message, typing indicators.

### Scheduled Jobs (scheduledJobs.js)
- Every 6h: delete unverified users older than 24h
- Every 30min: send departure reminders for rides within 2h (deduped)

### Error Handling (errorHandler.js)
Global handler: Mongoose ValidationError→400, Duplicate key→409, CastError→400, JWT errors→401, Multer size→400, default→500

---

## Mobile Frontend

### Stack
React Native 0.79 · Expo SDK 54 · React Navigation 6 (native-stack + bottom-tabs) · Axios · SecureStore · Plus Jakarta Sans font

### Navigation Architecture (AppNavigator.js)
```
RootStack (native-stack)
├── Splash → Login → SignupEmail → SignupCheckInbox → SignupCompleteProfile
├── Main (TabNavigator, 5 tabs)
│   ├── Home (HomeScreen)
│   ├── Rides (MyRidesScreen)
│   ├── Messages (MessagesScreen)
│   ├── Notifications (NotificationsScreen)
│   └── Profile (UserProfileScreen)
├── RideDetails (params: rideId, openCancel, openStops)
├── BookRide → BookingConfirmation
├── CreateRide
├── PostRideRequest
├── RideRequests
├── UserProfile
└── AccountSettings
```

### Auth & Token Management (AuthContext.js, api.js)
- Context provides: user, login, logout, switchRole, isDriver/isPassenger, loading
- Tokens stored in SecureStore (native) / localStorage (web)
- Axios request interceptor: auto-attaches Bearer token
- Axios response interceptor: on 401 → refresh token → retry request (with queue for concurrent requests)
- Session restore on app launch: reads stored token → calls `getMe()`

### Service Layer (9 files in `mobile/src/services/`)
Thin wrappers around axios: authService (includes `previewCashWalletOCR`, `previewDriverLicenseOCR`, `previewRegCardOCR` for signup OCR), rideService, bookingService, vehicleService, messageService, notificationService, reviewService. Each maps 1:1 to backend endpoints.

### Theme System (theme/index.js)
- **Colors**: Primary green (#1B5E20) with 4 shades, accent amber, neutrals, semantic (error/success/warning)
- **Typography**: Plus Jakarta Sans, 11 size steps (xs 11px → 6xl 32px), 4 weights
- **Spacing**: 7 steps (xs 4px → 3xl 48px)
- **Radius**: sm(8) md(12) lg(16) xl(20) full(9999)
- **Shadows**: sm/md/lg/card with platform elevation

### Key Screens

| Screen | Role | Features |
|--------|------|----------|
| **HomeScreen** | Both | Map with city pins (Fez/Meknes/Casa/Rabat), ride list, filter modal (destination/date/gender/smoking), ride request modal (with group mode + user search + stops) |
| **MyRidesScreen** | Both | Tab: upcoming/past. PassengerRideCard (details/cancel/rate). DriverRideCard (details/cancel→CancelRideModal). RideRequestCard (edit/delete/leave with group handling) |
| **RideDetailsScreen** | Both | Full ride info + driver profile modal + manage passengers modal + manage ride modal (edit seats/gender/time/stops) + cancel ride modal (reason + 2h check) |
| **CreateRideScreen** | Driver | Route inputs with stop chips, DateTimePicker, seats stepper, price input, vehicle selector, preference toggles (women-only/smoking/driving style) |
| **BookRideScreen** | Passenger | Ride summary, stop selection (from ride stops or custom → requestAdditionalStop), luggage picker, price breakdown, confirm |
| **PostRideRequestScreen** | Passenger | Route + stops, group mode toggle (user search + add members), max budget, notes, confirmation modal |
| **RideRequestsScreen** | Driver | Open requests list, accept (auto-creates ride+bookings) or dismiss |
| **MessagesScreen** | Both | Merged 1-on-1 conversations + group channels, ChatView (message bubbles, send), ChannelChatView (group), search filter |
| **NotificationsScreen** | Both | Grouped by type, filter pills, relative timestamps, unread indicators, mark-all-read |
| **UserProfileScreen** | Both | Avatar + stats (rating/rides/cancels), preferences, reviews (received/given tabs), logout |
| **AccountSettingsScreen** | Both | Edit profile, travel preferences, vehicle management (driver), document verification (driver: re-upload license/reg card for expiry), change password modal, deactivate account modal |

### Reusable Components
- **Button**: 3 variants (primary/outline/ghost), 3 sizes, loading state
- **Input**: Icon support, error/verified/locked states, password toggle
- **StepIndicator**: Dot progress for signup flow (dynamic: 3 steps for passengers, 5 for drivers)
- **ImagePickerModal**: Camera/gallery bottom sheet with card aspect ratio crop (86:54)
- **CancelBookingModal**: Route viz, reason input, consequences list, confirmation alert
- **DateTimePickerModal**: Calendar date picker + iOS-style wheel time picker
- **RequestConfirmationModal**: Success checkmark + request details summary

### Multi-Step Signup Flow (SignupCompleteProfileScreen.js)
After email verification, users complete a wizard-style registration:

| Step | Content | Required For |
|------|---------|-------------|
| **1** | Personal info: first/last name, password, phone, gender | All |
| **2** | CashWallet upload → OCR auto-fills AUI student ID, name matching | All |
| **3** | Role selection: Passenger or Driver | All |
| **4** | Driver license upload → OCR auto-fills CNI + license number | Driver only |
| **5** | Vehicle registration card upload → OCR auto-fills license plate | Driver only |

- Passengers submit at Step 3, drivers at Step 5
- Steps 4 & 5 include "Continue as Passenger instead" fallback link (navigates back to Step 3 with role reset)
- Failed OCR verification allows re-upload on all document steps
- All documents verified via pre-auth `ocr-preview` endpoint (no JWT required during signup)

---

## Web Dashboard (`web/`)
React 18 with built static files in `build/`. Currently uses **mock data** in AuthContext (hardcoded user). Not wired to the backend API. Has route structure for admin, auth, home, messages, notifications, rides, and settings pages.

---

## Environment & Deployment

| Variable | Value |
|----------|-------|
| `PORT` | 5000 (HTTPS) / 5001 (HTTP fallback) |
| `API_BASE_URL` | `https://10.121.24.103:5000` |
| `CLIENT_WEB_URL` | `http://localhost:3000` |
| `MONGODB_URI` | MongoDB Atlas cluster |
| Mobile `BASE_URL` | `http://10.121.24.103:5001` (HTTP for Expo Go) |
| SSL certs | `backend/certs/` (self-signed, 365 days, SAN: localhost + 10.121.24.103) |