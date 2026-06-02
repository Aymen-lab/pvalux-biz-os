export function formatTND(n: number | null | undefined) {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(v) + " TND";
}

export function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * @deprecated Document numbers are now issued by the database
 * (generate_document_number RPC) so they are concurrency-safe and per-company.
 * Kept only as a fallback for legacy callers; do NOT use for new quotes or invoices.
 */
export function genNumber(prefix: string) {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
  return `${prefix}-${stamp}`;
}

export const PRODUCT_TYPES: Record<string, string> = {
  fenetres: "Fenêtres",
  portes: "Portes",
  baies_vitrees: "Baies vitrées",
  volet_roulant: "Volet roulant",
  garde_corps: "Garde-corps",
  brise_soleil: "Brise soleil",
  mur_rideau: "Mur rideau",
  autre: "Autre",
};

export const CATEGORIES = ["Cuisine", "Salon", "Chambre", "Salle de bain", "Bureau", "Extérieur"];

export const UNITS: Record<string, string> = { m2: "m²", ml: "ml", piece: "pièce" };

export function lineTotal(width: number, height: number, qty: number, unitPrice: number, unit: string) {
  let base = 1;
  if (unit === "m2") base = (Number(width) || 0) * (Number(height) || 0);
  else if (unit === "ml") base = Number(width) || 0;
  return base * (Number(qty) || 0) * (Number(unitPrice) || 0);
}
