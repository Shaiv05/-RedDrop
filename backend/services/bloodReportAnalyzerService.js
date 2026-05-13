const zlib = require("zlib");

const AI_GATEWAY_URL = "https://ai.gateway.reddrop.dev/v1/chat/completions";
const ANALYZER_MODEL = process.env.BLOOD_REPORT_ANALYZER_MODEL || "google/gemini-3-flash-preview";

const PARAMETER_DEFINITIONS = [
  {
    slug: "hemoglobin",
    label: "Hemoglobin",
    aliases: ["hemoglobin", "haemoglobin", "hb", "hgb"],
    referenceRange: "12.0 - 17.5 g/dL",
    units: ["g/dl", "gm/dl", "g%"],
    compare: (value) => compareRange(value, 12, 17.5),
    explanation: {
      low: "Low hemoglobin can suggest anemia, iron deficiency, blood loss, or poor nutrition.",
      high: "High hemoglobin can appear with dehydration, smoking, or some lung and blood disorders.",
      normal: "Hemoglobin is in the expected adult range and supports oxygen transport.",
    },
  },
  {
    slug: "wbc",
    label: "White Blood Cells",
    aliases: ["wbc", "white blood cell", "white blood cells", "total leucocyte count", "total leukocyte count", "tlc"],
    referenceRange: "4.0 - 11.0 x10^3/uL",
    units: ["x10^3/ul", "10^3/ul", "thousand/ul", "cells/cumm", "/cumm"],
    compare: (value, unit) => {
      const normalized = normalizeCellCount(value, unit, 1000);
      return compareRange(normalized, 4, 11);
    },
    displayValue: (value, unit) => formatCellCountDisplay(value, unit, 1000),
    explanation: {
      low: "Low WBC may reduce infection defense and can happen after viral illness, some medicines, or bone marrow suppression.",
      high: "High WBC can happen with infection, inflammation, stress, or steroid use.",
      normal: "WBC is within the expected range for immune surveillance.",
    },
  },
  {
    slug: "rbc",
    label: "Red Blood Cells",
    aliases: ["rbc", "red blood cell", "red blood cells", "erythrocyte count"],
    referenceRange: "4.1 - 5.9 x10^6/uL",
    units: ["x10^6/ul", "10^6/ul", "million/ul", "mil/cumm", "mill/cumm"],
    compare: (value, unit) => {
      const normalized = normalizeCellCount(value, unit, 1000000);
      return compareRange(normalized, 4.1, 5.9);
    },
    displayValue: (value, unit) => formatCellCountDisplay(value, unit, 1000000),
    explanation: {
      low: "Low RBC can be seen in anemia, blood loss, nutritional deficiency, or chronic illness.",
      high: "High RBC can be associated with dehydration, low oxygen states, or polycythemia.",
      normal: "RBC count is in the expected adult range.",
    },
  },
  {
    slug: "platelets",
    label: "Platelets",
    aliases: ["platelets", "platelet count", "plt"],
    referenceRange: "150 - 450 x10^3/uL",
    units: ["x10^3/ul", "10^3/ul", "thousand/ul", "lakhs/cumm", "/cumm"],
    compare: (value, unit) => {
      const normalized = normalizePlateletCount(value, unit);
      return compareRange(normalized, 150, 450);
    },
    displayValue: (value, unit) => formatPlateletDisplay(value, unit),
    explanation: {
      low: "Low platelets may increase bleeding risk and can occur with infections, medications, or immune conditions.",
      high: "High platelets can happen with inflammation, iron deficiency, or some marrow disorders.",
      normal: "Platelet count is within the expected range for clotting support.",
    },
  },
  {
    slug: "cholesterol",
    label: "Total Cholesterol",
    aliases: ["cholesterol", "total cholesterol"],
    referenceRange: "< 200 mg/dL",
    units: ["mg/dl"],
    compare: (value) => {
      if (value < 125) return "low";
      if (value <= 200) return "normal";
      if (value <= 239) return "borderline";
      return "high";
    },
    explanation: {
      low: "Low total cholesterol is less common and may reflect malnutrition, liver issues, or over-treatment in some cases.",
      borderline: "Borderline cholesterol deserves diet and activity review before it rises further.",
      high: "High cholesterol can increase long-term cardiovascular risk.",
      normal: "Total cholesterol is in the desirable range.",
    },
  },
  {
    slug: "glucose",
    label: "Glucose",
    aliases: ["glucose", "blood glucose", "fasting blood sugar", "fasting glucose", "fbs", "rbs", "random blood sugar"],
    referenceRange: "70 - 99 mg/dL",
    units: ["mg/dl"],
    compare: (value) => compareRange(value, 70, 99),
    explanation: {
      low: "Low glucose can lead to weakness, sweating, dizziness, or fainting.",
      high: "High glucose can be linked to diabetes, stress response, or steroid use.",
      normal: "Glucose is within the common fasting reference range.",
    },
  },
  {
    slug: "hematocrit",
    label: "Hematocrit",
    aliases: ["hematocrit", "haematocrit", "hct", "pcv"],
    referenceRange: "36 - 52 %",
    units: ["%", "percent"],
    compare: (value) => compareRange(value, 36, 52),
    explanation: {
      low: "Low hematocrit often tracks with anemia or blood loss.",
      high: "High hematocrit may happen with dehydration or chronically low oxygen exposure.",
      normal: "Hematocrit is in the expected adult range.",
    },
  },
];

