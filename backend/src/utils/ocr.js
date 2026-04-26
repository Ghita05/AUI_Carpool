/**
 * OCR utility — powered by Google Gemini Vision API.
 * Replaced tesseract.js (OOM-killed on Railway 512 MB containers) with
 * a lightweight HTTPS call to Gemini 1.5 Flash, which handles Moroccan
 * documents (French + Arabic) with higher accuracy and zero local memory.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-1.5-flash-latest';
const GEMINI_API_VERSION = 'v1beta';

/**
 * Fetch raw bytes from an HTTPS URL, returning { buffer, mimeType }.
 */
function fetchImageUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const ct = res.headers['content-type'] || 'image/jpeg';
        resolve({ buffer: Buffer.concat(chunks), mimeType: ct.split(';')[0].trim() });
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Send an image + prompt to Gemini and return the parsed JSON object.
 *
 * @param {string|{buffer:Buffer,mimetype:string}} imageInput
 *   - A Cloudinary/HTTPS URL string → fetched via HTTPS
 *   - A {buffer, mimetype} object   → used directly (from multer memoryStorage)
 *   - A local path string (dev only) → read with fs
 * @param {string} prompt – the text instruction
 * @returns {Promise<object>} – parsed JSON from the model
 */
async function callGemini(imageInput, prompt) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');

  let imageBuffer;
  let mimeType;

  if (imageInput && typeof imageInput === 'object' && imageInput.buffer) {
    // Memory-storage upload: buffer passed directly
    imageBuffer = imageInput.buffer;
    mimeType = (imageInput.mimetype || 'image/jpeg').split(';')[0].trim();
  } else if (typeof imageInput === 'string' && /^https?:\/\//i.test(imageInput)) {
    // Cloudinary or any HTTPS URL: download the bytes
    const fetched = await fetchImageUrl(imageInput);
    imageBuffer = fetched.buffer;
    mimeType = fetched.mimeType;
  } else {
    // Local file path (dev / legacy)
    const fullPath = path.join(__dirname, '../../', imageInput);
    imageBuffer = fs.readFileSync(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    mimeType =
      ext === '.png'  ? 'image/png'  :
      ext === '.webp' ? 'image/webp' :
      ext === '.gif'  ? 'image/gif'  : 'image/jpeg';
  }

  const base64Image = imageBuffer.toString('base64');

  const body = JSON.stringify({
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: mimeType, data: base64Image } },
      ],
    }],
    generationConfig: {
      temperature: 0,
    },
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'generativelanguage.googleapis.com',
        path: `/${GEMINI_API_VERSION}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 30000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const envelope = JSON.parse(data);
              const text = envelope.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
              // Gemini sometimes wraps JSON in markdown fences
              const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
              resolve(JSON.parse(clean));
            } catch (e) {
              reject(new Error(`Gemini response parse error: ${e.message}`));
            }
          } else {
            reject(new Error(`Gemini API error ${res.statusCode}: ${data}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Gemini request timed out')); });
    req.write(body);
    req.end();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Document processors
// ─────────────────────────────────────────────────────────────────────────────

const DOC_TYPE_LABELS = {
  registrationCard: 'Vehicle Registration Card (Carte Grise)',
  driverLicense: 'Driver License (Permis de Conduire)',
  cashWallet: 'AUI CashWallet Student Card',
  unknown: 'Unknown Document',
};

/**
 * Process an AUI CashWallet student card.
 * Returns: { holderName, firstName, lastName, studentId, isAuiCard, verified, ... }
 */
async function processCashWallet(imagePath) {
  const empty = {
    rawText: '', detectedType: 'unknown',
    detectedTypeLabel: DOC_TYPE_LABELS.unknown,
    wrongDocument: false, holderName: null,
    firstName: null, lastName: null, studentId: null,
    isAuiCard: false, verified: false,
  };
  try {
    const extracted = await callGemini(imagePath, `
You are a document scanner. Analyze this image and extract information.
Return ONLY a JSON object with these exact fields (no extra text):
{
  "docType": "cashWallet" | "driverLicense" | "registrationCard" | "unknown",
  "isAuiCard": true if this is an Al Akhawayn University CashWallet or student card else false,
  "firstName": the student first name as printed on the card (string or null),
  "lastName": the student last name/family name as printed on the card (string or null),
  "studentId": the numeric student ID (the number after "ID", usually 6 digits) as a string or null
}
If this is not an AUI CashWallet card still identify the docType and leave name/id fields null.
    `.trim());
    const detectedType = extracted.docType || (extracted.isAuiCard ? 'cashWallet' : 'unknown');
    const wrongDocument = detectedType !== 'cashWallet' && detectedType !== 'unknown';
    const holderName = [extracted.firstName, extracted.lastName].filter(Boolean).join(' ') || null;
    return {
      rawText: '',
      detectedType,
      detectedTypeLabel: DOC_TYPE_LABELS[detectedType] || DOC_TYPE_LABELS.unknown,
      wrongDocument,
      holderName,
      firstName: extracted.firstName || null,
      lastName: extracted.lastName || null,
      studentId: extracted.studentId ? String(extracted.studentId) : null,
      isAuiCard: !!extracted.isAuiCard,
      verified: !!(extracted.studentId || holderName),
    };
  } catch (err) {
    // Log only the error type/status — never log raw Gemini responses (may contain PII)
    console.error('[OCR:CashWallet] Gemini error:', err.constructor.name, err.statusCode || '');
    throw err;
  }
}

