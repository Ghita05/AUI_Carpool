const Tesseract = require('tesseract.js');
const path = require('path');

/**
 * Run OCR on an uploaded image and return raw text.
 * @param {string} imagePath – relative path like /uploads/xxxx.jpg
 * @returns {Promise<string>} extracted text
 */
async function extractText(imagePath) {
  const fullPath = path.join(__dirname, '../../', imagePath);
  const { data: { text } } = await Tesseract.recognize(fullPath, 'fra+eng+ara', {
    logger: () => {}, // silent
  });
  return text;
}

// ── Helpers ──

/** Normalize a name for comparison: lowercase, collapse whitespace, strip diacritics */
function normalizeName(name) {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents/diacritics
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')        // only letters + spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Simple Levenshtein edit distance between two strings.
 */
function editDistance(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

/**
 * Compare two names for compatibility (OCR-tolerant).
 * A word matches if: exact, substring, or edit distance is small relative to length.
 * Returns true if all words in the shorter name match a word in the longer one.
 */
function namesMatch(extractedName, userName) {
  const a = normalizeName(extractedName).split(' ').filter(Boolean);
  const b = normalizeName(userName).split(' ').filter(Boolean);
  if (!a.length || !b.length) return false;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  return shorter.every(word =>
    longer.some(lw => {
      if (lw === word) return true;
      if (lw.includes(word) || word.includes(lw)) return true;
      // OCR tolerance: allow edit distance up to ~30% of word length (min 1)
      const maxDist = Math.max(1, Math.ceil(Math.max(word.length, lw.length) * 0.3));
      return editDistance(word, lw) <= maxDist;
    })
  );
}

// ── Document type identification ──
// Each doc has distinctive keywords that don't appear on the others.
const DOC_SIGNATURES = {
  registrationCard: [
    /carte\s*grise/i,
    /بطاقة\s*رمادية/i,
    /immatriculation/i,
    /رقم\s*التسجيل/i,
    /propri[ée]taire/i,
    /المالك/i,
    /fin\s*de\s*validit/i,
    /نهاية\s*الصلاحية/i,
    /v[ée]hicule/i,
  ],
  driverLicense: [
    /permis\s*de\s*conduire/i,
    /رخصة\s*السياقة/i,
    /permis\s*n/i,
    /رقم\s*الرخصة/i,
    /c\.?\s*n\.?\s*i/i,
    /n[ée]\(e\)\s*le/i,
    /تاريخ\s*الولادة/i,
  ],
  cashWallet: [
    /al\s*akhawayn/i,
    /جامعة\s*الأخوين/i,
    /student/i,
    /university/i,
  ],
};

/**
 * Detect the document type from OCR text by counting keyword matches.
 * Returns: 'registrationCard' | 'driverLicense' | 'cashWallet' | 'unknown'
 */
function detectDocumentType(text) {
  const scores = {};
  for (const [docType, patterns] of Object.entries(DOC_SIGNATURES)) {
    scores[docType] = patterns.filter(p => p.test(text)).length;
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best[1] >= 1 ? best[0] : 'unknown';
}

const DOC_TYPE_LABELS = {
  registrationCard: 'Vehicle Registration Card (Carte Grise)',
  driverLicense: 'Driver License (Permis de Conduire)',
  cashWallet: 'AUI CashWallet Student Card',
  unknown: 'Unknown Document',
};

// ── Moroccan registration plate patterns ──
// New format (post-2006): XXXXX-[Arabic letter]-XX  e.g. 52341-و-6
// Arabic letters on plates: ا ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ع غ ف ق ك ل م ن ه و ي
// Old format: WW + digits  e.g. WW422753
const PLATE_PATTERNS = [
  // New format: digits – Arabic/Latin letter(s) – digits (OCR may read Arabic as Latin)
  /(\d{1,5})\s*[-–—\s]\s*([\u0600-\u06FF\w]{1,3})\s*[-–—\s]\s*(\d{1,3})/,
  // Old WW format
  /(WW\d{4,8})/i,
  // Fallback: digits-letter(s)-digits with any separator
  /(\d{3,5})\s*[^\d\s]\s*(\d{1,3})/,
];

/**
 * Process a Moroccan Vehicle Registration Card (Carte Grise / بطاقة رمادية).
 * Extracts: immatriculation number, owner name (Propriétaire), expiry date (Fin de validité).
 */
async function processRegistrationCard(imagePath) {
  const text = await extractText(imagePath);
  const detectedType = detectDocumentType(text);
  const result = {
    rawText: text,
    detectedType,
    detectedTypeLabel: DOC_TYPE_LABELS[detectedType],
    wrongDocument: detectedType !== 'registrationCard' && detectedType !== 'unknown',
    licensePlate: null,
    ownerName: null,
    expiryDate: null,
    isExpired: false,
    verified: false,
  };

  // If wrong document, return early with detection info
  if (result.wrongDocument) return result;

  // ── Immatriculation number ──
  // Try "Numéro d'immatriculation" label first
  const immatLine = text.match(/(?:immatriculation|[Nn]um[ée]ro)\s*[:.]?\s*(.+)/i);
  if (immatLine) {
    const lineText = immatLine[1].trim();
    // Try to extract plate from the line following the label
    for (const p of PLATE_PATTERNS) {
      const m = lineText.match(p);
      if (m) {
        result.licensePlate = m[0].replace(/\s+/g, '').trim();
        break;
      }
    }
  }
  // If not found via label, try patterns on full text
  if (!result.licensePlate) {
    for (const p of PLATE_PATTERNS) {
      const m = text.match(p);
      if (m) {
        result.licensePlate = m[0].replace(/\s+/g, '').trim();
        break;
      }
    }
  }

  // ── Propriétaire (Owner) ──
  const ownerMatch = text.match(/(?:Propri[ée]taire|المالك)\s*[:.]?\s*\n?\s*([A-Z\u00C0-\u017F\s]{2,})/im);
  if (ownerMatch) {
    result.ownerName = ownerMatch[1].replace(/\s+/g, ' ').trim();
  }

  // ── Fin de validité (Expiry) ──
  const expiryMatch = text.match(/(?:Fin de validit[ée]|نهاية الصلاحية)\s*[:.]?\s*(\d{2}[/.-]\d{2}[/.-]\d{4})/i);
  if (expiryMatch) {
    result.expiryDate = expiryMatch[1];
    // Parse and check if expired
    const parts = expiryMatch[1].split(/[/.-]/);
    if (parts.length === 3) {
      const expiry = new Date(parts[2], parts[1] - 1, parts[0]);
      result.isExpired = expiry < new Date();
    }
  }

  if (result.licensePlate) result.verified = true;

  return result;
}

/**
 * Process a Moroccan Driver License (Permis de Conduire / رخصة السياقة).
 * Extracts: holder first/last name, license number (Permis N°), category, CNI.
 */
async function processDriverLicense(imagePath) {
  const text = await extractText(imagePath);
  const detectedType = detectDocumentType(text);
  const result = {
    rawText: text,
    detectedType,
    detectedTypeLabel: DOC_TYPE_LABELS[detectedType],
    wrongDocument: detectedType !== 'driverLicense' && detectedType !== 'unknown',
    licenseNumber: null,
    holderName: null,
    firstName: null,
    lastName: null,
    cni: null,
    verified: false,
  };

  // If wrong document, return early with detection info
  if (result.wrongDocument) return result;

  // ── Permis N° (license number) – format like 42/297653 ──
  const permitMatch = text.match(/(?:Permis|رقم الرخصة)\s*N?[°o®.]?\s*[:.]?\s*([A-Z0-9/\-]{4,})/i);
  if (permitMatch) result.licenseNumber = permitMatch[1].trim();
  // Fallback: any XX/XXXXXX pattern
  if (!result.licenseNumber) {
    const slashNum = text.match(/\b(\d{1,3}\/\d{4,})\b/);
    if (slashNum) result.licenseNumber = slashNum[1];
  }

  // ── Name extraction: label-finding + ALL-CAPS word detection ──
  // On Moroccan licenses, names (e.g. GHITA, NAFA) appear as ALL-CAPS Latin words
  // near the Prénom/Nom labels. OCR often garbles the layout with junk characters
  // before/after labels, so we:
  //   1. Find the label line (Prénom or Nom)
  //   2. Search that line and the next 2 lines for ALL-CAPS words (3+ chars)
  //   3. Filter out known keywords (cities, document terms)
  const dlLines = text.split(/\n/);
  const DL_KEYWORDS = /^(ROYAUME|ROYAUM|MAROC|PERMIS|CONDUIRE|RABAT|CASA|CASABLANCA|TEMARA|KENITRA|FES|MEKNES|TANGER|OUJDA|AGADIR|SAFI|SALE|SIGNE|BOULAAJOUL|BENACEUR|AGENCE|NATIONALE|SECURITE|ROUTIERE|DIRECTEUR|DELIVRE|DELIVREE|DATE|LIEU|NAISSANCE|CATEGORIE|AAGDAL|RIYAD|RIAD|PRENOM|NOM)$/i;

  const findCapsName = (startIdx, exclude) => {
    // Search lines BELOW the label first (names live on the next 1-2 lines)
    for (let i = startIdx + 1; i <= Math.min(startIdx + 3, dlLines.length - 1); i++) {
      const caps = [...dlLines[i].matchAll(/([A-Z]{3,})/g)].map(m => m[1]);
      const name = caps.find(w => w.length >= 3 && !DL_KEYWORDS.test(w) && (!exclude || w !== exclude));
      if (name) return name;
    }
    // Fallback: try the label line itself (require 4+ chars to skip short noise like POS)
    const caps = [...dlLines[startIdx].matchAll(/([A-Z]{4,})/g)].map(m => m[1]);
    return caps.find(w => !DL_KEYWORDS.test(w) && (!exclude || w !== exclude)) || null;
  };

  // Find Prénom label line
  const prenomIdx = dlLines.findIndex(l => /pr[ée]nom|الشخصي/i.test(l));
  if (prenomIdx >= 0) {
    result.firstName = findCapsName(prenomIdx, null);
  }

  // Find Nom label line (must not be the Prénom line)
  // Use word boundary to avoid matching "nom" inside other words
  const nomIdx = dlLines.findIndex((l, i) =>
    (/\bNom\b|العائلي|العاتلي/i.test(l)) && !/pr[ée]nom|الشخصي/i.test(l) && i !== prenomIdx
  );
  if (nomIdx >= 0) {
    result.lastName = findCapsName(nomIdx, result.firstName);
  }

  // Fallback: if either name still missing, scan for isolated ALL-CAPS name-like lines
  if (!result.firstName || !result.lastName) {
    const capsNames = dlLines
      .map(l => l.trim())
      .filter(l => /^[A-Z]{3,}$/.test(l) && !DL_KEYWORDS.test(l));
    if (!result.firstName && !result.lastName && capsNames.length >= 2) {
      result.firstName = capsNames[0];
      result.lastName = capsNames[1];
    } else if (!result.firstName && capsNames.length >= 1) {
      result.firstName = capsNames.find(n => n !== result.lastName) || null;
    } else if (!result.lastName && capsNames.length >= 1) {
      result.lastName = capsNames.find(n => n !== result.firstName) || null;
    }
  }

  // Compose full holder name
  if (result.firstName || result.lastName) {
    result.holderName = [result.firstName, result.lastName].filter(Boolean).join(' ');
  }

  // ── C.N.I.E (Carte Nationale d'Identité Électronique) ──
  // Format: letter(s) + digits, e.g. "BE123456", "BK123456" or just digits
  // Moroccan cards say C.N.I. or C.N.I.E
  const cniStrategies = [
    /C\.?\s*N\.?\s*I\.?\s*E?\.?\s*[:.]?\s*([A-Z]{1,2}\d{4,})/i,
    /C\.?\s*N\.?\s*I\.?\s*E?[^\n]*\n+\s*([A-Z]{1,2}\d{4,})/i,
    // Fallback: look for typical Moroccan CNIE pattern (2 letters + 6 digits)
    /\b([A-Z]{1,2}\d{5,8})\b/,
  ];
  for (const p of cniStrategies) {
    const m = text.match(p);
    // Avoid matching license number (contains /) or standalone numbers
    if (m && m[1].trim().length >= 6 && !/\//.test(m[1])) {
      result.cni = m[1].trim();
      break;
    }
  }

  if (result.licenseNumber || result.holderName) {
    result.verified = true;
  }

  // Debug logging for OCR diagnostics
  console.log('[OCR:DriverLicense] Raw text:', JSON.stringify(text));
  console.log('[OCR:DriverLicense] Extracted:', { firstName: result.firstName, lastName: result.lastName, holderName: result.holderName, licenseNumber: result.licenseNumber, cni: result.cni });

  return result;
}

/**
 * Process an AUI CashWallet student card.
 * Layout: AL AKHAWAYN UNIVERSITY logo, photo, then:
 *   FIRSTNAME
 *   LASTNAME
 *   STUDENT
 *   ID XXXXXX
 *   [QR code]
 * Extracts: holder name (firstName + lastName), student ID (auiId).
 */
async function processCashWallet(imagePath) {
  const text = await extractText(imagePath);
  const detectedType = detectDocumentType(text);
  const result = {
    rawText: text,
    detectedType,
    detectedTypeLabel: DOC_TYPE_LABELS[detectedType],
    wrongDocument: detectedType !== 'cashWallet' && detectedType !== 'unknown',
    holderName: null,
    firstName: null,
    lastName: null,
    studentId: null,
    isAuiCard: false,
    verified: false,
  };

  // If wrong document, return early with detection info
  if (result.wrongDocument) return result;

  // ── Verify it's an AUI card (check for university name) ──
  // Strip Unicode directional marks that OCR may insert around Arabic text
  const cleanText = text.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '');
  if (/al\s*akhawayn|جامع|بامع|akhawayn|AKHAW|AW\s*AYN/i.test(cleanText)) {
    result.isAuiCard = true;
  }

  // ── Student ID – "ID XXXXXX" (6-digit AUI IDs) ──
  const idMatch = text.match(/ID\s+(\d{5,7})/i);
  if (idMatch) {
    result.studentId = idMatch[1];
  } else {
    // Fallback: any standalone 6-digit number
    const sixDigit = text.match(/\b(\d{6})\b/);
    if (sixDigit) result.studentId = sixDigit[1];
  }

  // ── Name extraction ──
  // The AUI CashWallet has the name in large text:
  //   FIRSTNAME
  //   LASTNAME
  //   STUDENT
  //   ID XXXXXX
  // OCR may read it as separate lines or joined. We use multiple strategies.

  const allLines = text.split(/\n/).map(l => l.trim()).filter(Boolean);

  // Strategy 1: Find "STUDENT" and take the name lines above it
  const studentLineIdx = allLines.findIndex(l => /\bSTUDENT\b/i.test(l));
  if (studentLineIdx > 0) {
    // Collect name-candidate lines above STUDENT (Latin letters only, no keywords)
    const candidates = [];
    for (let i = studentLineIdx - 1; i >= 0 && candidates.length < 3; i--) {
      const l = allLines[i].replace(/[^A-Za-z\u00C0-\u017F '\-]/g, '').trim(); // strip OCR artifacts
      const lWords = l.split(/\s+/).filter(Boolean);
      if (l.length >= 3 && lWords.every(w => w.length >= 3) &&
          /^[A-Za-z\u00C0-\u017F '-]+$/.test(l) &&
          !/akhawayn|university|جامعة|student|id\s*\d|holder|firstname|lastname|firstn|lastn|isauic|verif/i.test(l)) {
        candidates.unshift(l); // prepend to maintain order
      } else if (candidates.length > 0) break; // stop at first non-name line
    }
    if (candidates.length >= 2) {
      result.firstName = candidates[0];
      result.lastName = candidates[1];
    } else if (candidates.length === 1) {
      const parts = candidates[0].split(/\s+/);
      if (parts.length >= 2) {
        result.firstName = parts[0];
        result.lastName = parts.slice(1).join(' ');
      } else {
        result.firstName = candidates[0];
      }
    }
  }

  // Strategy 2: Look for ALL-CAPS lines that aren't keywords (any position)
  if (!result.firstName) {
    const capsLines = allLines.map(l => l.replace(/[^A-Z\u00C0-\u017F '\-]/g, '').trim()).filter(l => {
      const cw = l.split(/\s+/).filter(Boolean);
      return l.length >= 3 && cw.every(w => w.length >= 3) &&
        /^[A-Z\u00C0-\u017F '-]+$/.test(l) && l.length <= 30 &&
        !/AKHAWAYN|UNIVERSITY|STUDENT|ID\s*\d/i.test(l);
    });
    if (capsLines.length >= 2) {
      result.firstName = capsLines[0];
      result.lastName = capsLines[1];
    } else if (capsLines.length === 1) {
      const parts = capsLines[0].split(/\s+/);
      if (parts.length >= 2) {
        result.firstName = parts[0];
        result.lastName = parts.slice(1).join(' ');
      }
    }
  }

  // Strategy 3: Look for mixed-case name-like lines (e.g. "Ghita", "Nafa")
  if (!result.firstName) {
    const nameLines = allLines.map(l => l.replace(/[^A-Za-z\u00C0-\u017F '\-]/g, '').trim()).filter(l => {
      const nw = l.split(/\s+/).filter(Boolean);
      return l.length >= 3 && nw.every(w => w.length >= 3) && l.length <= 20 &&
        /^[A-Za-z\u00C0-\u017F '-]+$/.test(l) &&
        !/akhawayn|university|student|id/i.test(l) &&
        /^[A-Z]/.test(l);
    });
    if (nameLines.length >= 2) {
      result.firstName = nameLines[0];
      result.lastName = nameLines[1];
    }
  }

  if (result.firstName || result.lastName) {
    result.holderName = [result.firstName, result.lastName].filter(Boolean).join(' ');
  }

  if (result.studentId || result.holderName) {
    result.verified = true;
  }

  

  return result;
}

module.exports = {
  extractText,
  processRegistrationCard,
  processDriverLicense,
  processCashWallet,
  namesMatch,
  detectDocumentType,
  DOC_TYPE_LABELS,
};
