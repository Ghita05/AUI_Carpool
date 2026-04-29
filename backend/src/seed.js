// User, Ride and review seeds
// Safe to re-run: uses upsert on fixed IDs. Password for every user: Demo@1234

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User     = require('./models/User');
const Vehicle  = require('./models/Vehicle');
const Ride     = require('./models/Ride');
const Review   = require('./models/Review');
const Message  = require('./models/Message');
const Report   = require('./models/Report');

// Fixed ObjectIds so the script is idempotent
const ID = {
  // Existing users
  driverTest:    '69ee12b6e2f9541fb57baccc',
  passengerTest: '69ee12b6e2f9541fb57baccf',
  ahlam:         '69daa25b689fd88c094da9eb',
  hajar:         '69d670a701b2ba57f11c252d',
  // New users
  youssef:       '60a0000000000000000000a1',
  fatima:        '60a0000000000000000000a2',
  omar:          '60a0000000000000000000a3',
  salma:         '60a0000000000000000000a4',
  karim:         '60a0000000000000000000a5',
  // Vehicles
  vDriverTest:   '60a0000000000000000000b1',
  vAhlam:        '60a0000000000000000000b2',
  vYoussef:      '60a0000000000000000000b3',
  vFatima:       '60a0000000000000000000b4',
  // Completed rides (past)
  r1:  '60a0000000000000000000c1',
  r2:  '60a0000000000000000000c2',
  r3:  '60a0000000000000000000c3',
  r4:  '60a0000000000000000000c4',
  r5:  '60a0000000000000000000c5',
  r6:  '60a0000000000000000000c6',
  r7:  '60a0000000000000000000c7',
  r8:  '60a0000000000000000000c8',
  // Extra completed rides for Tier 3 recommendations + AI summary threshold
  r14: '60a000000000000000000c14',
  r15: '60a000000000000000000c15',
  // Monthly historical rides (for recommender frequency/affinity)
  r16: '60a000000000000000000c16',
  r17: '60a000000000000000000c17',
  r18: '60a000000000000000000c18',
  r19: '60a000000000000000000c19',
  r20: '60a000000000000000000c20',
  r21: '60a000000000000000000c21',
  r22: '60a000000000000000000c22',
  r23: '60a000000000000000000c23',
  r24: '60a000000000000000000c24',
  r25: '60a000000000000000000c25',
  // Open future rides (for the live feed + recommendations)
  r9:  '60a0000000000000000000c9',
  r10: '60a000000000000000000c10',
  r11: '60a000000000000000000c11',
  r12: '60a000000000000000000c12',
  r13: '60a000000000000000000c13',
};

// Converts a plain string ID to ObjectId
const oid = (id) => new mongoose.Types.ObjectId(id);

