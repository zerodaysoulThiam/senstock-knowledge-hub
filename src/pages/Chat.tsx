import { useState, useRef, useEffect } from "react";
import { Send, Brain, User, Sparkles, Loader2, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const suggestions = [
  "Quelle est la capacité de stockage de SenStock ?",
  "Procédure de réception des camions-citernes ?",
  "Comment traiter une commande urgente ?",
  "Normes de sécurité pour le stockage GPL ?",
];

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isCoolingDown = cooldownUntil !== null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!cooldownUntil) return;

    const remaining = cooldownUntil - Date.now();
    if (remaining <= 0) {
      setCooldownUntil(null);
      return;
    }

    const timeoutId = window.setTimeout(() => setCooldownUntil(null), remaining);
    return () => window.clearTimeout(timeoutId);
  }, [cooldownUntil]);

  useEffect(() => {
    const loadHistory = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoadingHistory(false);
        return;
      }

      setUserId(user.id);

      const { data } = await supabase
        .from("chat_messages")
        .select("role, content")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(100);

      if (data && data.length > 0) {
        setMessages(data.map((message: any) => ({ role: message.role, content: message.content })));
      }

      setLoadingHistory(false);
    };

    loadHistory();
  }, []);

  const saveMessage = async (role: string, content: string) => {
    if (!userId) return;
    await supabase.from("chat_messages").insert({ user_id: userId, role, content });
  };

  const clearHistory = async () => {
    if (!userId) return;
    await supabase.from("chat_messages").delete().eq("user_id", userId);
    setMessages([]);
    toast.success("Historique effacé");
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    if (isCoolingDown) {
      toast.error("Patientez quelques secondes avant de réessayer.");
      return;
    }

    const trimmedText = text.trim();
    const previousMessages = messages;
    const userMsg: Message = { role: "user", content: trimmedText };
    const allMessages = [...previousMessages, userMsg];

    setMessages(allMessages);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((message, index) => (
            index === prev.length - 1 ? { ...message, content: assistantSoFar } : message
          ));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      const errorPayload = !resp.ok ? await resp.json().catch(() => null) : null;

      if (resp.status === 429) {
        const retryAfterValue = Number(resp.headers.get("Retry-After") ?? "20");
        const retryAfterSeconds = Number.isFinite(retryAfterValue) ? retryAfterValue : 20;

        setCooldownUntil(Date.now() + retryAfterSeconds * 1000);
        setMessages(previousMessages);
        setInput(trimmedText);
        toast.error(errorPayload?.error ?? "Limite de requêtes atteinte. Réessayez dans quelques secondes.");
        return;
      }

      if (resp.status === 402) {
        setMessages(previousMessages);
        setInput(trimmedText);
        toast.error(errorPayload?.error ?? "Crédits IA insuffisants.");
        return;
      }

      if (!resp.ok || !resp.body) {
        throw new Error(errorPayload?.error ?? "Erreur de connexion");
      }

      await saveMessage("user", trimmedText);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (assistantSoFar) {
        await saveMessage("assistant", assistantSoFar);
      }
    } catch (error: any) {
      console.error(error);
      setMessages(previousMessages);
      setInput(trimmedText);
      toast.error(error?.message || "Erreur lors de la communication avec l'IA");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  if (loadingHistory) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display font-semibold text-foreground">SenStock AI Brain</h1>
            <p className="text-xs text-muted-foreground">Assistant intelligent · Base documentaire active</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {messages.length > 0 && (
              <button onClick={clearHistory} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <Plus className="w-3.5 h-3.5" /> Nouvelle conversation
              </button>
            )}
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs text-muted-foreground">En ligne</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ background: "var(--gradient-primary)" }}>
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">Comment puis-je vous aider ?</h2>
            <p className="text-muted-foreground text-sm mb-8">Posez-moi vos questions sur les opérations, procédures et données de SenStock.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {suggestions.map((suggestion) => (
                <button key={suggestion} onClick={() => sendMessage(suggestion)} className="senstock-card text-left px-4 py-3 text-sm text-foreground hover:border-primary/30 transition-colors">
                  {suggestion}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((msg, index) => (
            <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 max-w-3xl ${msg.role === "user" ? "ml-auto flex-row-reverse" : ""}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                {msg.role === "user" ? <User className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
              </div>
              <div className={msg.role === "user" ? "senstock-chat-bubble-user" : "senstock-chat-bubble-ai"}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none text-foreground">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm">{msg.content}</p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 max-w-3xl">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <Brain className="w-4 h-4 text-foreground" />
            </div>
            <div className="senstock-chat-bubble-ai flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0s" }} />
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.2s" }} />
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.4s" }} />
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t bg-card px-4 py-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez votre question à SenStock AI Brain..."
            className="senstock-input flex-1"
            disabled={isLoading || isCoolingDown}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || isCoolingDown}
            className="w-11 h-11 rounded-lg flex items-center justify-center text-primary-foreground transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        {isCoolingDown && (
          <p className="max-w-3xl mx-auto mt-2 text-xs text-muted-foreground">
            Trop de requêtes ont été envoyées. Réessayez dans quelques secondes.
          </p>
        )}
      </div>
    </div>
  );
};

export default Chat;
