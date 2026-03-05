import { useState, useRef, useEffect } from "react";
import { Send, Brain, User, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Simulated AI response - will be replaced with Lovable AI gateway
    setTimeout(() => {
      const aiResponse: Message = {
        role: "assistant",
        content: `Merci pour votre question concernant "${text.trim()}". 

En consultant la base de connaissances de SenStock, voici ce que j'ai trouvé :

**SenStock** dispose d'une capacité de stockage de **284 millions de litres** et opère comme le principal acteur de stockage d'hydrocarbures au Sénégal.

Pour des informations plus détaillées, je vous recommande de consulter la documentation technique disponible dans la section Documents.

*Source : Base de connaissances SenStock — mise à jour récente*`,
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display font-semibold text-foreground">SenStock AI Brain</h1>
            <p className="text-xs text-muted-foreground">Assistant intelligent · Base documentaire active</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs text-muted-foreground">En ligne</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center"
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              Comment puis-je vous aider ?
            </h2>
            <p className="text-muted-foreground text-sm mb-8">
              Posez-moi vos questions sur les opérations, procédures et données de SenStock.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="senstock-card text-left px-4 py-3 text-sm text-foreground hover:border-primary/30 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 max-w-3xl ${msg.role === "user" ? "ml-auto flex-row-reverse" : ""}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}>
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

        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 max-w-3xl">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <Brain className="w-4 h-4 text-foreground" />
            </div>
            <div className="senstock-chat-bubble-ai flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse_dot" style={{ animationDelay: "0s" }} />
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse_dot" style={{ animationDelay: "0.2s" }} />
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse_dot" style={{ animationDelay: "0.4s" }} />
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-card px-4 py-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez votre question à SenStock AI Brain..."
            className="senstock-input flex-1"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-11 h-11 rounded-lg flex items-center justify-center text-primary-foreground transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