const DISCLAIMER =
  "This AI-assisted summary is for education only and is not a diagnosis. Please discuss abnormal results with a qualified clinician before acting on them.";

function compareRange(value, min, max) {
  if (value < min) return "low";
  if (value > max) return "high";
  return "normal";
}

function normalizeText(text) {
  return String(text || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n");
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(.*?);base64,(.*)$/);
  if (!match) {
    throw new Error("Uploaded file must be sent as a base64 data URL");
  }

  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

function decodePdfString(value) {
  return value
    .replace(/\\([()\\])/g, "$1")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t");
}

function extractTextFromPdfBuffer(buffer) {
  const pdfText = buffer.toString("latin1");
  const streams = [];
  const streamRegex = /<<(.*?)>>\s*stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;

  while ((match = streamRegex.exec(pdfText))) {
    const dictionary = match[1];
    const rawStream = match[2];
    let streamBuffer = Buffer.from(rawStream, "latin1");

    if (/FlateDecode/i.test(dictionary)) {
      try {
        streamBuffer = zlib.inflateSync(streamBuffer);
      } catch (error) {
        continue;
      }
    }

    const streamText = streamBuffer.toString("latin1");
    const fragments = [];
    const textRegex = /\(([^()]*(?:\\.[^()]*)*)\)\s*Tj|\[((?:[^[\]]|\([^)]*\))*)\]\s*TJ/g;
    let textMatch;

    while ((textMatch = textRegex.exec(streamText))) {
      if (textMatch[1]) {
        fragments.push(decodePdfString(textMatch[1]));
      } else if (textMatch[2]) {
        const subMatches = textMatch[2].match(/\(([^()]*(?:\\.[^()]*)*)\)/g) || [];
        fragments.push(subMatches.map((item) => decodePdfString(item.slice(1, -1))).join(" "));
      }
    }

    if (fragments.length > 0) {
      streams.push(fragments.join(" "));
    }
  }

  return normalizeText(streams.join("\n"));
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findParameterValue(text, definition) {
  const sanitizedText = String(text || "");

  for (const alias of definition.aliases) {
    const pattern = new RegExp(
      `(?:^|[^a-z])${escapeRegex(alias)}\\s*(?:[:=\\-]|is|value)?\\s*([0-9]+(?:\\.[0-9]+)?)\\s*([a-zA-Z%/^0-9._-]*)`,
      "i"
    );
    const match = sanitizedText.match(pattern);
    if (match) {
      return {
        value: Number(match[1]),
        unit: String(match[2] || "").trim(),
        confidence: 0.9,
      };
    }
  }

  return null;
}

function normalizeCellCount(value, unit, multiplier) {
  const normalizedUnit = String(unit || "").toLowerCase();
  if (normalizedUnit.includes("10^3") || normalizedUnit.includes("x10^3")) return value;
  if (normalizedUnit.includes("10^6") || normalizedUnit.includes("x10^6")) return value;
  if (normalizedUnit.includes("million")) return value;
  if (normalizedUnit.includes("thousand")) return value;
  if (value > multiplier / 10) return value / multiplier;
  return value;
}

function normalizePlateletCount(value, unit) {
  const normalizedUnit = String(unit || "").toLowerCase();
  if (normalizedUnit.includes("lakhs")) return value * 100;
  if (normalizedUnit.includes("10^3") || normalizedUnit.includes("x10^3")) return value;
  if (value > 1000) return value / 1000;
  return value;
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.00$/, "");
}

function formatCellCountDisplay(value, unit, multiplier) {
  const normalized = normalizeCellCount(value, unit, multiplier);
  return {
    value: normalized,
    unit: multiplier === 1000 ? "x10^3/uL" : "x10^6/uL",
  };
}

