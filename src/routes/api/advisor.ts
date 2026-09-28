import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      }),
    )
    .max(30),
  snapshot: z.string().max(12000),
});

export const Route = createFileRoute("/api/advisor")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = bodySchema.safeParse(await request.json());
        if (!parsed.success) {
          return new Response("Invalid request", { status: 400 });
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return new Response("The advisor is not configured yet.", { status: 401 });
        }

        const system = [
          "You are 'Attendance Advisor', an assistant inside The Core Calculator, a student attendance planner.",
          "You are given a JSON snapshot of the student's real dashboard data, already computed by the app's maths engine.",
          "Rules:",
          "- NEVER invent attendance numbers. Only use values present in the snapshot.",
          "- If a needed value is missing, ask the student for it instead of guessing.",
          "- Be concise (max ~120 words), concrete and encouraging, never insulting.",
          "- Percentages to one decimal place, class counts as whole numbers.",
          "- Warn clearly when an action drops a subject below the minimum requirement or makes recovery impossible.",
          "- Use short lines and plain language; no markdown tables.",
          "",
          "DASHBOARD SNAPSHOT (JSON):",
          parsed.data.snapshot,
        ].join("\n");

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: JSON.stringify({
            model: "openai/gpt-6-astra",
            stream: true,
            store: false,
            reasoning: { effort: "low", summary: "auto" },
            include: ["reasoning.encrypted_content"],
            input: [
              { role: "system", content: system },
              ...parsed.data.messages.map((m) => ({ role: m.role, content: m.content })),
            ],
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const detail = await upstream.text().catch(() => "");
          const message =
            upstream.status === 429
              ? "The advisor is busy right now. Please try again in a moment."
              : upstream.status === 402
                ? "The advisor is out of AI credits. Add credits to keep chatting."
                : `The advisor could not answer (${upstream.status}). ${detail.slice(0, 200)}`;
          return new Response(message, { status: upstream.status || 500 });
        }

        return new Response(upstream.body, {
          status: 200,
          headers: {
            "content-type": "text/event-stream; charset=utf-8",
            "cache-control": "no-cache, no-transform",
          },
        });
      },
    },
  },
});
