// 6-color palette for recipient differentiation in the editor.
// Bottle green is slot 1 so single-signer envelopes match the brand.
// Cycles via modulo if there are more than 6 signers.
export const RECIPIENT_COLORS = [
  "#1E5128", // Bottle green (brand)
  "#B45309", // Deep amber
  "#475569", // Slate blue
  "#9F1239", // Burgundy
  "#0F766E", // Teal
  "#6B21A8", // Plum
];

// Assign a stable color based on the signer's position among signer-type
// recipients. CC recipients are filtered upstream and don't get colors.
export function colorForSignerIndex(idx) {
  return RECIPIENT_COLORS[idx % RECIPIENT_COLORS.length];
}