/**
 * Process a Moroccan Driver License (Permis de Conduire).
 * Returns: { holderName, firstName, lastName, licenseNumber, cni, verified, ... }
 */
async function processDriverLicense(imagePath) {
  const empty = {
    rawText: '', detectedType: 'unknown',
    detectedTypeLabel: DOC_TYPE_LABELS.unknown,
    wrongDocument: false, licenseNumber: null,
    holderName: null, firstName: null, lastName: null,
    cni: null, verified: false,
  };
  try {
    const extracted = await callGemini(imagePath, `
You are a document scanner. Analyze this image and extract information.
Return ONLY a JSON object with these exact fields (no extra text):
{
  "docType": "driverLicense" | "cashWallet" | "registrationCard" | "unknown",
  "firstName": the license holder first name / prénom (string or null),
  "lastName": the license holder last name / nom de famille (string or null),
  "licenseNumber": the license number (Permis N°, e.g. "42/297653") as a string or null,
  "cni": the national ID card number (C.N.I.E, e.g. "BE123456") as a string or null
}
This is a Moroccan driver license. Text may be in French and/or Arabic.
If this is not a driver license still identify the docType and leave the other fields null.
    `.trim());
    const detectedType = extracted.docType || 'unknown';
    const wrongDocument = detectedType !== 'driverLicense' && detectedType !== 'unknown';
    const holderName = [extracted.firstName, extracted.lastName].filter(Boolean).join(' ') || null;
    return {
      rawText: '',
      detectedType,
      detectedTypeLabel: DOC_TYPE_LABELS[detectedType] || DOC_TYPE_LABELS.unknown,
      wrongDocument,
      licenseNumber: extracted.licenseNumber || null,
      holderName,
      firstName: extracted.firstName || null,
      lastName: extracted.lastName || null,
      cni: extracted.cni || null,
      verified: !!(extracted.licenseNumber || holderName),
    };
  } catch (err) {
    // Log only the error type/status — never log raw Gemini responses (may contain PII)
    console.error('[OCR:DriverLicense] Gemini error:', err.constructor.name, err.statusCode || '');
    throw err;
  }
}

/**
 * Process a Moroccan Vehicle Registration Card (Carte Grise).
 * Returns: { licensePlate, ownerName, expiryDate, isExpired, verified, ... }
 */
async function processRegistrationCard(imagePath) {
  const empty = {
    rawText: '', detectedType: 'unknown',
    detectedTypeLabel: DOC_TYPE_LABELS.unknown,
    wrongDocument: false, licensePlate: null,
    ownerName: null, expiryDate: null,
    isExpired: false, verified: false,
  };
  try {
    const extracted = await callGemini(imagePath, `
You are a document scanner. Analyze this image and extract information.
Return ONLY a JSON object with these exact fields (no extra text):
{
  "docType": "registrationCard" | "driverLicense" | "cashWallet" | "unknown",
  "licensePlate": the vehicle registration / immatriculation number as a string or null,
  "ownerName": the owner name (Propriétaire / المالك) as a string or null,
  "expiryDate": the expiry date (Fin de validité) in DD/MM/YYYY format as a string or null
}
This is a Moroccan vehicle registration card (Carte Grise). Text may be in French and/or Arabic.
If this is not a registration card still identify the docType and leave the other fields null.
    `.trim());
    const detectedType = extracted.docType || 'unknown';
    const wrongDocument = detectedType !== 'registrationCard' && detectedType !== 'unknown';
    let isExpired = false;
    if (extracted.expiryDate) {
      const parts = extracted.expiryDate.split(/[/.-]/);
      if (parts.length === 3) {
        const expiry = new Date(parts[2], parts[1] - 1, parts[0]);
        isExpired = expiry < new Date();
      }
    }
    return {
      rawText: '',
      detectedType,
      detectedTypeLabel: DOC_TYPE_LABELS[detectedType] || DOC_TYPE_LABELS.unknown,
      wrongDocument,
      licensePlate: extracted.licensePlate || null,
      ownerName: extracted.ownerName || null,
      expiryDate: extracted.expiryDate || null,
      isExpired,
      verified: !!extracted.licensePlate,
    };
  } catch (err) {
    // Log only the error type/status — never log raw Gemini responses (may contain PII)
    console.error('[OCR:RegistrationCard] Gemini error:', err.constructor.name, err.statusCode || '');
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Name comparison helpers (used by authController for identity verification)
// ─────────────────────────────────────────────────────────────────────────────

function normalizeName(name) {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function editDistance(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function namesMatch(extractedName, userName) {
  const a = normalizeName(extractedName).split(' ').filter(Boolean);
  const b = normalizeName(userName).split(' ').filter(Boolean);
  if (!a.length || !b.length) return false;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  return shorter.every(word =>
    longer.some(lw => {
      if (lw === word) return true;
      if (lw.includes(word) || word.includes(lw)) return true;
      const maxDist = Math.max(1, Math.ceil(Math.max(word.length, lw.length) * 0.3));
      return editDistance(word, lw) <= maxDist;
    })
  );
}

module.exports = {
  processRegistrationCard,
  processDriverLicense,
  processCashWallet,
  namesMatch,
  DOC_TYPE_LABELS,
};