function formatPlateletDisplay(value, unit) {
  return {
    value: normalizePlateletCount(value, unit),
    unit: "x10^3/uL",
  };
}

function buildLocalInsights(parameters) {
  const abnormal = parameters.filter((parameter) => parameter.status !== "normal");
  if (abnormal.length === 0) {
    return [
      "The extracted core blood markers are within common adult reference ranges.",
      "Keep hydration, balanced meals, sleep, and routine preventive checkups consistent.",
    ];
  }

  return abnormal.map((parameter) => {
    if (parameter.slug === "hemoglobin" && parameter.status === "low") {
      return "Low hemoglobin may fit iron deficiency or anemia patterns and deserves clinical follow-up if symptoms are present.";
    }
    if (parameter.slug === "wbc" && parameter.status === "high") {
      return "Raised WBC can happen with infection or inflammation, especially if fever or weakness is present.";
    }
    if (parameter.slug === "glucose" && parameter.status === "high") {
      return "Higher glucose should be reviewed with a clinician, especially if the sample was fasting.";
    }
    if (parameter.slug === "platelets" && parameter.status === "low") {
      return "Low platelets can increase bleeding risk, so bruising or gum bleeding should not be ignored.";
    }
    return `${parameter.name} is ${parameter.status}, so the result should be interpreted with symptoms, medications, and the full clinical report.`;
  });
}

function buildDietSuggestions(parameters) {
  const suggestions = [];

  if (parameters.some((parameter) => parameter.slug === "hemoglobin" && parameter.status === "low")) {
    suggestions.push("Increase iron-rich foods such as spinach, beans, lentils, dates, jaggery, lean meat, or fortified cereals.");
    suggestions.push("Pair iron sources with vitamin C rich foods like lemon, oranges, amla, or guava to improve absorption.");
  }

  if (parameters.some((parameter) => parameter.slug === "cholesterol" && ["high", "borderline"].includes(parameter.status))) {
    suggestions.push("Reduce deep-fried food, processed snacks, and excess saturated fat; add oats, nuts, seeds, and fiber-rich meals.");
  }

  if (parameters.some((parameter) => parameter.slug === "glucose" && parameter.status === "high")) {
    suggestions.push("Prefer high-fiber meals, smaller portions of refined carbs, and limit sugary drinks or sweets.");
  }

  if (suggestions.length === 0) {
    suggestions.push("Keep meals balanced with protein, vegetables, fruit, whole grains, and enough fluids.");
  }

  return suggestions;
}

function buildLifestyleSuggestions(parameters) {
  const suggestions = [
    "Sleep adequately, stay hydrated, and avoid smoking or alcohol excess before future blood tests.",
  ];

  if (parameters.some((parameter) => ["glucose", "cholesterol"].includes(parameter.slug) && parameter.status !== "normal")) {
    suggestions.push("Aim for regular physical activity such as brisk walking for at least 30 minutes on most days.");
  }

  if (parameters.some((parameter) => parameter.slug === "wbc" && parameter.status === "high")) {
    suggestions.push("If you also have fever, cough, or pain, seek medical review instead of self-treating repeatedly.");
  }

  return suggestions;
}

function buildPrecautions(parameters) {
  const precautions = [
    "Do not make medication changes based only on this summary.",
  ];

  if (parameters.some((parameter) => parameter.slug === "platelets" && parameter.status === "low")) {
    precautions.push("Low platelets can increase bleeding risk; avoid trauma and get urgent care for unusual bleeding.");
  }

  if (parameters.some((parameter) => parameter.slug === "glucose" && parameter.status === "high")) {
    precautions.push("If this was a fasting sample, repeat or confirm testing with a clinician is advisable.");
  }

  if (parameters.some((parameter) => parameter.slug === "hemoglobin" && parameter.status === "low")) {
    precautions.push("Low hemoglobin can make blood donation unsafe until corrected and reassessed.");
  }

  return precautions;
}

