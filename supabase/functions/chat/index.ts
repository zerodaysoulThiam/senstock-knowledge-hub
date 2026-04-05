import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini";
const MAX_CONTEXT_CHUNKS = 6;
const MAX_RETRIES = 2;

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(20000),
});

const BodySchema = z.object({
  messages: z.array(MessageSchema).min(1).max(50),
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const extractSearchTerms = (value: string) =>
  normalizeText(value)
    .split(/\s+/)
    .filter((word) => word.length > 2);

const scoreText = (value: string, searchTerms: string[]) => {
  const normalized = normalizeText(value);
  return searchTerms.reduce((score, term) => score + (normalized.includes(term) ? 1 : 0), 0);
};

async function fetchOpenAIWithRetry(apiKey: string, payload: Record<string, unknown>) {
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok || (response.status !== 429 && response.status < 500)) {
      return response;
    }

    lastResponse = response;

    const retryAfterHeader = response.headers.get("retry-after");
    const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;
    const backoffMs = Number.isFinite(retryAfterSeconds)
      ? retryAfterSeconds * 1000
      : Math.min(1500 * (attempt + 1), 5000);

    const debugText = await response.clone().text().catch(() => "");
    console.warn(`OpenAI temporary error [attempt ${attempt + 1}/${MAX_RETRIES + 1}]`, response.status, debugText);

    if (attempt < MAX_RETRIES) {
      await wait(backoffMs);
    }
  }

  return lastResponse!;
}

async function buildRateLimitResponse(response: Response) {
  const retryAfter = response.headers.get("retry-after") ?? "20";
  const rawText = await response.text();
  const lowerText = rawText.toLowerCase();
  const isQuotaIssue = lowerText.includes("insufficient_quota") || lowerText.includes("quota");

  return new Response(JSON.stringify({
    error: isQuotaIssue
      ? "Quota OpenAI insuffisant. Vérifiez votre facturation ou vos limites OpenAI."
      : "Trop de requêtes envoyées à OpenAI. Réessayez dans quelques secondes.",
  }), {
    status: isQuotaIssue ? 402 : 429,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Retry-After": retryAfter,
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const parsedBody = BodySchema.safeParse(await req.json());

    if (!parsedBody.success) {
      return new Response(JSON.stringify({
        error: "Requête invalide.",
        details: parsedBody.error.flatten(),
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = parsedBody.data;
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content || "";
    const searchTerms = extractSearchTerms(lastUserMessage);
    let contextText = "";

    const { data: chunks } = await supabase
      .from("document_chunks")
      .select("content, chunk_index, document_id")
      .limit(500);

    if (chunks && chunks.length > 0) {
      const docIds = [...new Set(chunks.map((chunk) => chunk.document_id))];
      const { data: docs } = await supabase
        .from("documents")
        .select("id, title")
        .in("id", docIds);

      const docMap = new Map((docs || []).map((doc) => [doc.id, doc.title]));

      const annotatedChunks = chunks.map((chunk) => ({
        ...chunk,
        docTitle: docMap.get(chunk.document_id) || "Document inconnu",
      }));

      const rankedChunks = annotatedChunks
        .map((chunk) => ({
          ...chunk,
          score: scoreText(chunk.docTitle, searchTerms) * 2 + scoreText(chunk.content, searchTerms),
        }))
        .sort((a, b) => b.score - a.score || a.chunk_index - b.chunk_index);

      const selectedChunks = (searchTerms.length > 0
        ? rankedChunks.filter((chunk) => chunk.score > 0)
        : rankedChunks
      ).slice(0, MAX_CONTEXT_CHUNKS);

      if (selectedChunks.length > 0) {
        contextText = selectedChunks.map((chunk) => (
          `[Source: ${chunk.docTitle}, Passage ${chunk.chunk_index + 1}]\n${chunk.content}`
        )).join("\n\n---\n\n");
      }
    }

    if (!contextText) {
      const { data: docs } = await supabase
        .from("documents")
        .select("title, content")
        .not("content", "is", null)
        .limit(10);

      if (docs && docs.length > 0) {
        const scoredDocs = docs
          .map((doc) => ({
            ...doc,
            score: scoreText(`${doc.title} ${doc.content || ""}`, searchTerms),
          }))
          .filter((doc) => searchTerms.length === 0 || doc.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);

        if (scoredDocs.length > 0) {
          contextText = scoredDocs
            .map((doc) => `[Source: ${doc.title}]\n${doc.content?.substring(0, 3000)}`)
            .join("\n\n---\n\n");
        }
      }
    }

    const systemPrompt = `Tu es SenStock AI Brain, l'assistant intelligent de SenStock, le plus grand dépôt de stockage d'hydrocarbures au Sénégal (284 millions de litres de capacité).

Tu réponds en te basant PRIORITAIREMENT sur les documents internes de l'entreprise fournis ci-dessous. Tu as accès au contenu intégral des documents téléversés par l'entreprise.

RÈGLES CRITIQUES :
1. Réponds en français, de manière professionnelle, précise et détaillée.
2. Cite TOUJOURS tes sources internes avec le format exact : [Source: nom_du_document, Passage X].
3. Si plusieurs documents/passages sont pertinents, cite-les TOUS.
4. Ne fabrique JAMAIS d'informations. Si le contenu ne couvre pas la question, dis-le clairement.
5. Base tes réponses PRIORITAIREMENT sur le contenu réel des documents internes.
6. Si tu trouves des numéros de page ([Page X]) dans le texte, cite aussi la page.
7. Fournis des réponses complètes et détaillées, ne résume pas excessivement.
8. Si les documents internes ne contiennent pas la réponse, tu peux utiliser tes connaissances générales pour compléter, en précisant clairement : "⚠️ Information complémentaire (source externe):" avant la partie basée sur tes connaissances.
9. Tu peux aussi répondre à des questions générales sur l'industrie pétrolière, la logistique, la sécurité des hydrocarbures, etc.

${contextText
  ? `--- DOCUMENTS INTERNES DE SENSTOCK ---\n${contextText}\n--- FIN DES DOCUMENTS ---`
  : "⚠️ Aucun document interne trouvé pour cette question. Tu peux répondre avec tes connaissances générales en le précisant clairement."}`;

    const response = await fetchOpenAIWithRetry(OPENAI_API_KEY, {
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
    });

    if (!response.ok) {
      if (response.status === 429) {
        return await buildRateLimitResponse(response);
      }

      if (response.status === 401) {
        return new Response(JSON.stringify({ error: "Clé OpenAI invalide ou expirée." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits OpenAI insuffisants." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
