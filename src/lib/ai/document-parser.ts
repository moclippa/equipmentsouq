import { getAnthropicClient, AI_MODELS, isAIConfigured } from "./client";

export interface CRDocumentData {
  companyNameEn: string | null;
  companyNameAr: string | null;
  crNumber: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  businessActivities: string[];
  address: string | null;
  confidence: number;
}

export interface VATDocumentData {
  vatNumber: string | null;
  companyName: string | null;
  registrationDate: string | null;
  confidence: number;
}

/**
 * Parse a Commercial Registration (CR) document using Claude Vision
 */
export async function parseCRDocument(
  imageBase64: string,
  mimeType: string
): Promise<CRDocumentData> {
  if (!isAIConfigured()) {
    // Return mock data for development
    return {
      companyNameEn: "Sample Company LLC",
      companyNameAr: "شركة عينة ذ.م.م",
      crNumber: "1010123456",
      issueDate: "2024-01-15",
      expiryDate: "2025-01-14",
      businessActivities: ["Equipment Rental", "Construction Services"],
      address: "Riyadh, Saudi Arabia",
      confidence: 0.95,
    };
  }

  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: AI_MODELS.vision,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: `Analyze this Saudi Arabian or Bahraini Commercial Registration (CR) document and extract the following information. Return ONLY a valid JSON object with no additional text.

Extract:
- companyNameEn: Company name in English (null if not found)
- companyNameAr: Company name in Arabic (null if not found)
- crNumber: CR registration number (null if not found)
- issueDate: Issue date in YYYY-MM-DD format (null if not found)
- expiryDate: Expiry date in YYYY-MM-DD format (null if not found)
- businessActivities: Array of business activities listed
- address: Full address (null if not found)
- confidence: Your confidence in the extraction (0.0 to 1.0)

Return format: {"companyNameEn": "...", "companyNameAr": "...", ...}`,
          },
        ],
      },
    ],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from AI");
  }

  try {
    // Extract JSON from response (handle potential markdown code blocks)
    let jsonStr = textContent.text;
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    return JSON.parse(jsonStr) as CRDocumentData;
  } catch {
    throw new Error("Failed to parse AI response as JSON");
  }
}

/**
 * Parse a VAT Certificate document using Claude Vision
 */
export async function parseVATDocument(
  imageBase64: string,
  mimeType: string
): Promise<VATDocumentData> {
  if (!isAIConfigured()) {
    // Return mock data for development
    return {
      vatNumber: "300012345678901",
      companyName: "Sample Company LLC",
      registrationDate: "2024-01-20",
      confidence: 0.92,
    };
  }

  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: AI_MODELS.vision,
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: `Analyze this Saudi Arabian or Bahraini VAT Certificate and extract the following information. Return ONLY a valid JSON object with no additional text.

Extract:
- vatNumber: VAT registration number (null if not found)
- companyName: Company name (null if not found)
- registrationDate: Registration date in YYYY-MM-DD format (null if not found)
- confidence: Your confidence in the extraction (0.0 to 1.0)

Return format: {"vatNumber": "...", "companyName": "...", ...}`,
          },
        ],
      },
    ],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from AI");
  }

  try {
    let jsonStr = textContent.text;
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    return JSON.parse(jsonStr) as VATDocumentData;
  } catch {
    throw new Error("Failed to parse AI response as JSON");
  }
}
