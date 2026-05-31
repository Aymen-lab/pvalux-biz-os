import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  tone: z.enum(["friendly", "firm", "final"]),
  language: z.enum(["fr", "ar", "ar_tn", "en"]),
  kind: z.enum(["invoice", "quote"]).default("invoice"),
  customerName: z.string().min(1).max(200),
  invoiceNumber: z.string().min(1).max(100),
  amount: z.number(),
  dueDate: z.string().nullable().optional(),
  daysOverdue: z.number().nullable().optional(),
  partialPaid: z.number().nullable().optional(),
  history: z
    .array(z.object({ date: z.string(), status: z.string(), note: z.string().nullable().optional() }))
    .max(10)
    .optional(),
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

    const context: string[] = [];
    context.push(`Customer: ${data.customerName}`);
    if (data.kind === "quote") {
      context.push(`Quote reference: ${data.invoiceNumber}`);
      context.push(`Quote total: ${data.amount} TND`);
      context.push(`Sent on: ${data.dueDate ?? "unspecified"}`);
    } else {
      context.push(`Invoice: ${data.invoiceNumber}`);
      context.push(`Outstanding amount: ${data.amount} TND`);
      context.push(`Due date: ${data.dueDate ?? "unspecified"}`);
      if (data.daysOverdue != null) context.push(`Days overdue: ${data.daysOverdue}`);
      if (data.partialPaid && data.partialPaid > 0) context.push(`Already paid: ${data.partialPaid} TND (partial payment received)`);
    }
    if (data.history?.length) {
      context.push(`Previous follow-up history (most recent first):`);
      for (const h of data.history) context.push(`- ${h.date} — ${h.status}${h.note ? `: ${h.note}` : ""}`);
    }

    const goal = data.kind === "quote"
      ? "politely follow up on a quote that was sent but not yet accepted, and invite the customer to confirm or share feedback"
      : "request payment of the outstanding invoice";

    const prompt = `Write a short WhatsApp message in ${LANG[data.language]} for an aluminum/PVC workshop in Tunisia. Goal: ${goal}. Tone: ${TONE[data.tone]}.

${context.join("\n")}

Acknowledge any partial payment if mentioned. Reference prior contact briefly if history is provided. Keep it under 4 short lines. Use line breaks. Do NOT include greetings like "Subject:" or any preamble — output only the message text itself, ready to send.`;

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