function evaluateDonationEligibility(parameters) {
  const reasons = [];
  const hemoglobin = parameters.find((parameter) => parameter.slug === "hemoglobin");
  const wbc = parameters.find((parameter) => parameter.slug === "wbc");
  const platelets = parameters.find((parameter) => parameter.slug === "platelets");
  const glucose = parameters.find((parameter) => parameter.slug === "glucose");

  if (hemoglobin && hemoglobin.value < 12.5) {
    reasons.push("Hemoglobin appears below the usual minimum donation threshold of 12.5 g/dL.");
  }

  if (wbc && wbc.status === "high") {
    reasons.push("High WBC can suggest infection or inflammation, so donation should usually wait.");
  }

  if (platelets && platelets.status === "low") {
    reasons.push("Low platelets should be reviewed before blood donation.");
  }

  if (glucose && glucose.status === "high") {
    reasons.push("Glucose is above the common fasting reference range and should be stabilized or reviewed first.");
  }

  if (reasons.length === 0 && parameters.some((parameter) => parameter.status !== "normal")) {
    return {
      status: "needs_review",
      label: "Needs medical review before donation",
      reasons: ["Some values are outside common reference ranges and should be reviewed before donation."],
      nextStep: "Share the report with a clinician or donation center before booking a donation.",
    };
  }

  if (reasons.length > 0) {
    return {
      status: "not_eligible",
      label: "Not currently suitable for donation",
      reasons,
      nextStep: "Correct the abnormal values and get medical clearance before donating.",
    };
  }

  return {
    status: "eligible",
    label: "Likely eligible based on extracted values",
    reasons: ["No major red flags were found in the extracted markers, but final screening still happens at the donation center."],
    nextStep: "Proceed with standard donor screening, hydration, and rest before donation.",
  };
}

function buildSummary(parameters) {
  const abnormal = parameters.filter((parameter) => parameter.status !== "normal");
  if (abnormal.length === 0) {
    return "The major extracted blood parameters are within common adult reference ranges.";
  }

  const labels = abnormal.map((parameter) => `${parameter.name} (${parameter.status})`);
  return `The report shows ${labels.join(", ")} outside the usual reference range and should be reviewed in clinical context.`;
}

function detectLabName(text) {
  const lines = normalizeText(text).split("\n").map((line) => line.trim()).filter(Boolean);
  return lines.find((line) => /lab|diagnostic|pathology|hospital/i.test(line)) || "";
}

