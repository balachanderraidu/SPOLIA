// ──────────────────────────────────────────────────────────────────
// utils/gemini.js  —  Google Gemini API utility stub
// Used for: AI Scanner material identification + description generation
// ──────────────────────────────────────────────────────────────────

// TODO: Replace with your Google Gemini API key
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY";
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Identify a construction material from an image.
 * Sends the image to Gemini Vision and returns a structured analysis.
 * @param {string} base64Image - Base64-encoded image string (JPEG)
 * @returns {Promise<ScanResult>}
 */
export async function scanMaterial(base64Image) {
    console.log("[Gemini] scanMaterial() stub — calling Gemini Vision API");

    const prompt = `You are an expert construction material assessor for Spolia, a premium reclaimed materials marketplace in India.
  
Analyze this construction material image and return a JSON object with:
{
  "materialType": "e.g. Red Clay Brick / Italian Travertine / Teak Wood",
  "category": "stone|wood|steel|brick|glass|tile|other",
  "condition": "Excellent|Good|Fair|Poor",
  "estimatedQuantity": { "value": number, "unit": "sqft|pieces|kg|tonnes" },
  "estimatedPricePerUnit": number,
  "currency": "INR",
  "co2SavedKg": number,
  "confidence": 0.0-1.0,
  "description": "2-sentence premium listing description",
  "tags": ["reclaimed", "premium", ...],
  "warnings": ["Any quality concerns or caveats"]
}

Be concise and accurate. Price should reflect Indian secondary market rates.`;

    // Call Gemini Vision API (falls back to mock on error)
    if (base64Image) {
        try {
            const response = await fetch(GEMINI_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            { inlineData: { mimeType: "image/jpeg", data: base64Image } }
                        ]
                    }],
                    generationConfig: { responseMimeType: "application/json" }
                })
            });
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) return JSON.parse(text);
        } catch (error) {
            console.warn("[Gemini] API call failed, using mock result:", error);
        }
    }

    // Fallback mock response (used in demo mode or if API fails)
    await new Promise(r => setTimeout(r, 1200));
    return MOCK_SCAN_RESULT;
}

/**
 * Generate an enhanced listing description for a material.
 * @param {Object} materialData - Basic material info
 * @returns {Promise<string>} Enhanced description
 */
export async function generateListingDescription(materialData) {
    const prompt = `Write a premium, concise (2-3 sentences) listing description for:
Material: ${materialData.title}
Type: ${materialData.type}
Condition: ${materialData.condition}
Specs: ${JSON.stringify(materialData.specs)}

Write in an authoritative, architectural tone suitable for professional architects and designers.`;

    console.log("[Gemini] generateListingDescription() stub");
    await new Promise(r => setTimeout(r, 800));
    return `Exceptional ${materialData.title} salvaged from a high-specification project, offering uncompromised quality with the patina of authentic use. Each piece has been assessed and meets Spolia's quality standards. Ideal for architects seeking character materials for premium residential or hospitality projects.`;
}

/**
 * Estimate CO₂ savings based on material type and quantity.
 * @param {string} category - Material category
 * @param {number} quantity - Quantity value
 * @param {string} unit - Quantity unit
 * @returns {number} CO₂ saved in kg
 */
export function estimateCO2Savings(category, quantity, unit) {
    // Approximate CO₂ factors (kg CO₂ per unit) based on industry data
    const CO2_FACTORS = {
        stone: { sqft: 4.2, kg: 0.12 },
        marble: { sqft: 6.8, kg: 0.20 },
        steel: { pieces: 85, kg: 1.85 },
        wood: { sqft: 1.8, pieces: 12, kg: 0.06 },
        brick: { pieces: 0.35, kg: 0.22 },
        glass: { sqft: 3.1, kg: 0.85 },
        tile: { sqft: 2.4, kg: 0.70 },
        other: { kg: 0.50 }
    };
    const factors = CO2_FACTORS[category] || CO2_FACTORS.other;
    const factor = factors[unit] || factors.kg || 0.5;
    return Math.round(quantity * factor);
}

// Mock scan result for development
const MOCK_SCAN_RESULT = {
    materialType: "Red Clay Brick (Handmade)",
    category: "brick",
    condition: "Good",
    estimatedQuantity: { value: 2400, unit: "pieces" },
    estimatedPricePerUnit: 14,
    currency: "INR",
    co2SavedKg: 840,
    confidence: 0.91,
    description: "Handmade red clay bricks with characteristic irregular texture and warm terracotta tones, sourced from a period residential building. Ideal for feature walls, landscaping, and contemporary-heritage mixed-use projects.",
    tags: ["reclaimed", "handmade", "terracotta", "period", "character"],
    warnings: []
};
