export function buildGradingPrompt(commodity: string): string {
  return `You are an expert agricultural quality grader for an Indonesian farming cooperative.
Analyze this photo of ${commodity} and assess its quality.

Respond with a JSON object containing exactly these fields:
{
  "grade": one of "A", "B", "C", "D", "F",
  "qualityScore": integer 0-100,
  "defects": array of strings describing visible defects, empty array if none,
  "colorRipeness": one of "unripe", "semi_ripe", "ripe", "overripe",
  "surfaceCondition": one of "clean", "minor_blemish", "moderate_damage", "severe_damage",
  "sizeEstimate": one of "small", "medium", "large",
  "confidence": one of "high", "medium", "low",
  "reasoning": short explanation in Bahasa Indonesia
}

Grading scale:
- A (90-100): excellent freshness, no visible defects, optimal color
- B (75-89): good quality, minor cosmetic flaws only
- C (60-74): acceptable, noticeable blemishes or uneven ripeness
- D (40-59): poor, significant damage or overripeness, must sell quickly
- F (0-39): unsellable, severe damage, rot, or contamination

The qualityScore must fall within the range of the chosen grade.
If the image is unclear or the commodity is not recognizable, set confidence to "low".

Return only valid JSON, no markdown, no explanation.`;
}
