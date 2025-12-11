import { getGeminiClient, GEMINI_MODELS, isGeminiConfigured } from "./gemini-client";

export interface EquipmentClassification {
  category: string | null; // Suggested category slug
  make: string | null;
  model: string | null;
  yearEstimate: number | null;
  equipmentType: string | null;
  condition: "excellent" | "good" | "fair" | "poor" | null;
  features: string[];
  confidence: number;
}

export interface ListingContent {
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  highlights: string[];
}

export interface PriceSuggestion {
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  depositAmount: number;
  currency: "SAR" | "BHD";
  confidence: number;
  reasoning: string;
}

/**
 * Classify equipment from photos using Gemini Vision
 */
export async function classifyEquipment(
  imageBase64: string,
  mimeType: string
): Promise<EquipmentClassification> {
  if (!isGeminiConfigured()) {
    console.log("[AI] GOOGLE_AI_API_KEY not configured, skipping classification");
    return {
      category: null,
      make: null,
      model: null,
      yearEstimate: null,
      equipmentType: null,
      condition: null,
      features: [],
      confidence: 0,
    };
  }

  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: GEMINI_MODELS.flashLite });

  try {
    console.log("[AI] Calling Gemini Vision API for equipment classification...");

    const prompt = `Analyze this image and determine if it shows heavy construction equipment.

If this is heavy equipment (excavators, cranes, loaders, bulldozers, trucks, generators, forklifts, etc.), identify:
- category: Use one of these slugs: excavators, wheel-loaders, backhoe-loaders, bulldozers, skid-steers, mini-excavators, crawler-cranes, tower-cranes, mobile-cranes, telehandlers, forklifts, scissor-lifts, boom-lifts, concrete-mixers, concrete-pumps, vibrating-rollers, diesel-generators, air-compressors, dump-trucks, flatbed-trailers, water-tankers, other
- make: Brand/manufacturer (Caterpillar, Komatsu, JCB, Volvo, Hitachi, etc.) or null if not identifiable
- model: Model number if visible, or null
- yearEstimate: Estimated manufacture year based on design, or null
- equipmentType: Description like "Crawler Excavator" or "Wheel Loader"
- condition: "excellent", "good", "fair", or "poor" based on visible wear
- features: Array of visible features like ["air conditioning", "GPS", "quick coupler"]
- confidence: Your confidence level 0.0 to 1.0

If this is NOT construction/industrial equipment (person, car, scenery, animal, random object, etc.):
- Return all fields as null except features (empty array) and confidence (0.0)

Return ONLY valid JSON with no additional text:
{"category": "...", "make": "...", "model": "...", "yearEstimate": null, "equipmentType": "...", "condition": "...", "features": [...], "confidence": 0.85}`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
          data: imageBase64,
        },
      },
      { text: prompt },
    ]);

    const response = await result.response;
    const text = response.text();

    console.log("[AI] Got response from Gemini:", text.substring(0, 200));

    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = text;
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      } else {
        const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          jsonStr = objectMatch[0];
        }
      }
      return JSON.parse(jsonStr) as EquipmentClassification;
    } catch {
      console.error("[AI] Failed to parse JSON response:", text);
      throw new Error("Failed to parse AI response as JSON");
    }
  } catch (error) {
    console.error("[AI] Gemini classification error:", error);
    throw error;
  }
}

/**
 * Generate bilingual listing content from equipment details
 */
