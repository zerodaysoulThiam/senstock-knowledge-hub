import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-2.5-flash";
const MAX_CONTEXT_CHUNKS = 10;

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(20000),
});

const BodySchema = z.object({
  messages: z.array(MessageSchema).min(1).max(50),
});

const normalizeText = (value: string) =>
  value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const extractSearchTerms = (value: string) => {
  const stopWords = new Set(["les", "des", "une", "pour", "dans", "avec", "sur", "par", "que", "qui", "est", "sont", "fait", "faire", "comment", "quel", "quelle", "quels", "quelles", "cette", "ces"]);
  return normalizeText(value)
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));
};

const scoreText = (value: string, searchTerms: string[]) => {
  const normalized = normalizeText(value);
  let score = 0;
  for (const term of searchTerms) {
    const regex = new RegExp(term, "g");
    const matches = normalized.match(regex);
    if (matches) score += matches.length;
  }
  // Bonus for exact phrase match
  const fullQuery = searchTerms.join(" ");
  if (fullQuery.length > 5 && normalized.includes(fullQuery)) score += 5;
  return score;
};

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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract search context from last 3 user messages for better relevance
    const recentUserMessages = messages
      .filter((m) => m.role === "user")
      .slice(-3)
      .map((m) => m.content);
    const lastUserMessage = recentUserMessages[recentUserMessages.length - 1] || "";
    const combinedContext = recentUserMessages.join(" ");
    const searchTerms = extractSearchTerms(combinedContext);

    let contextText = "";
    let sourcesFound = false;

    // Search document chunks
    const { data: chunks } = await supabase
      .from("document_chunks")
      .select("content, chunk_index, document_id")
      .limit(1000);

    if (chunks && chunks.length > 0) {
      const docIds = [...new Set(chunks.map((c) => c.document_id))];
      const { data: docs } = await supabase
        .from("documents")
        .select("id, title, category")
        .in("id", docIds);

      const docMap = new Map((docs || []).map((d) => [d.id, { title: d.title, category: d.category }]));

      const rankedChunks = chunks
        .map((chunk) => {
          const doc = docMap.get(chunk.document_id) || { title: "Document inconnu", category: null };
          const titleScore = scoreText(doc.title, searchTerms) * 3;
          const contentScore = scoreText(chunk.content, searchTerms);
          const categoryScore = doc.category ? scoreText(doc.category, searchTerms) * 2 : 0;
          return {
            ...chunk,
            docTitle: doc.title,
            category: doc.category,
            score: titleScore + contentScore + categoryScore,
          };
        })
        .sort((a, b) => b.score - a.score || a.chunk_index - b.chunk_index);

      const selectedChunks = (searchTerms.length > 0
        ? rankedChunks.filter((c) => c.score > 0)
        : rankedChunks
      ).slice(0, MAX_CONTEXT_CHUNKS);

      if (selectedChunks.length > 0) {
        sourcesFound = true;
        contextText = selectedChunks.map((c) =>
          `[Source: ${c.docTitle}${c.category ? ` | Catégorie: ${c.category}` : ""}, Passage ${c.chunk_index + 1}]\n${c.content}`
        ).join("\n\n---\n\n");
      }
    }

    // Fallback: search full documents
    if (!contextText) {
      const { data: docs } = await supabase
        .from("documents")
        .select("title, content, category")
        .not("content", "is", null)
        .limit(20);

      if (docs && docs.length > 0) {
        const scoredDocs = docs
          .map((doc) => ({
            ...doc,
            score: scoreText(`${doc.title} ${doc.category || ""} ${doc.content || ""}`, searchTerms),
          }))
          .filter((doc) => searchTerms.length === 0 || doc.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);

        if (scoredDocs.length > 0) {
          sourcesFound = true;
          contextText = scoredDocs
            .map((doc) => `[Source: ${doc.title}${doc.category ? ` | Catégorie: ${doc.category}` : ""}]\n${doc.content?.substring(0, 4000)}`)
            .join("\n\n---\n\n");
        }
      }
    }

    // Build available documents list for context awareness
    let docListText = "";
    const { data: allDocs } = await supabase
      .from("documents")
      .select("title, category")
      .limit(50);
    if (allDocs && allDocs.length > 0) {
      docListText = "\n\nDOCUMENTS DISPONIBLES DANS LA BASE :\n" +
        allDocs.map((d) => `- ${d.title}${d.category ? ` (${d.category})` : ""}`).join("\n");
    }

    const systemPrompt = `Tu es SenStock AI Brain, l'assistant intelligent de SenStock, le plus grand dépôt de stockage d'hydrocarbures au Sénégal (284 millions de litres de capacité).

CAPACITÉS :
1. **Documents internes** : Tu as accès à la base documentaire de SenStock et tu t'en sers en PRIORITÉ.
2. **Connaissances générales** : Tu disposes de vastes connaissances sur l'industrie pétrolière, la logistique des hydrocarbures, les normes de sécurité (HSE), la réglementation sénégalaise et internationale, les meilleures pratiques industrielles, et bien plus.

RÈGLES DE RÉPONSE :
1. Réponds TOUJOURS en français, de manière professionnelle, précise et détaillée.
2. **Priorité absolue aux documents internes** : Si l'information existe dans les documents fournis, cite-la avec le format exact [Source: nom_du_document, Passage X].
3. Si plusieurs documents/passages sont pertinents, cite-les TOUS.
4. **Complément avec connaissances générales** : Si les documents internes ne couvrent pas entièrement la question, complète avec tes connaissances en ajoutant clairement :
   "📚 **Complément (connaissances générales)** :" avant la section basée sur tes connaissances.
5. Ne fabrique JAMAIS d'informations spécifiques à SenStock. Pour les données internes non trouvées, dis-le clairement.
6. Si tu trouves des numéros de page ([Page X]) dans le texte, cite aussi la page.
7. Fournis des réponses COMPLÈTES et DÉTAILLÉES avec des exemples concrets quand possible.
8. Structure tes réponses avec des titres, listes et mise en forme markdown.
9. Pour les questions techniques (sécurité, normes, procédures industrielles), fournis des réponses exhaustives en combinant sources internes ET connaissances.
10. Tu peux répondre à TOUT type de question : opérations, sécurité, réglementation, formation, RH, logistique, maintenance, environnement, etc.

DOMAINES D'EXPERTISE :
- Stockage et distribution d'hydrocarbures
- Sécurité industrielle et HSE (ATEX, SEVESO, normes API, NFPA)
- Logistique pétrolière (réception, stockage, expédition)
- Réglementation sénégalaise et UEMOA sur les hydrocarbures
- Maintenance des équipements pétroliers
- Protection de l'environnement et gestion des déversements
- Gestion des ressources humaines dans l'industrie
- Formation et développement des compétences
${docListText}

${contextText
  ? `--- DOCUMENTS INTERNES DE SENSTOCK ---\n${contextText}\n--- FIN DES DOCUMENTS ---`
  : "⚠️ Aucun document interne pertinent trouvé pour cette question. Réponds avec tes connaissances générales en le précisant clairement avec le marqueur 📚."}`;

    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte. Réessayez dans quelques secondes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "10" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés. Contactez l'administrateur." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
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
