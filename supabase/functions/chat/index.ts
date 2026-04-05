import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";

    // Fetch all chunks with document info
    const { data: chunks } = await supabase
      .from("document_chunks")
      .select("content, chunk_index, document_id")
      .limit(500);

    let contextText = "";

    if (chunks && chunks.length > 0) {
      const docIds = [...new Set(chunks.map((c: any) => c.document_id))];
      const { data: docs } = await supabase
        .from("documents")
        .select("id, title")
        .in("id", docIds);
      const docMap = new Map((docs || []).map((d: any) => [d.id, d.title]));

      const annotatedChunks = chunks.map((c: any, i: number) => ({
        ...c,
        docTitle: docMap.get(c.document_id) || "Document inconnu",
        idx: i,
      }));

      // Pre-filter with keyword matching
      const searchTerms = lastUserMessage.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
      let candidates = annotatedChunks;

      if (searchTerms.length > 0 && annotatedChunks.length > 30) {
        const scored = annotatedChunks.map((c: any) => {
          const text = (c.content + " " + c.docTitle).toLowerCase();
          const score = searchTerms.reduce((s: number, term: string) => s + (text.includes(term) ? 1 : 0), 0);
          return { ...c, preScore: score };
        });
        candidates = scored.sort((a: any, b: any) => b.preScore - a.preScore).slice(0, 30);
      }

      // Semantic reranking via Lovable AI (cheaper model for reranking)
      const chunkSummaries = candidates.map((c: any, i: number) =>
        `[${i}] (${c.docTitle}, Passage ${c.chunk_index + 1}): ${c.content.substring(0, 300)}`
      ).join("\n");

      try {
        const rerankUrl = OPENAI_URL;
        const rerankAuth = `Bearer ${OPENAI_API_KEY}`;
        const rerankModel = "gpt-4o-mini";

        const rerankResponse = await fetch(rerankUrl, {
          method: "POST",
          headers: {
            Authorization: rerankAuth,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: rerankModel,
            messages: [
              {
                role: "system",
                content: `Tu es un moteur de recherche sémantique expert. On te donne une question et des passages de documents.

INSTRUCTIONS :
- Analyse la SÉMANTIQUE de la question, pas seulement les mots-clés.
- Retourne les indices des 8 passages les plus pertinents pour répondre à la question.
- Classe-les du plus pertinent au moins pertinent.
- Format : un indice par ligne, juste le nombre (ex: 5).
- Si aucun passage n'est pertinent, écris "AUCUN".`
              },
              {
                role: "user",
                content: `Question: ${lastUserMessage}\n\nPassages:\n${chunkSummaries}`
              }
            ],
          }),
        });

        if (rerankResponse.ok) {
          const rerankData = await rerankResponse.json();
          const rerankText = rerankData.choices?.[0]?.message?.content || "";

          if (!rerankText.includes("AUCUN")) {
            const indices = rerankText.match(/\d+/g)
              ?.map(Number)
              .filter((n: number) => n < candidates.length)
              .slice(0, 8) || [];

            if (indices.length > 0) {
              contextText = indices.map((idx: number) => {
                const c = candidates[idx];
                return `[Source: ${c.docTitle}, Passage ${c.chunk_index + 1}]\n${c.content}`;
              }).join("\n\n---\n\n");
            }
          }
        }
      } catch (e) {
        console.error("Rerank error:", e);
      }

      // Fallback: keyword search
      if (!contextText && searchTerms.length > 0) {
        const scored = annotatedChunks.map((c: any) => {
          const text = c.content.toLowerCase();
          const score = searchTerms.reduce((s: number, term: string) => s + (text.includes(term) ? 1 : 0), 0);
          return { ...c, score };
        }).filter((c: any) => c.score > 0)
          .sort((a: any, b: any) => b.score - a.score)
          .slice(0, 8);

        if (scored.length > 0) {
          contextText = scored.map((c: any) =>
            `[Source: ${c.docTitle}, Passage ${c.chunk_index + 1}]\n${c.content}`
          ).join("\n\n---\n\n");
        }
      }
    }

    // Fallback: full documents if no chunks
    if (!contextText) {
      const { data: docs } = await supabase
        .from("documents")
        .select("title, content")
        .not("content", "is", null)
        .limit(10);

      if (docs && docs.length > 0) {
        const searchTerms = lastUserMessage.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
        const scored = docs.map((doc: any) => {
          const text = `${doc.title} ${doc.content}`.toLowerCase();
          const score = searchTerms.reduce((s: number, term: string) => s + (text.includes(term) ? 1 : 0), 0);
          return { ...doc, score };
        }).filter((d: any) => d.score > 0).sort((a: any, b: any) => b.score - a.score).slice(0, 3);

        if (scored.length > 0) {
          contextText = scored.map((d: any) => `[Source: ${d.title}]\n${d.content?.substring(0, 3000)}`).join("\n\n---\n\n");
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

${contextText ? `--- DOCUMENTS INTERNES DE SENSTOCK ---\n${contextText}\n--- FIN DES DOCUMENTS ---` : "⚠️ Aucun document interne trouvé pour cette question. Tu peux répondre avec tes connaissances générales en le précisant clairement."}`;

    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits insuffisants." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("OpenAI API error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