function detectTestDate(text) {
  const match = normalizeText(text).match(/(?:date|reported on|collected on)\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
  if (!match) return null;
  const parts = match[1].split(/[\/\-]/).map(Number);
  if (parts.length !== 3) return null;
  const [day, month, yearRaw] = parts;
  const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function callAiGateway(messages, responseFormat) {
  const apiKey = process.env.REDDROP_API_KEY;
  if (!apiKey) {
    throw new Error("REDDROP_API_KEY is not configured");
  }

  const response = await fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ANALYZER_MODEL,
      messages,
      temperature: 0.2,
      response_format: responseFormat,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI gateway failed with ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "";
}

async function extractTextWithAi({ fileName, mimeType, fileDataUrl }) {
  const content = [
    {
      type: "text",
      text:
        "Extract only the plain text from this blood or lab report. Preserve test names, numeric values, units, reference ranges, dates, and headings. Do not summarize. Do not explain. Return text only.",
    },
  ];

  if (mimeType.startsWith("image/")) {
    content.push({ type: "image_url", image_url: { url: fileDataUrl } });
  } else {
    content.push({ type: "text", text: `File name: ${fileName}\nFile type: ${mimeType}\nEmbedded file data follows.` });
    content.push({ type: "text", text: fileDataUrl.slice(0, 120000) });
  }

  const result = await callAiGateway([{ role: "user", content }]);
  return normalizeText(result);
}

function extractParametersFromText(text) {
  return PARAMETER_DEFINITIONS.map((definition) => {
    const found = findParameterValue(text, definition);
    if (!found) return null;

    const status = definition.compare(found.value, found.unit);
    const display = definition.displayValue ? definition.displayValue(found.value, found.unit) : { value: found.value, unit: found.unit || definition.units[0] || "" };

    return {
      name: definition.label,
      slug: definition.slug,
      value: Number(display.value),
      unit: display.unit || found.unit || "",
      referenceRange: definition.referenceRange,
      status,
      explanation: definition.explanation[status] || "This value should be interpreted with the rest of the report.",
      confidence: found.confidence,
    };
  }).filter(Boolean);
}

async function maybeGenerateAiInterpretation({ extractedText, parameters, donationEligibility, userProfile }) {
  if (!process.env.REDDROP_API_KEY) {
    return null;
  }

  const parameterSummary = parameters
    .map((parameter) => `${parameter.name}: ${formatNumber(parameter.value)} ${parameter.unit} (${parameter.status}), reference ${parameter.referenceRange}`)
    .join("\n");

  const content = await callAiGateway(
    [
      {
        role: "system",
        content:
          "You are a cautious blood report interpreter. Use only the extracted report values and user context provided. Do not invent missing parameters. Do not diagnose. Do not overstate certainty. Keep advice practical and concise. Return strict JSON with keys summary, insights, dietSuggestions, lifestyleSuggestions, precautions, donationEligibility. donationEligibility must contain only label, reasons, and nextStep.",
      },
      {
        role: "user",
        content: `User context:
Age: ${userProfile?.age || "unknown"}
Blood group: ${userProfile?.bloodGroup || "unknown"}

Extracted report text:
${extractedText.slice(0, 12000)}

Structured parameters:
${parameterSummary}

Deterministic donation eligibility:
${JSON.stringify(donationEligibility)}

Instructions:
- Base the summary on the structured parameters first.
- Mention only abnormalities or notable normal findings that are actually present.
- Keep each item short and readable for a non-doctor.
- If a rule may vary by blood bank, say so briefly.
- If the report suggests donation should wait, make that clear without sounding alarming.`,
      },
    ],
    { type: "json_object" }
  );

  try {
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

async function analyzeBloodReport({ fileName, mimeType, fileDataUrl, reportText, userProfile }) {
  if (!fileName || !mimeType) {
    throw new Error("fileName and mimeType are required");
  }

  let extractedText = normalizeText(reportText);
  let extractionMethod = reportText ? "manual_text" : "heuristic_pdf";

  if (!extractedText && fileDataUrl) {
    const { buffer } = parseDataUrl(fileDataUrl);

    if (mimeType === "application/pdf") {
      extractedText = extractTextFromPdfBuffer(buffer);
      extractionMethod = "pdf_parser";
    }

    if (!extractedText && process.env.REDDROP_API_KEY) {
      extractedText = await extractTextWithAi({ fileName, mimeType, fileDataUrl });
      extractionMethod =
        mimeType.startsWith("image/")
          ? "ai_ocr"
          : extractionMethod === "pdf_parser"
            ? "pdf_parser_ai_fallback"
            : "ai_ocr";
    }
  }

  if (!extractedText) {
    if (mimeType.startsWith("image/")) {
      throw new Error("Image analysis needs OCR. Paste the report text manually or configure REDDROP_API_KEY for AI OCR.");
    }

    throw new Error("Could not extract report text. For scanned or image-only PDFs, configure REDDROP_API_KEY or paste report text manually.");
  }

  const parameters = extractParametersFromText(extractedText);
  if (parameters.length === 0) {
    throw new Error("No supported blood parameters could be extracted from the uploaded report.");
  }

  const localDonationEligibility = evaluateDonationEligibility(parameters);
  const localResult = {
    extractionMethod,
    extractedText,
    labName: detectLabName(extractedText),
    testDate: detectTestDate(extractedText),
    summary: buildSummary(parameters),
    parameters,
    insights: buildLocalInsights(parameters),
    dietSuggestions: buildDietSuggestions(parameters),
    lifestyleSuggestions: buildLifestyleSuggestions(parameters),
    precautions: buildPrecautions(parameters),
    donationEligibility: localDonationEligibility,
    disclaimer: DISCLAIMER,
  };

  const aiInterpretation = await maybeGenerateAiInterpretation({
    extractedText,
    parameters,
    donationEligibility: localDonationEligibility,
    userProfile,
  }).catch(() => null);

  if (!aiInterpretation) {
    return localResult;
  }

  return {
    ...localResult,
    summary: typeof aiInterpretation.summary === "string" && aiInterpretation.summary.trim() ? aiInterpretation.summary.trim() : localResult.summary,
    insights: Array.isArray(aiInterpretation.insights) && aiInterpretation.insights.length > 0 ? aiInterpretation.insights.slice(0, 5) : localResult.insights,
    dietSuggestions:
      Array.isArray(aiInterpretation.dietSuggestions) && aiInterpretation.dietSuggestions.length > 0
        ? aiInterpretation.dietSuggestions.slice(0, 5)
        : localResult.dietSuggestions,
    lifestyleSuggestions:
      Array.isArray(aiInterpretation.lifestyleSuggestions) && aiInterpretation.lifestyleSuggestions.length > 0
        ? aiInterpretation.lifestyleSuggestions.slice(0, 5)
        : localResult.lifestyleSuggestions,
    precautions:
      Array.isArray(aiInterpretation.precautions) && aiInterpretation.precautions.length > 0
        ? aiInterpretation.precautions.slice(0, 5)
        : localResult.precautions,
    donationEligibility: {
      ...localResult.donationEligibility,
      ...(aiInterpretation.donationEligibility || {}),
      reasons:
        Array.isArray(aiInterpretation?.donationEligibility?.reasons) && aiInterpretation.donationEligibility.reasons.length > 0
          ? aiInterpretation.donationEligibility.reasons.slice(0, 4)
          : localResult.donationEligibility.reasons,
    },
  };
}

module.exports = {
  analyzeBloodReport,
};
