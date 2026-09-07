/**
 * EOM Receipt & File Upload Security Validator
 * Phase 14 - Production Security
 * Validates receipt screenshots, proof images, and uploaded files.
 */

export interface ReceiptValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedUrl?: string;
  fileSizeEstimateBytes?: number;
  mimeType?: string;
}

const MAX_RECEIPT_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB Limit
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
const BLOCKED_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /<\?php/i,
  /exec\(/i,
  /system\(/i,
  /\.exe$/i,
  /\.sh$/i,
  /\.bat$/i,
  /\.php$/i,
  /\.\.\// // path traversal
];

export function validateReceiptUpload(
  proofUrlOrData?: string,
  proofNotes?: string
): ReceiptValidationResult {
  if (!proofUrlOrData || !proofUrlOrData.trim()) {
    return { isValid: true }; // Optional field if note or reference alone is provided
  }

  const cleanInput = proofUrlOrData.trim();

  // 1. Path Traversal & Executable Signature Checks
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(cleanInput) || (proofNotes && pattern.test(proofNotes))) {
      return {
        isValid: false,
        error: 'Security alert: Invalid or unsafe file format / executable script detected.'
      };
    }
  }

  // 2. Base64 Data URL Validation
  if (cleanInput.startsWith('data:')) {
    const matches = cleanInput.match(/^data:([a-zA-Z0-9-]+\/[a-zA-Z0-9-+.]+);base64,(.+)$/);
    if (!matches) {
      return {
        isValid: false,
        error: 'Invalid Base64 image data URL format.'
      };
    }

    const mimeType = matches[1].toLowerCase();
    const base64Data = matches[2];

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return {
        isValid: false,
        error: `Invalid file MIME type "${mimeType}". Only PNG, JPEG, JPG, and WEBP image receipts are allowed.`
      };
    }

    // Estimate file size in bytes from Base64 string length
    const estimatedSizeBytes = Math.round((base64Data.length * 3) / 4);
    if (estimatedSizeBytes > MAX_RECEIPT_SIZE_BYTES) {
      return {
        isValid: false,
        error: `Receipt screenshot size (${(estimatedSizeBytes / (1024 * 1024)).toFixed(2)}MB) exceeds maximum limit of 5MB.`
      };
    }

    return {
      isValid: true,
      sanitizedUrl: cleanInput,
      fileSizeEstimateBytes: estimatedSizeBytes,
      mimeType
    };
  }

  // 3. Regular HTTP / HTTPS Image URL Validation
  if (cleanInput.startsWith('http://') || cleanInput.startsWith('https://')) {
    const lowercaseUrl = cleanInput.toLowerCase();
    const hasValidExtension = /\.(png|jpe?g|webp)(\?.*)?$/i.test(lowercaseUrl) || lowercaseUrl.includes('images.unsplash.com') || lowercaseUrl.includes('blob:');

    if (!hasValidExtension) {
      return {
        isValid: false,
        error: 'Invalid receipt image URL format. Must point to a valid PNG, JPG, or WEBP image.'
      };
    }

    return {
      isValid: true,
      sanitizedUrl: cleanInput
    };
  }

  return {
    isValid: false,
    error: 'Invalid payment proof format. Must be a valid HTTP image link or Base64 encoded image.'
  };
}
