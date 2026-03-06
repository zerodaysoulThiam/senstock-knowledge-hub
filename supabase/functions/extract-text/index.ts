import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function chunkText(text: string, chunkSize = 800, overlap = 100): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\s*\n/);
  let currentChunk = "";

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (currentChunk.length + trimmed.length + 1 > chunkSize && currentChunk.length > 50) {
      chunks.push(currentChunk.trim());
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = overlapText + " " + trimmed;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + trimmed;
    }
  }

  if (currentChunk.trim().length > 20) {
    chunks.push(currentChunk.trim());
  }

  if (chunks.length === 0 && text.length > 50) {
    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const chunk = text.slice(start, end).trim();
      if (chunk.length > 20) chunks.push(chunk);
      start += chunkSize - overlap;
    }
  }

  return chunks;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { file_url, title, file_type, file_size } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download the file
    const fileResponse = await fetch(file_url);
    const fileBuffer = await fileResponse.arrayBuffer();
    const uint8Array = new Uint8Array(fileBuffer);

    let extractedText = "";
    const isTxt = file_type === "text/plain" || file_type === "txt" || title.endsWith(".txt");

    if (isTxt) {
      extractedText = new TextDecoder("utf-8").decode(uint8Array);
    } else if (LOVABLE_API_KEY) {
      // Use safe base64 encoding for large files (no spread operator limit)
      const base64Content = base64Encode(uint8Array);

      const isPdf = file_type === "application/pdf" || file_type === "pdf" || title.endsWith(".pdf");
      const mimeType = isPdf
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

      console.log(`Extracting text from ${title} (${mimeType}, ${uint8Array.length} bytes)...`);

      // Use image_url format with data URI - this is the correct way to send
      // documents through the OpenAI-compatible gateway for Gemini models
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${base64Content}`,
                  },
                },
                {
                  type: "text",
                  text: `Extrais INTÉGRALEMENT tout le texte contenu dans ce document "${title}".

INSTRUCTIONS OBLIGATOIRES :
- Extrais TOUT le texte réel du document, page par page.
- Indique [Page X] au début de chaque page.
- Conserve la structure : titres, sous-titres, paragraphes, listes à puces, tableaux.
- Pour les tableaux, formate avec des | pour séparer les colonnes.
- Si le document est scanné, effectue l'OCR pour extraire le texte des images.
- NE RÉSUME JAMAIS. Retourne le texte COMPLET et INTÉGRAL.
- NE DÉCRIS PAS le document. NE PARLE PAS de la structure PDF interne.
- NE MENTIONNE PAS les métadonnées, les polices, les objets PDF, les flux de contenu.
- Retourne UNIQUEMENT le texte que lirait un humain en ouvrant ce document.
- Si une page est vide, écris [Page X - vide].`,
                },
              ],
            },
          ],
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content;
        if (content && content.length > 50) {
          extractedText = content;
          console.log(`Extracted ${extractedText.length} characters from ${title}`);
        } else {
          console.error("AI extraction returned insufficient content:", content?.substring(0, 200));
        }
      } else {
        const errText = await aiResponse.text();
        console.error("AI extraction failed:", aiResponse.status, errText);
      }
    }

    // Fallback: basic text extraction if AI failed
    if (extractedText.length < 50) {
      const rawText = new TextDecoder("utf-8").decode(uint8Array);
      extractedText = rawText
        .replace(/[^\x20-\x7E\xC0-\xFF\n\r\t àâäéèêëïîôùûüÿçœæÀÂÄÉÈÊËÏÎÔÙÛÜŸÇŒÆ]/g, " ")
        .replace(/\s{3,}/g, "\n")
        .trim();

      if (extractedText.length < 50) {
        extractedText = `[Document ${title} - Le contenu n'a pas pu être extrait. Type: ${file_type}.]`;
      }
    }

    const fullContent = extractedText.substring(0, 100000);

    // Save to documents table
    const { data, error } = await supabase
      .from("documents")
      .insert({
        title,
        content: fullContent,
        file_url,
        file_type,
        file_size,
        status: "indexé",
        category: "general",
      })
      .select()
      .single();

    if (error) throw error;

    // Create chunks for RAG search
    const chunks = chunkText(fullContent);
    if (chunks.length > 0) {
      const chunkRows = chunks.map((content, i) => ({
        document_id: data.id,
        content,
        chunk_index: i,
      }));
      
      for (let i = 0; i < chunkRows.length; i += 50) {
        const batch = chunkRows.slice(i, i + 50);
        const { error: chunkError } = await supabase.from("document_chunks").insert(batch);
        if (chunkError) console.error("Chunk insert error:", chunkError);
      }
    }

    console.log(`Document "${title}" indexed: ${fullContent.length} chars, ${chunks.length} chunks`);

    return new Response(
      JSON.stringify({
        success: true,
        document: data,
        chunks_created: chunks.length,
        text_length: fullContent.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("extract-text error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur d'extraction" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