export async function generateListingContent(
  equipmentDetails: {
    category: string;
    make: string;
    model: string;
    year: number;
    condition: string;
    features: string[];
    specs?: Record<string, string | number>;
  }
): Promise<ListingContent> {
  if (!isGeminiConfigured()) {
    return {
      titleEn: `${equipmentDetails.year} ${equipmentDetails.make} ${equipmentDetails.model} for Rent`,
      titleAr: `${equipmentDetails.make} ${equipmentDetails.model} ${equipmentDetails.year} للإيجار`,
      descriptionEn: `Well-maintained ${equipmentDetails.make} ${equipmentDetails.model} available for rent. ${equipmentDetails.condition} condition with ${equipmentDetails.features.length} features.`,
      descriptionAr: `${equipmentDetails.make} ${equipmentDetails.model} بحالة ${equipmentDetails.condition} متاحة للإيجار. صيانة ممتازة.`,
      highlights: equipmentDetails.features.slice(0, 5),
    };
  }

  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: GEMINI_MODELS.flashLite });

  const specsText = equipmentDetails.specs
    ? Object.entries(equipmentDetails.specs)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")
    : "";

  const prompt = `Generate a professional equipment rental listing in both English and Arabic. Return ONLY valid JSON.

Equipment Details:
- Category: ${equipmentDetails.category}
- Make: ${equipmentDetails.make}
- Model: ${equipmentDetails.model}
- Year: ${equipmentDetails.year}
- Condition: ${equipmentDetails.condition}
- Features: ${equipmentDetails.features.join(", ")}
${specsText ? `- Specs: ${specsText}` : ""}

Generate:
- titleEn: Concise, professional title in English (max 80 chars)
- titleAr: Same title in Arabic
- descriptionEn: Engaging description (150-250 words) highlighting benefits for renters
- descriptionAr: Same description in Arabic
- highlights: 5 key selling points as short phrases

Return: {"titleEn": "...", "titleAr": "...", "descriptionEn": "...", "descriptionAr": "...", "highlights": [...]}`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  try {
    let jsonStr = text;
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    } else {
      const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        jsonStr = objectMatch[0];
      }
    }
    return JSON.parse(jsonStr) as ListingContent;
  } catch {
    throw new Error("Failed to parse AI response as JSON");
  }
}

/**
 * Suggest pricing based on equipment details and market data
 */
export async function suggestPricing(
  equipmentDetails: {
    category: string;
    make: string;
    model: string;
    year: number;
    condition: string;
    country: "SA" | "BH";
  }
): Promise<PriceSuggestion> {
  const currency = equipmentDetails.country === "SA" ? "SAR" : "BHD";

  if (!isGeminiConfigured()) {
    // Fallback pricing based on category
    const basePrices: Record<string, number> = {
      excavators: 1500,
      "wheel-loaders": 1200,
      "crawler-cranes": 3000,
      "tower-cranes": 5000,
      generators: 500,
      "dump-trucks": 800,
      default: 1000,
    };

    const base = basePrices[equipmentDetails.category] || basePrices.default;
    const yearFactor = 1 - (2024 - equipmentDetails.year) * 0.03;
    const conditionFactor = { excellent: 1.1, good: 1.0, fair: 0.85, poor: 0.7 }[equipmentDetails.condition] || 1.0;

    const dailyRate = Math.round(base * yearFactor * conditionFactor);

    return {
      dailyRate,
      weeklyRate: Math.round(dailyRate * 6),
      monthlyRate: Math.round(dailyRate * 22),
      depositAmount: Math.round(dailyRate * 5),
      currency,
      confidence: 0.7,
      reasoning: "Based on category averages and equipment condition",
    };
  }

  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: GEMINI_MODELS.flashLite });

  const prompt = `Suggest rental pricing for heavy equipment in ${equipmentDetails.country === "SA" ? "Saudi Arabia" : "Bahrain"}. Return ONLY valid JSON.

Equipment:
- Category: ${equipmentDetails.category}
- Make: ${equipmentDetails.make}
- Model: ${equipmentDetails.model}
- Year: ${equipmentDetails.year}
- Condition: ${equipmentDetails.condition}
- Currency: ${currency}

Consider: Market rates in GCC, equipment age depreciation, brand reputation, local demand.

Return:
- dailyRate: Daily rental rate in ${currency}
- weeklyRate: Weekly rate (typically 5-6x daily)
- monthlyRate: Monthly rate (typically 20-25x daily)
- depositAmount: Security deposit (typically 3-7 days rental)
- currency: "${currency}"
- confidence: Your confidence 0.0 to 1.0
- reasoning: Brief explanation of pricing logic

Return: {"dailyRate": 0, "weeklyRate": 0, ...}`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  try {
    let jsonStr = text;
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    } else {
      const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        jsonStr = objectMatch[0];
      }
    }
    return JSON.parse(jsonStr) as PriceSuggestion;
  } catch {
    throw new Error("Failed to parse AI response as JSON");
  }
}