// Days offset from today
const daysAgo    = (n) => new Date(Date.now() - n * 86_400_000);
const daysAgoAt  = (n, hour) => { const d = new Date(Date.now() - n * 86_400_000); d.setHours(hour, 0, 0, 0); return d; };
const daysFrom   = (n) => new Date(Date.now() + n * 86_400_000);

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const password = await bcrypt.hash('Demo@1234', 12);

  // ─────────────────────────────────────────────
  // 1. Users
  // ─────────────────────────────────────────────

  // Update existing users' passwords to Demo@1234
  for (const id of [ID.driverTest, ID.passengerTest, ID.ahlam, ID.hajar]) {
    await User.updateOne({ _id: oid(id) }, { $set: { password } });
  }

  const newUsers = [
    {
      _id: oid(ID.youssef),
      firstName: 'Youssef', lastName: 'El Amrani',
      email: 'y.amrani@aui.ma', password,
      gender: 'Male', phoneNumber: '0661234501', auiId: '119201',
      role: 'Driver', verificationStatus: true, accountStatus: 'Active',
      smokingPreference: 'Non-smoker', drivingStyle: 'Moderate',
      averageRating: 4.5, totalCompletedRides: 4, cancellationCount: 0,
      driverLicenseVerified: true, cashWalletVerified: true,
    },
    {
      _id: oid(ID.fatima),
      firstName: 'Fatima Zahra', lastName: 'Benali',
      email: 'fz.benali@aui.ma', password,
      gender: 'Female', phoneNumber: '0661234502', auiId: '118875',
      role: 'Driver', verificationStatus: true, accountStatus: 'Active',
      smokingPreference: 'Non-smoker', drivingStyle: 'Calm',
      averageRating: 4.8, totalCompletedRides: 5, cancellationCount: 0,
      driverLicenseVerified: true, cashWalletVerified: true,
    },
    {
      _id: oid(ID.omar),
      firstName: 'Omar', lastName: 'Khalil',
      email: 'o.khalil@aui.ma', password,
      gender: 'Male', phoneNumber: '0661234503', auiId: '117340',
      role: 'Passenger', verificationStatus: true, accountStatus: 'Active',
      smokingPreference: 'No preference', drivingStyle: '',
      averageRating: 4.0, totalCompletedRides: 3, cancellationCount: 1,
      cashWalletVerified: true,
    },
    {
      _id: oid(ID.salma),
      firstName: 'Salma', lastName: 'Ait Brahim',
      email: 's.aitbrahim@aui.ma', password,
      gender: 'Female', phoneNumber: '0661234504', auiId: '120088',
      role: 'Passenger', verificationStatus: true, accountStatus: 'Active',
      smokingPreference: 'Non-smoker', drivingStyle: '',
      averageRating: 4.7, totalCompletedRides: 5, cancellationCount: 0,
      cashWalletVerified: true,
    },
    {
      _id: oid(ID.karim),
      firstName: 'Karim', lastName: 'Bensouda',
      email: 'k.bensouda@aui.ma', password,
      gender: 'Male', phoneNumber: '0661234505', auiId: '116920',
      role: 'Passenger', verificationStatus: true, accountStatus: 'Active',
      smokingPreference: 'Smoker', drivingStyle: '',
      averageRating: 3.5, totalCompletedRides: 2, cancellationCount: 3,
      cashWalletVerified: true,
    },
  ];

  for (const u of newUsers) {
    await User.findOneAndUpdate({ _id: u._id }, u, { upsert: true });
  }
  console.log('Users seeded');

  // ─────────────────────────────────────────────
  // 2. Vehicles (all verified)
  // ─────────────────────────────────────────────

  const vehicles = [
    {
      _id: oid(ID.vDriverTest),
      ownerId: oid(ID.driverTest),
      brand: 'Dacia', model: 'Logan', color: 'White',
      licensePlate: 'A-12345-B', year: 2020,
      sizeCategory: 'Medium', luggageCapacity: 2, totalSeats: 4,
      registrationCardVerified: true,
    },
    {
      _id: oid(ID.vAhlam),
      ownerId: oid(ID.ahlam),
      brand: 'Renault', model: 'Clio', color: 'Red',
      licensePlate: 'B-67891-C', year: 2019,
      sizeCategory: 'Small', luggageCapacity: 1, totalSeats: 3,
      registrationCardVerified: true,
    },
    {
      _id: oid(ID.vYoussef),
      ownerId: oid(ID.youssef),
      brand: 'Toyota', model: 'Corolla', color: 'Silver',
      licensePlate: 'C-55432-D', year: 2021,
      sizeCategory: 'Medium', luggageCapacity: 2, totalSeats: 4,
      registrationCardVerified: true,
    },
    {
      _id: oid(ID.vFatima),
      ownerId: oid(ID.fatima),
      brand: 'Hyundai', model: 'i20', color: 'Blue',
      licensePlate: 'D-11223-E', year: 2022,
      sizeCategory: 'Small', luggageCapacity: 1, totalSeats: 3,
      registrationCardVerified: true,
    },
  ];

  for (const v of vehicles) {
    await Vehicle.findOneAndUpdate({ _id: v._id }, v, { upsert: true });
  }
  console.log('Vehicles seeded');

  // ─────────────────────────────────────────────
  // 3. Completed rides (past)
  // ─────────────────────────────────────────────

  const completedRides = [
    // r1: driverTest  Ifrane → Fez — passengers: passengerTest, salma
    {
      _id: oid(ID.r1),
      type: 'Offer', state: 'Completed',
      driverId: oid(ID.driverTest), vehicleId: oid(ID.vDriverTest),
      departureLocation: 'AUI Campus, Ifrane', destination: 'Gare Routière, Fez',
      departureDateTime: daysAgo(10), pricePerSeat: 30,
      totalSeats: 4, availableSeats: 2, genderPreference: 'All',
      notes: 'Departure from AUI main gate',
      reviewsPrompted: true,
      bookings: [
        {
          passengerId: oid(ID.passengerTest), status: 'Completed',
          pickupLocation: 'AUI Main Gate', price: 30,
          attendanceStatus: 'Present', luggageDeclaration: 'Small',
        },
        {
          passengerId: oid(ID.salma), status: 'Completed',
          pickupLocation: 'AUI Main Gate', price: 30,
          attendanceStatus: 'Present', luggageDeclaration: 'None',
        },
      ],
    },
    // r2: ahlam  Fez → AUI — passengers: hajar, omar
    {
      _id: oid(ID.r2),
      type: 'Offer', state: 'Completed',
      driverId: oid(ID.ahlam), vehicleId: oid(ID.vAhlam),
      departureLocation: 'Gare Routière, Fez', destination: 'AUI Campus, Ifrane',
      departureDateTime: daysAgo(8), pricePerSeat: 25,
      totalSeats: 3, availableSeats: 1, genderPreference: 'All',
      notes: '',
      reviewsPrompted: true,
      bookings: [
        {
          passengerId: oid(ID.hajar), status: 'Completed',
          pickupLocation: 'Gare Routière, Fez', price: 25,
          attendanceStatus: 'Present', luggageDeclaration: 'None',
        },
        {
          passengerId: oid(ID.omar), status: 'Completed',
          pickupLocation: 'Gare Routière, Fez', price: 25,
          attendanceStatus: 'Present', luggageDeclaration: 'None',
        },
      ],
    },
    // r3: youssef  Ifrane → Meknès — passengers: karim, omar
    {
      _id: oid(ID.r3),
      type: 'Offer', state: 'Completed',
      driverId: oid(ID.youssef), vehicleId: oid(ID.vYoussef),
      departureLocation: 'AUI Campus, Ifrane', destination: 'Meknès Centre',
      departureDateTime: daysAgo(6), pricePerSeat: 35,
      totalSeats: 4, availableSeats: 2, genderPreference: 'All',
      notes: 'Moderate pace, stop at Azrou if needed',
      stops: ['Azrou'],
      reviewsPrompted: true,
      bookings: [
        {
          passengerId: oid(ID.karim), status: 'Completed',
          pickupLocation: 'AUI Main Gate', price: 35,
          attendanceStatus: 'Present', luggageDeclaration: 'None',
        },
        {
          passengerId: oid(ID.omar), status: 'Completed',
          pickupLocation: 'AUI Main Gate', price: 35,
          attendanceStatus: 'Present', luggageDeclaration: 'Small',
        },
      ],
    },
    // r4: fatima  Ifrane → Fez (Women-Only) — passengers: salma, hajar
    {
      _id: oid(ID.r4),
      type: 'Offer', state: 'Completed',
      driverId: oid(ID.fatima), vehicleId: oid(ID.vFatima),
      departureLocation: 'AUI Campus, Ifrane', destination: 'Ville Nouvelle, Fez',
      departureDateTime: daysAgo(5), pricePerSeat: 28,
      totalSeats: 3, availableSeats: 1, genderPreference: 'Women-Only',
      notes: 'Women-only ride',
      reviewsPrompted: true,
      bookings: [
        {
          passengerId: oid(ID.salma), status: 'Completed',
          pickupLocation: 'AUI Main Gate', price: 28,
          attendanceStatus: 'Present', luggageDeclaration: 'None',
        },
        {
          passengerId: oid(ID.hajar), status: 'Completed',
          pickupLocation: 'AUI Main Gate', price: 28,
          attendanceStatus: 'Present', luggageDeclaration: 'Small',
        },
      ],
    },
    // r5: driverTest  Ifrane → Rabat — passengers: karim, salma
    {
      _id: oid(ID.r5),
      type: 'Offer', state: 'Completed',
      driverId: oid(ID.driverTest), vehicleId: oid(ID.vDriverTest),
      departureLocation: 'AUI Campus, Ifrane', destination: 'Rabat Agdal',
      departureDateTime: daysAgo(4), pricePerSeat: 80,
      totalSeats: 4, availableSeats: 2, genderPreference: 'All',
      notes: 'Long ride to Rabat',
      reviewsPrompted: true,
      bookings: [
        {
          passengerId: oid(ID.karim), status: 'Completed',
          pickupLocation: 'AUI Main Gate', price: 80,
          attendanceStatus: 'Present', luggageDeclaration: 'Medium',
        },
        {
          passengerId: oid(ID.salma), status: 'Completed',
          pickupLocation: 'AUI Main Gate', price: 80,
          attendanceStatus: 'Present', luggageDeclaration: 'None',
        },
      ],
    },
    // r6: youssef  Meknès → AUI — passengers: passengerTest
    {
      _id: oid(ID.r6),
      type: 'Offer', state: 'Completed',
      driverId: oid(ID.youssef), vehicleId: oid(ID.vYoussef),
      departureLocation: 'Meknès Centre', destination: 'AUI Campus, Ifrane',
      departureDateTime: daysAgo(3), pricePerSeat: 35,
      totalSeats: 4, availableSeats: 3, genderPreference: 'All',
      notes: '',
      reviewsPrompted: true,
      bookings: [
        {
          passengerId: oid(ID.passengerTest), status: 'Completed',
          pickupLocation: 'Meknès Bus Station', price: 35,
          attendanceStatus: 'Present', luggageDeclaration: 'None',
        },
      ],
    },
    // r7: ahlam  Fez → AUI — passengers: salma, omar (one absent)
    {
      _id: oid(ID.r7),
      type: 'Offer', state: 'Completed',
      driverId: oid(ID.ahlam), vehicleId: oid(ID.vAhlam),
      departureLocation: 'Ville Nouvelle, Fez', destination: 'AUI Campus, Ifrane',
      departureDateTime: daysAgo(2), pricePerSeat: 25,
      totalSeats: 3, availableSeats: 1, genderPreference: 'All',
      notes: '',
      reviewsPrompted: true,
      bookings: [
        {
          passengerId: oid(ID.salma), status: 'Completed',
          pickupLocation: 'Ville Nouvelle Fez', price: 25,
          attendanceStatus: 'Present', luggageDeclaration: 'None',
        },
        {
          passengerId: oid(ID.omar), status: 'Cancelled',
          pickupLocation: 'Ville Nouvelle Fez', price: 25,
          attendanceStatus: 'Absent', luggageDeclaration: 'None',
          cancellationReason: 'Changed plans',
        },
      ],
    },
    // r8: fatima  Ifrane → Fez — passengers: hajar, karim
    {
      _id: oid(ID.r8),
      type: 'Offer', state: 'Completed',
      driverId: oid(ID.fatima), vehicleId: oid(ID.vFatima),
      departureLocation: 'AUI Campus, Ifrane', destination: 'Gare Routière, Fez',
      departureDateTime: daysAgo(1), pricePerSeat: 28,
      totalSeats: 3, availableSeats: 1, genderPreference: 'All',
      notes: 'Calm driver, comfortable ride',
      reviewsPrompted: true,
      bookings: [
        {
          passengerId: oid(ID.hajar), status: 'Completed',
          pickupLocation: 'AUI Main Gate', price: 28,
          attendanceStatus: 'Present', luggageDeclaration: 'None',
        },
        {
          passengerId: oid(ID.karim), status: 'Completed',
          pickupLocation: 'AUI Main Gate', price: 28,
          attendanceStatus: 'Present', luggageDeclaration: 'Small',
        },
      ],
    },
    // r14: driverTest  Ifrane → Azrou — passengers: hajar, salma, omar
    // Pushes driverTest to 7 reviews (AI summary), salma to 5 rides (Tier 3)
    {
      _id: oid(ID.r14),
      type: 'Offer', state: 'Completed',
      driverId: oid(ID.driverTest), vehicleId: oid(ID.vDriverTest),
      departureLocation: 'AUI Campus, Ifrane', destination: 'Azrou Centre',
      departureDateTime: daysAgo(6), pricePerSeat: 15,
      totalSeats: 4, availableSeats: 1, genderPreference: 'All',
      notes: 'Quick trip to Azrou',
      reviewsPrompted: true,
      bookings: [
        {
          passengerId: oid(ID.hajar), status: 'Completed',
          pickupLocation: 'AUI Main Gate', price: 15,
          attendanceStatus: 'Present', luggageDeclaration: 'None',
        },
        {
          passengerId: oid(ID.salma), status: 'Completed',
          pickupLocation: 'AUI Main Gate', price: 15,
          attendanceStatus: 'Present', luggageDeclaration: 'None',
        },
        {
          passengerId: oid(ID.omar), status: 'Completed',
          pickupLocation: 'AUI Main Gate', price: 15,
          attendanceStatus: 'Present', luggageDeclaration: 'None',
        },
      ],
    },
    // r15: fatima  Fez → AUI — passengers: passengerTest, omar
    // Pushes fatima to 6 reviews (AI summary)
    {
      _id: oid(ID.r15),
      type: 'Offer', state: 'Completed',
      driverId: oid(ID.fatima), vehicleId: oid(ID.vFatima),
      departureLocation: 'Ville Nouvelle, Fez', destination: 'AUI Campus, Ifrane',
      departureDateTime: daysAgo(4), pricePerSeat: 28,
      totalSeats: 3, availableSeats: 1, genderPreference: 'All',
      notes: '',
      reviewsPrompted: true,
      bookings: [
        {
          passengerId: oid(ID.passengerTest), status: 'Completed',
          pickupLocation: 'Ville Nouvelle Fez', price: 28,
          attendanceStatus: 'Present', luggageDeclaration: 'None',
        },
        {
          passengerId: oid(ID.omar), status: 'Completed',
          pickupLocation: 'Ville Nouvelle Fez', price: 28,
          attendanceStatus: 'Present', luggageDeclaration: 'None',
        },
      ],
    },

    // ── Monthly history: r16–r25 (for recommender frequency & affinity) ──
    // r16 (~Jan 28): driverTest Ifrane→Fez — passengers: passengerTest, salma
    {
      _id: oid(ID.r16),
      type: 'Offer', state: 'Completed',
      driverId: oid(ID.driverTest), vehicleId: oid(ID.vDriverTest),
      departureLocation: 'AUI Campus, Ifrane', destination: 'Gare Routière, Fez',
      departureDateTime: daysAgoAt(90, 8), pricePerSeat: 30,
      totalSeats: 4, availableSeats: 2, genderPreference: 'All',
      notes: 'Departure from AUI main gate', stops: ['Centre Ville Ifrane'],
      reviewsPrompted: true,
      bookings: [
        { passengerId: oid(ID.passengerTest), status: 'Completed', pickupLocation: 'AUI Main Gate', price: 30, attendanceStatus: 'Present', luggageDeclaration: 'None' },
        { passengerId: oid(ID.salma),         status: 'Completed', pickupLocation: 'AUI Main Gate', price: 30, attendanceStatus: 'Present', luggageDeclaration: 'None' },
      ],
    },
    // r17 (~Feb 7): fatima Ifrane→Fez Women-Only — passengers: salma, hajar
    {
      _id: oid(ID.r17),
      type: 'Offer', state: 'Completed',
      driverId: oid(ID.fatima), vehicleId: oid(ID.vFatima),
      departureLocation: 'AUI Campus, Ifrane', destination: 'Ville Nouvelle, Fez',
      departureDateTime: daysAgoAt(80, 8), pricePerSeat: 28,
      totalSeats: 3, availableSeats: 1, genderPreference: 'Women-Only',
      notes: 'Women-only, calm ride', stops: ['Centre Ville Ifrane'],
      reviewsPrompted: true,
      bookings: [
        { passengerId: oid(ID.salma), status: 'Completed', pickupLocation: 'AUI Main Gate', price: 28, attendanceStatus: 'Present', luggageDeclaration: 'None' },
        { passengerId: oid(ID.hajar), status: 'Completed', pickupLocation: 'AUI Main Gate', price: 28, attendanceStatus: 'Present', luggageDeclaration: 'None' },
      ],
    },
    // r18 (~Feb 17): youssef AUI→Meknès — passengers: omar, karim
    {
      _id: oid(ID.r18),
      type: 'Offer', state: 'Completed',
      driverId: oid(ID.youssef), vehicleId: oid(ID.vYoussef),
      departureLocation: 'AUI Campus, Ifrane', destination: 'Meknès Centre',
      departureDateTime: daysAgoAt(70, 10), pricePerSeat: 35,
      totalSeats: 4, availableSeats: 2, genderPreference: 'All',
      notes: 'Stop at Azrou', stops: ['Azrou'],
      reviewsPrompted: true,
      bookings: [
        { passengerId: oid(ID.omar),  status: 'Completed', pickupLocation: 'AUI Main Gate', price: 35, attendanceStatus: 'Present', luggageDeclaration: 'None' },
        { passengerId: oid(ID.karim), status: 'Completed', pickupLocation: 'AUI Main Gate', price: 35, attendanceStatus: 'Present', luggageDeclaration: 'Small' },
      ],
    },
    // r19 (~Feb 27): ahlam Fez→AUI — passenger: hajar
    {
      _id: oid(ID.r19),
      type: 'Offer', state: 'Completed',
      driverId: oid(ID.ahlam), vehicleId: oid(ID.vAhlam),
      departureLocation: 'Gare Routière, Fez', destination: 'AUI Campus, Ifrane',
      departureDateTime: daysAgoAt(60, 9), pricePerSeat: 25,
      totalSeats: 3, availableSeats: 2, genderPreference: 'All',
      notes: '', stops: ['Bab Bouyoud, Fez'],
      reviewsPrompted: true,
      bookings: [
        { passengerId: oid(ID.hajar), status: 'Completed', pickupLocation: 'Bab Bouyoud, Fez', price: 25, attendanceStatus: 'Present', luggageDeclaration: 'None' },
      ],
    },
    // r20 (~Mar 9): driverTest Ifrane→Fez — passengers: passengerTest, omar
    {
      _id: oid(ID.r20),
      type: 'Offer', state: 'Completed',
      driverId: oid(ID.driverTest), vehicleId: oid(ID.vDriverTest),
      departureLocation: 'AUI Campus, Ifrane', destination: 'Gare Routière, Fez',
      departureDateTime: daysAgoAt(50, 8), pricePerSeat: 30,
      totalSeats: 4, availableSeats: 2, genderPreference: 'All',
      notes: '', stops: ['Centre Ville Ifrane'],
      reviewsPrompted: true,
      bookings: [
        { passengerId: oid(ID.passengerTest), status: 'Completed', pickupLocation: 'AUI Main Gate', price: 30, attendanceStatus: 'Present', luggageDeclaration: 'None' },
        { passengerId: oid(ID.omar),          status: 'Completed', pickupLocation: 'AUI Main Gate', price: 30, attendanceStatus: 'Present', luggageDeclaration: 'None' },
      ],
    },
    // r21 (~Mar 19): fatima Ifrane→Fez Women-Only — passengers: salma, hajar
    {
      _id: oid(ID.r21),
      type: 'Offer', state: 'Completed',
      driverId: oid(ID.fatima), vehicleId: oid(ID.vFatima),
      departureLocation: 'AUI Campus, Ifrane', destination: 'Ville Nouvelle, Fez',
      departureDateTime: daysAgoAt(40, 8), pricePerSeat: 28,
      totalSeats: 3, availableSeats: 1, genderPreference: 'Women-Only',
      notes: '', stops: ['Centre Ville Ifrane'],
      reviewsPrompted: true,
      bookings: [
        { passengerId: oid(ID.salma), status: 'Completed', pickupLocation: 'AUI Main Gate', price: 28, attendanceStatus: 'Present', luggageDeclaration: 'None' },
        { passengerId: oid(ID.hajar), status: 'Completed', pickupLocation: 'AUI Main Gate', price: 28, attendanceStatus: 'Present', luggageDeclaration: 'None' },
      ],
    },
    // r22 (~Mar 29): youssef AUI→Meknès — passenger: omar
    {
      _id: oid(ID.r22),
      type: 'Offer', state: 'Completed',
      driverId: oid(ID.youssef), vehicleId: oid(ID.vYoussef),
      departureLocation: 'AUI Campus, Ifrane', destination: 'Meknès Centre',
      departureDateTime: daysAgoAt(30, 10), pricePerSeat: 35,
      totalSeats: 4, availableSeats: 3, genderPreference: 'All',
      notes: '', stops: ['Azrou'],
      reviewsPrompted: true,
      bookings: [
        { passengerId: oid(ID.omar), status: 'Completed', pickupLocation: 'AUI Main Gate', price: 35, attendanceStatus: 'Present', luggageDeclaration: 'None' },
      ],
    },
    // r23 (~Apr 8): driverTest Ifrane→Fez — passenger: passengerTest
    {
      _id: oid(ID.r23),
      type: 'Offer', state: 'Completed',
      driverId: oid(ID.driverTest), vehicleId: oid(ID.vDriverTest),
      departureLocation: 'AUI Campus, Ifrane', destination: 'Gare Routière, Fez',
      departureDateTime: daysAgoAt(20, 8), pricePerSeat: 30,
      totalSeats: 4, availableSeats: 3, genderPreference: 'All',
      notes: '', stops: ['Centre Ville Ifrane'],
      reviewsPrompted: true,
      bookings: [
        { passengerId: oid(ID.passengerTest), status: 'Completed', pickupLocation: 'AUI Main Gate', price: 30, attendanceStatus: 'Present', luggageDeclaration: 'None' },
      ],
    },
    // r24 (~Apr 13): ahlam Fez→AUI — passengers: hajar, passengerTest
    {
      _id: oid(ID.r24),
      type: 'Offer', state: 'Completed',
      driverId: oid(ID.ahlam), vehicleId: oid(ID.vAhlam),
      departureLocation: 'Gare Routière, Fez', destination: 'AUI Campus, Ifrane',
      departureDateTime: daysAgoAt(15, 9), pricePerSeat: 25,
      totalSeats: 3, availableSeats: 1, genderPreference: 'All',
      notes: '',
      reviewsPrompted: true,
      bookings: [
        { passengerId: oid(ID.hajar),         status: 'Completed', pickupLocation: 'Gare Routière, Fez', price: 25, attendanceStatus: 'Present', luggageDeclaration: 'None' },
        { passengerId: oid(ID.passengerTest), status: 'Completed', pickupLocation: 'Gare Routière, Fez', price: 25, attendanceStatus: 'Present', luggageDeclaration: 'None' },
      ],
    },
    // r25 (~Apr 16): youssef AUI→Meknès — passenger: omar
    {
      _id: oid(ID.r25),
      type: 'Offer', state: 'Completed',
      driverId: oid(ID.youssef), vehicleId: oid(ID.vYoussef),
      departureLocation: 'AUI Campus, Ifrane', destination: 'Meknès Centre',
      departureDateTime: daysAgoAt(12, 10), pricePerSeat: 35,
      totalSeats: 4, availableSeats: 3, genderPreference: 'All',
      notes: '', stops: ['Azrou'],
      reviewsPrompted: true,
      bookings: [
        { passengerId: oid(ID.omar), status: 'Completed', pickupLocation: 'AUI Main Gate', price: 35, attendanceStatus: 'Present', luggageDeclaration: 'None' },
      ],
    },
  ];

  for (const r of completedRides) {
    await Ride.findOneAndUpdate({ _id: r._id }, r, { upsert: true });
  }
  console.log('Completed rides seeded');

  // ─────────────────────────────────────────────
  // 4. Open future rides (live feed + recommendations)
  // Note: route field is null — Google Maps polyline won't render for these.
  //       Create new rides through the app to get full map display.
  // ─────────────────────────────────────────────

  const openRides = [
    {
      _id: oid(ID.r9),
      type: 'Offer', state: 'Open',
      driverId: oid(ID.driverTest), vehicleId: oid(ID.vDriverTest),
      departureLocation: 'AUI Campus, Ifrane', destination: 'Gare Routière, Fez',
      departureDateTime: daysFrom(1), pricePerSeat: 30,
      totalSeats: 4, availableSeats: 4, genderPreference: 'All',
      notes: 'Leaving right after morning classes',
      stops: ['Centre Ville Ifrane'],
      bookings: [],
    },
    {
      _id: oid(ID.r10),
      type: 'Offer', state: 'Open',
      driverId: oid(ID.youssef), vehicleId: oid(ID.vYoussef),
      departureLocation: 'AUI Campus, Ifrane', destination: 'Meknès Centre',
      departureDateTime: daysFrom(2), pricePerSeat: 35,
      totalSeats: 4, availableSeats: 3, genderPreference: 'All',
      notes: 'Stop at Azrou available',
      stops: ['Azrou'],
      bookings: [],
    },
    {
      _id: oid(ID.r11),
      type: 'Offer', state: 'Open',
      driverId: oid(ID.fatima), vehicleId: oid(ID.vFatima),
      departureLocation: 'AUI Campus, Ifrane', destination: 'Ville Nouvelle, Fez',
      departureDateTime: daysFrom(2), pricePerSeat: 28,
      totalSeats: 3, availableSeats: 3, genderPreference: 'Women-Only',
      notes: 'Women-only, calm ride',
      stops: ['Centre Ville Ifrane'],
      bookings: [],
    },
    {
      _id: oid(ID.r12),
      type: 'Offer', state: 'Open',
      driverId: oid(ID.ahlam), vehicleId: oid(ID.vAhlam),
      departureLocation: 'Gare Routière, Fez', destination: 'AUI Campus, Ifrane',
      departureDateTime: daysFrom(3), pricePerSeat: 25,
      totalSeats: 3, availableSeats: 2, genderPreference: 'All',
      notes: '',
      bookings: [],
    },
    {
      _id: oid(ID.r13),
      type: 'Offer', state: 'Open',
      driverId: oid(ID.youssef), vehicleId: oid(ID.vYoussef),
      departureLocation: 'AUI Campus, Ifrane', destination: 'Rabat Agdal',
      departureDateTime: daysFrom(5), pricePerSeat: 80,
      totalSeats: 4, availableSeats: 4, genderPreference: 'All',
      notes: 'Weekend trip to Rabat',
      bookings: [],
    },
  ];

  for (const r of openRides) {
    await Ride.findOneAndUpdate({ _id: r._id }, r, { upsert: true });
  }
  console.log('Open rides seeded');

  // ─────────────────────────────────────────────
  // 5. Reviews
  // ─────────────────────────────────────────────

  const reviews = [
    // r1 — passengers review driverTest; driverTest reviews passengers
    { authorId: ID.passengerTest, subjectId: ID.driverTest, rideId: ID.r1, rating: 5, content: 'Great driver, very punctual and smooth ride.' },
    { authorId: ID.salma,         subjectId: ID.driverTest, rideId: ID.r1, rating: 4, content: 'Good ride, friendly driver.' },
    { authorId: ID.driverTest,    subjectId: ID.passengerTest, rideId: ID.r1, rating: 3, content: 'Was a bit late to the pickup point.' },
    { authorId: ID.driverTest,    subjectId: ID.salma,   rideId: ID.r1, rating: 5, content: 'Very polite and on time.' },

    // r2 — passengers review ahlam; ahlam reviews passengers
    { authorId: ID.hajar, subjectId: ID.ahlam, rideId: ID.r2, rating: 4, content: 'Comfortable ride, music was a bit loud.' },
    { authorId: ID.omar,  subjectId: ID.ahlam, rideId: ID.r2, rating: 5, content: 'Safe driver, arrived on time. Highly recommend.' },
    { authorId: ID.ahlam, subjectId: ID.hajar, rideId: ID.r2, rating: 4, content: 'Good passenger, easy to coordinate with.' },
    { authorId: ID.ahlam, subjectId: ID.omar,  rideId: ID.r2, rating: 5, content: 'Very courteous, no issues at all.' },

    // r3 — passengers review youssef; youssef reviews passengers
    { authorId: ID.karim, subjectId: ID.youssef, rideId: ID.r3, rating: 4, content: 'Good driver, stopped at Azrou as requested.' },
    { authorId: ID.omar,  subjectId: ID.youssef, rideId: ID.r3, rating: 5, content: 'Super smooth ride, very comfortable car.' },
    { authorId: ID.youssef, subjectId: ID.karim, rideId: ID.r3, rating: 3, content: 'Passenger was fine but brought large luggage without declaring.' },
    { authorId: ID.youssef, subjectId: ID.omar,  rideId: ID.r3, rating: 5, content: 'Perfect passenger, would take again.' },

    // r4 — passengers review fatima; fatima reviews passengers
    { authorId: ID.salma, subjectId: ID.fatima, rideId: ID.r4, rating: 5, content: 'Amazing driver! So calm and made the ride very relaxing.' },
    { authorId: ID.hajar, subjectId: ID.fatima, rideId: ID.r4, rating: 5, content: 'Best carpool experience I have had at AUI.' },
    { authorId: ID.fatima, subjectId: ID.salma, rideId: ID.r4, rating: 5, content: 'Great passenger, very respectful.' },
    { authorId: ID.fatima, subjectId: ID.hajar, rideId: ID.r4, rating: 4, content: 'Nice passenger overall.' },

    // r5 — passengers review driverTest
    { authorId: ID.karim, subjectId: ID.driverTest, rideId: ID.r5, rating: 4, content: 'Long ride to Rabat but driver kept it comfortable.' },
    { authorId: ID.salma, subjectId: ID.driverTest, rideId: ID.r5, rating: 5, content: 'Safe long-distance driver. Very good experience.' },
    { authorId: ID.driverTest, subjectId: ID.karim, rideId: ID.r5, rating: 4, content: 'Good passenger for a long trip.' },
    { authorId: ID.driverTest, subjectId: ID.salma, rideId: ID.r5, rating: 5, content: 'Excellent co-traveller.' },

    // r6 — passengerTest reviews youssef
    { authorId: ID.passengerTest, subjectId: ID.youssef, rideId: ID.r6, rating: 5, content: 'Youssef is a reliable and careful driver.' },
    { authorId: ID.youssef, subjectId: ID.passengerTest, rideId: ID.r6, rating: 4, content: 'Decent passenger.' },

    // r7 — salma reviews ahlam (omar cancelled so no review for him)
    { authorId: ID.salma, subjectId: ID.ahlam, rideId: ID.r7, rating: 5, content: 'Always a pleasure riding with Ahlam.' },
    { authorId: ID.ahlam, subjectId: ID.salma, rideId: ID.r7, rating: 5, content: 'Salma is always punctual and easy-going.' },

    // r8 — hajar and karim review fatima
    { authorId: ID.hajar, subjectId: ID.fatima, rideId: ID.r8, rating: 5, content: 'Very calm and professional driver.' },
    { authorId: ID.karim, subjectId: ID.fatima, rideId: ID.r8, rating: 4, content: 'Good ride, comfortable car.' },
    { authorId: ID.fatima, subjectId: ID.hajar, rideId: ID.r8, rating: 3, content: 'Passenger was fine.' },
    { authorId: ID.fatima, subjectId: ID.karim, rideId: ID.r8, rating: 3, content: 'A bit slow to respond to messages beforehand.' },

    // r14 — hajar, salma, omar review driverTest; driverTest reviews them
    // driverTest: 4 → 7 reviews (triggers AI summary)
    // salma: 4 → 5 reviews (triggers AI summary)
    { authorId: ID.hajar,  subjectId: ID.driverTest, rideId: ID.r14, rating: 5, content: 'Very smooth ride to Azrou, felt safe the whole time.' },
    { authorId: ID.salma,  subjectId: ID.driverTest, rideId: ID.r14, rating: 5, content: 'Third time with this driver — always consistent and reliable.' },
    { authorId: ID.omar,   subjectId: ID.driverTest, rideId: ID.r14, rating: 4, content: 'Good driver, comfortable and quiet ride.' },
    { authorId: ID.driverTest, subjectId: ID.hajar,  rideId: ID.r14, rating: 5, content: 'Great passenger, very easy to coordinate with.' },
    { authorId: ID.driverTest, subjectId: ID.salma,  rideId: ID.r14, rating: 5, content: 'Always a pleasure, very punctual.' },
    { authorId: ID.driverTest, subjectId: ID.omar,   rideId: ID.r14, rating: 4, content: 'Good passenger, no issues.' },

    // r15 — passengerTest and omar review fatima; fatima reviews them
    // fatima: 4 → 6 reviews (triggers AI summary)
    { authorId: ID.passengerTest, subjectId: ID.fatima, rideId: ID.r15, rating: 5, content: 'One of the best drivers on the platform, incredibly calm.' },
    { authorId: ID.omar,          subjectId: ID.fatima, rideId: ID.r15, rating: 5, content: 'Super comfortable ride from Fez, would definitely book again.' },
    { authorId: ID.fatima, subjectId: ID.passengerTest, rideId: ID.r15, rating: 4, content: 'Good passenger, respectful and on time.' },
    { authorId: ID.fatima, subjectId: ID.omar,          rideId: ID.r15, rating: 4, content: 'No issues, pleasant ride.' },

    // r16 — passengerTest & salma review driverTest; driverTest reviews passengerTest
    { authorId: ID.passengerTest, subjectId: ID.driverTest, rideId: ID.r16, rating: 5, content: 'Always a reliable driver, punctual and safe.' },
    { authorId: ID.salma,         subjectId: ID.driverTest, rideId: ID.r16, rating: 5, content: 'Love riding with him, always comfortable and on time.' },
    { authorId: ID.driverTest, subjectId: ID.passengerTest, rideId: ID.r16, rating: 5, content: 'Great regular passenger, always ready on time.' },

    // r17 — salma & hajar review fatima
    { authorId: ID.salma, subjectId: ID.fatima, rideId: ID.r17, rating: 5, content: 'Fatima is by far the best driver on campus, truly outstanding.' },
    { authorId: ID.hajar, subjectId: ID.fatima, rideId: ID.r17, rating: 5, content: 'Incredibly smooth and calm ride as always with Fatima.' },

    // r18 — omar & karim review youssef
    { authorId: ID.omar,  subjectId: ID.youssef, rideId: ID.r18, rating: 5, content: 'Youssef never misses the Azrou stop. A very dependable driver.' },
    { authorId: ID.karim, subjectId: ID.youssef, rideId: ID.r18, rating: 4, content: 'Good ride, comfortable Toyota and fair price.' },

    // r19 — hajar reviews ahlam
    { authorId: ID.hajar, subjectId: ID.ahlam, rideId: ID.r19, rating: 5, content: 'Ahlam is always consistent and relaxed behind the wheel.' },

    // r20 — passengerTest & omar review driverTest
    { authorId: ID.passengerTest, subjectId: ID.driverTest, rideId: ID.r20, rating: 5, content: 'Fifth time with this driver — still excellent every single time.' },
    { authorId: ID.omar,          subjectId: ID.driverTest, rideId: ID.r20, rating: 4, content: 'Good, safe and calm driver.' },

    // r21 — salma & hajar review fatima
    { authorId: ID.salma, subjectId: ID.fatima, rideId: ID.r21, rating: 5, content: 'Fatima always makes the ride feel safe and truly enjoyable.' },
    { authorId: ID.hajar, subjectId: ID.fatima, rideId: ID.r21, rating: 5, content: 'Another flawless ride with Fatima Zahra, highly reliable.' },

    // r22 — omar reviews youssef
    { authorId: ID.omar, subjectId: ID.youssef, rideId: ID.r22, rating: 5, content: 'Youssef is my go-to driver for Meknès trips, never disappoints.' },

    // r23 — passengerTest reviews driverTest
    { authorId: ID.passengerTest, subjectId: ID.driverTest, rideId: ID.r23, rating: 5, content: 'Consistent, safe, and punctual every single time — a model driver.' },

    // r24 — hajar & passengerTest review ahlam
    { authorId: ID.hajar,         subjectId: ID.ahlam, rideId: ID.r24, rating: 4, content: 'Always a smooth ride back to campus with Ahlam.' },
    { authorId: ID.passengerTest, subjectId: ID.ahlam, rideId: ID.r24, rating: 4, content: 'Comfortable ride, good coordination before departure.' },

    // r25 — omar reviews youssef
    { authorId: ID.omar, subjectId: ID.youssef, rideId: ID.r25, rating: 5, content: 'Reliable as always — comfortable car and perfect timing for Meknès.' },
  ];

  for (const rv of reviews) {
    await Review.findOneAndUpdate(
      { authorId: oid(rv.authorId), subjectId: oid(rv.subjectId), rideId: oid(rv.rideId) },
      { ...rv, authorId: oid(rv.authorId), subjectId: oid(rv.subjectId), rideId: oid(rv.rideId), date: new Date() },
      { upsert: true }
    );
  }

  // Recompute averageRating + generate AI summaries for users with >= 5 reviews
  const MIN_REVIEWS_FOR_SUMMARY = 5;

  async function generateGeminiSummary(userName, role, avgRating, reviews) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) { console.warn('[Gemini] GEMINI_API_KEY not set — skipping AI summary.'); return null; }
    const reviewTexts = reviews
      .filter(r => r.content && r.content.trim().length > 0)
      .map((r, i) => `${i + 1}. "${r.content.trim()}"`)
      .join('\n');
    if (!reviewTexts) return null;
    const prompt = `Based on these ${reviews.length} reviews of ${userName} (a ${role} on a university carpooling platform, avg ${avgRating}/5):\n\n${reviewTexts}\n\nWrite 2-3 flowing sentences that capture the overall impression — what kind of ${role} they are, what stands out, and what to expect. Write as a neutral observer who read all the reviews. Third person. No rating numbers. No "reviewers say" or "according to reviews". Complete grammatically correct sentences only. Max 70 words.`;
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 300, temperature: 0.4 },
          }),
        }
      );
      if (!res.ok) { const t = await res.text(); console.warn(`[Gemini] ${res.status}: ${t}`); return null; }
      const data = await res.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
    } catch (e) {
      console.warn('[Gemini] Request failed:', e.message);
      return null;
    }
  }

  const allUserIds = [ID.driverTest, ID.passengerTest, ID.ahlam, ID.hajar, ID.youssef, ID.fatima, ID.omar, ID.salma, ID.karim];
  for (const uid of allUserIds) {
    const result = await Review.aggregate([
      { $match: { subjectId: oid(uid) } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    if (result.length) {
      const avg = Math.round(result[0].avg * 10) / 10;
      await User.updateOne({ _id: oid(uid) }, { averageRating: avg });

      if (result[0].count >= MIN_REVIEWS_FOR_SUMMARY) {
        const userDoc  = await User.findById(oid(uid)).select('firstName lastName role');
        const reviews  = await Review.find({ subjectId: oid(uid) }).select('content rating');
        const fullName = `${userDoc.firstName} ${userDoc.lastName}`.trim();
        // Rate-limit: free tier = 20 req/min → wait 3.5s between calls
        await new Promise(r => setTimeout(r, 3500));
        const summary  = await generateGeminiSummary(fullName, userDoc.role, avg, reviews);
        if (summary) {
          await User.updateOne({ _id: oid(uid) }, { reviewSummary: summary });
          console.log(`  AI summary written for ${fullName}`);
        }
      }
    }
  }
  console.log('Reviews seeded and ratings updated');

  // ─────────────────────────────────────────────
  // 6. Messages
  // ─────────────────────────────────────────────

  const msgDate = (minutesAgo) => new Date(Date.now() - minutesAgo * 60_000);

  const messages = [
    // Conversation: passengerTest ↔ driverTest about r9 (upcoming ride)
    { senderId: oid(ID.passengerTest), receiverId: oid(ID.driverTest), rideId: oid(ID.r9),  content: 'Hi! Can I book a seat for tomorrow?', date: msgDate(90), readStatus: true },
    { senderId: oid(ID.driverTest),    receiverId: oid(ID.passengerTest), rideId: oid(ID.r9), content: 'Of course, you are welcome! Departure at 9am from AUI main gate.', date: msgDate(85), readStatus: true },
    { senderId: oid(ID.passengerTest), receiverId: oid(ID.driverTest), rideId: oid(ID.r9),   content: 'Perfect, see you there!', date: msgDate(80), readStatus: true },

    // Conversation: salma ↔ youssef about r10
    { senderId: oid(ID.salma),   receiverId: oid(ID.youssef), rideId: oid(ID.r10), content: 'Salam, is there a stop in Azrou?', date: msgDate(60), readStatus: true },
    { senderId: oid(ID.youssef), receiverId: oid(ID.salma),   rideId: oid(ID.r10), content: 'Yes inshallah, around 10 minutes stop.', date: msgDate(55), readStatus: false },

    // Conversation: omar ↔ ahlam about r12
    { senderId: oid(ID.omar),  receiverId: oid(ID.ahlam), rideId: oid(ID.r12), content: 'Marhba, can I book a seat?', date: msgDate(45), readStatus: true },
    { senderId: oid(ID.ahlam), receiverId: oid(ID.omar),  rideId: oid(ID.r12), content: 'Yes, 2 seats still available. Let me know!', date: msgDate(40), readStatus: true },
    { senderId: oid(ID.omar),  receiverId: oid(ID.ahlam), rideId: oid(ID.r12), content: 'Just booked. Thank you!', date: msgDate(35), readStatus: false },

    // Conversation: karim ↔ fatima about r11
    { senderId: oid(ID.karim),  receiverId: oid(ID.fatima), rideId: oid(ID.r11), content: 'Is this women-only? I see it says women-only.', date: msgDate(20), readStatus: true },
    { senderId: oid(ID.fatima), receiverId: oid(ID.karim),  rideId: oid(ID.r11), content: 'Yes, this ride is for women only. Sorry!', date: msgDate(15), readStatus: true },
  ];

  await Message.insertMany(messages, { ordered: false }).catch(() => {});
  console.log('Messages seeded');

  // ─────────────────────────────────────────────
  // 7. Reports
  // ─────────────────────────────────────────────

  const reports = [
    {
      reporterId: oid(ID.hajar),
      subjectId:  oid(ID.driverTest),
      context: 'Ride', rideId: oid(ID.r1),
      category: 'Dangerous Driving',
      description: 'Driver was speeding on the mountain road between Azrou and Ifrane. Very uncomfortable and scary.',
      status: 'Open',
    },
    {
      reporterId: oid(ID.omar),
      subjectId:  oid(ID.karim),
      context: 'Ride', rideId: oid(ID.r3),
      category: 'Inappropriate Behavior',
      description: 'Passenger was smoking inside the car despite the driver specifying a non-smoking ride.',
      status: 'Resolved',
      adminNote: 'Warning issued to passenger. Second offence will result in suspension.',
      resolvedAt: daysAgo(1),
    },
  ];

  await Report.insertMany(reports, { ordered: false }).catch(() => {});
  console.log('Reports seeded');

  await mongoose.disconnect();
  console.log('\nSeed complete. Password for all users: Demo@1234');
  console.log('\nNote: Open rides (r9–r13) have no Google Maps polyline (route: null).');
  console.log('Create new rides through the app to see the full map display.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
