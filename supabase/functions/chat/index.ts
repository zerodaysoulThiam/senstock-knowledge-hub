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

    // Search documents for context
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";
    
    // Simple keyword search in documents
    const searchTerms = lastUserMessage.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
    
    let contextText = "";
    if (searchTerms.length > 0) {
      // Search documents by content using ilike for each term
      const { data: docs } = await supabase
        .from("documents")
        .select("title, content")
        .not("content", "is", null)
        .limit(10);

      if (docs && docs.length > 0) {
        // Score documents by keyword matches
        const scored = docs.map((doc: any) => {
          const text = `${doc.title} ${doc.content}`.toLowerCase();
          const score = searchTerms.reduce((s: number, term: string) => s + (text.includes(term) ? 1 : 0), 0);
          return { ...doc, score };
        }).filter((d: any) => d.score > 0).sort((a: any, b: any) => b.score - a.score).slice(0, 3);

        if (scored.length > 0) {
          contextText = scored.map((d: any) => `Document: ${d.title}\n${d.content?.substring(0, 2000)}`).join("\n\n---\n\n");
        }
      }
    }

    const systemPrompt = `Tu es SenStock AI Brain, l'assistant intelligent de SenStock, le plus grand dépôt de stockage d'hydrocarbures au Sénégal (284 millions de litres de capacité).

Tu réponds UNIQUEMENT en te basant sur les documents internes de l'entreprise fournis ci-dessous. Si aucun document pertinent n'est trouvé, indique clairement que tu n'as pas trouvé d'information dans la base documentaire et suggère de téléverser les documents pertinents.

Réponds en français, de manière professionnelle et concise. Cite les sources (noms des documents) quand possible.

${contextText ? `--- DOCUMENTS INTERNES ---\n${contextText}\n--- FIN DOCUMENTS ---` : "Aucun document interne trouvé pour cette question."}`;

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
