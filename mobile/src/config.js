import { Platform } from 'react-native';

// ─── Local development ────────────────────────────────────────────────────────
// Running on a physical device? Replace with your machine's LAN IP, e.g. '192.168.1.42'.
// Running on an emulator/simulator you can leave it as-is.
const LOCAL_IP = '10.126.130.29'; // machine's Wi-Fi LAN IP
const LOCAL_PORT = 5000;

// ─── Exported URLs ────────────────────────────────────────────────────────────
export const API_BASE_URL = __DEV__
  ? `http://${LOCAL_IP}:${LOCAL_PORT}`
  : 'https://auicarpool-production-46f2.up.railway.app';
