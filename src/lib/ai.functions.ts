import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  tone: z.enum(["friendly", "firm", "final"]),
  language: z.enum(["fr", "ar", "ar_tn", "en"]),
  customerName: z.string().min(1).max(200),
  invoiceNumber: z.string().min(1).max(100),
  amount: z.number(),
  dueDate: z.string().nullable().optional(),
});

const LANG: Record<string, string> = {
  fr: "French",
  ar: "Modern Standard Arabic",
  ar_tn: "Tunisian Arabic (Derja, using Arabic script)",
  en: "English",
};
const TONE: Record<string, string> = {
  friendly: "warm and friendly",
  firm: "firm and professional",
  final: "very firm — final notice before escalation",
};

export const generateFollowupMessage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI not configured");
    const prompt = `Write a short WhatsApp payment-reminder message in ${LANG[data.language]} for an aluminum/PVC workshop in Tunisia. Tone: ${TONE[data.tone]}.
Customer: ${data.customerName}
Invoice: ${data.invoiceNumber}
Outstanding amount: ${data.amount} TND
Due date: ${data.dueDate ?? "unspecified"}

Keep it under 4 short lines. Use line breaks. Do NOT include greetings like "Subject:" or any preamble — output only the message text itself, ready to send.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: [{ role: "user", content: prompt }] }),
    });
    if (!res.ok) {
      const t = await res.text();
      if (res.status === 429) throw new Error("Trop de requêtes. Réessayez plus tard.");
      if (res.status === 402) throw new Error("Crédits IA épuisés.");
      throw new Error(`AI error: ${t}`);
    }
    const json = await res.json();
    const message = json.choices?.[0]?.message?.content?.trim() ?? "";
    return { message };
  });
