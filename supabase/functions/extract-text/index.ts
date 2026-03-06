import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function chunkText(text: string, chunkSize = 800, overlap = 100): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 20) chunks.push(chunk);
    start += chunkSize - overlap;
  }
  return chunks;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { file_url, title, file_type, file_size } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download the file
    const fileResponse = await fetch(file_url);
    const fileBuffer = await fileResponse.arrayBuffer();
    const textDecoder = new TextDecoder("utf-8");

    let extractedText = "";

    if (file_type === "text/plain" || file_type === "txt") {
      extractedText = textDecoder.decode(fileBuffer);
    } else {
      // For PDF and DOCX, extract raw text (basic extraction)
      const rawText = textDecoder.decode(fileBuffer);
      extractedText = rawText.replace(/[^\x20-\x7E\xC0-\xFF\n\r\t àâäéèêëïîôùûüÿçœæÀÂÄÉÈÊËÏÎÔÙÛÜŸÇŒÆ]/g, ' ')
        .replace(/\s{3,}/g, '\n')
        .trim();
      
      if (extractedText.length < 50) {
        extractedText = `[Document ${title} - Le contenu binaire n'a pas pu être entièrement extrait. Type: ${file_type}]`;
      }
    }

    // Use AI to clean/summarize extracted text if it's long
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (LOVABLE_API_KEY && extractedText.length > 100) {
      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              { role: "system", content: "Tu reçois du texte brut extrait d'un document. Nettoie-le et restructure-le de manière lisible en français. Garde tout le contenu important. Ne résume pas, garde le maximum de détails. Retourne uniquement le texte nettoyé." },
              { role: "user", content: extractedText.substring(0, 10000) }
            ],
          }),
        });
        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const cleaned = aiData.choices?.[0]?.message?.content;
          if (cleaned) extractedText = cleaned;
        }
      } catch { /* keep raw text */ }
    }

    const fullContent = extractedText.substring(0, 50000);

    // Save to documents table
    const { data, error } = await supabase.from("documents").insert({
      title,
      content: fullContent,
      file_url,
      file_type,
      file_size,
      status: "indexé",
      category: "general",
    }).select().single();

    if (error) throw error;

    // Create chunks for RAG search
    const chunks = chunkText(fullContent);
    if (chunks.length > 0) {
      const chunkRows = chunks.map((content, i) => ({
        document_id: data.id,
        content,
        chunk_index: i,
      }));
      const { error: chunkError } = await supabase.from("document_chunks").insert(chunkRows);
      if (chunkError) console.error("Chunk insert error:", chunkError);
    }

    return new Response(JSON.stringify({ success: true, document: data, chunks_created: chunks.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-text error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
