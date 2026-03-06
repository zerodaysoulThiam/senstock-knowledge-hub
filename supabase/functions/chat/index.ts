import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";

    // Fetch all chunks with document titles
    const { data: chunks } = await supabase
      .from("document_chunks")
      .select("content, chunk_index, document_id")
      .limit(200);

    let contextText = "";

    if (chunks && chunks.length > 0) {
      // Get document titles
      const docIds = [...new Set(chunks.map((c: any) => c.document_id))];
      const { data: docs } = await supabase
        .from("documents")
        .select("id, title")
        .in("id", docIds);
      const docMap = new Map((docs || []).map((d: any) => [d.id, d.title]));

      // Annotate chunks with doc titles
      const annotatedChunks = chunks.map((c: any, i: number) => ({
        ...c,
        docTitle: docMap.get(c.document_id) || "Document inconnu",
        idx: i,
      }));

      // Use LLM to semantically rerank chunks
      const chunkSummaries = annotatedChunks.map((c: any) =>
        `[${c.idx}] (${c.docTitle}, Passage ${c.chunk_index + 1}): ${c.content.substring(0, 200)}`
      ).join("\n");

      try {
        const rerankResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content: `Tu es un moteur de recherche sémantique. On te donne une question et une liste de passages de documents. Retourne UNIQUEMENT les indices (numéros entre crochets) des 5 passages les plus pertinents pour répondre à la question, du plus au moins pertinent. Format: un indice par ligne, juste le nombre. Si aucun passage n'est pertinent, écris "AUCUN".`
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
            // Extract indices from response
            const indices = rerankText.match(/\d+/g)?.map(Number).filter((n: number) => n < annotatedChunks.length).slice(0, 5) || [];

            if (indices.length > 0) {
              contextText = indices.map((idx: number) => {
                const c = annotatedChunks[idx];
                return `[Source: ${c.docTitle}, Passage ${c.chunk_index + 1}]\n${c.content}`;
              }).join("\n\n---\n\n");
            }
          }
        }
      } catch (e) {
        console.error("Rerank error, falling back to keyword search:", e);
      }

      // Fallback: keyword search if reranking failed
      if (!contextText) {
        const searchTerms = lastUserMessage.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
        if (searchTerms.length > 0) {
          const scored = annotatedChunks.map((c: any) => {
            const text = c.content.toLowerCase();
            const score = searchTerms.reduce((s: number, term: string) => s + (text.includes(term) ? 1 : 0), 0);
            return { ...c, score };
          }).filter((c: any) => c.score > 0)
            .sort((a: any, b: any) => b.score - a.score)
            .slice(0, 5);

          if (scored.length > 0) {
            contextText = scored.map((c: any) =>
              `[Source: ${c.docTitle}, Passage ${c.chunk_index + 1}]\n${c.content}`
            ).join("\n\n---\n\n");
          }
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
        const searchTerms = lastUserMessage.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
        const scored = docs.map((doc: any) => {
          const text = `${doc.title} ${doc.content}`.toLowerCase();
          const score = searchTerms.reduce((s: number, term: string) => s + (text.includes(term) ? 1 : 0), 0);
          return { ...doc, score };
        }).filter((d: any) => d.score > 0).sort((a: any, b: any) => b.score - a.score).slice(0, 3);

        if (scored.length > 0) {
          contextText = scored.map((d: any) => `[Source: ${d.title}]\n${d.content?.substring(0, 2000)}`).join("\n\n---\n\n");
        }
      }
    }

    const systemPrompt = `Tu es SenStock AI Brain, l'assistant intelligent de SenStock, le plus grand dépôt de stockage d'hydrocarbures au Sénégal (284 millions de litres de capacité).

Tu réponds UNIQUEMENT en te basant sur les documents internes de l'entreprise fournis ci-dessous. Si aucun document pertinent n'est trouvé, indique clairement que tu n'as pas trouvé d'information dans la base documentaire et suggère de téléverser les documents pertinents.

RÈGLES IMPORTANTES:
- Réponds en français, de manière professionnelle et concise.
- Cite TOUJOURS les sources : mentionne le nom du document et le numéro de passage entre crochets, ex: [Source: nom_document.pdf, Passage 3].
- Si plusieurs documents sont pertinents, cite-les tous.
- Ne fabrique JAMAIS d'informations. Si le contenu ne couvre pas la question, dis-le clairement.

${contextText ? `--- DOCUMENTS INTERNES ---\n${contextText}\n--- FIN DOCUMENTS ---` : "Aucun document interne trouvé pour cette question. Suggère à l'utilisateur de téléverser les documents pertinents dans la section Documents."}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte, veuillez réessayer plus tard." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits insuffisants." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
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
