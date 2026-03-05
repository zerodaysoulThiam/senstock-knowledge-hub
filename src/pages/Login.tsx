import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, Eye, EyeOff, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Demo auth - in production this would use Supabase auth
    if (
      (username === "passer" && password === "passer") ||
      (username === "matar" && password === "passer")
    ) {
      navigate("/dashboard");
    } else {
      setError("Identifiants incorrects. Veuillez réessayer.");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - Branding */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 relative overflow-hidden"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute inset-0 opacity-10">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-primary-foreground/20"
              style={{
                width: `${200 + i * 150}px`,
                height: `${200 + i * 150}px`,
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center"
        >
          <div className="w-24 h-24 rounded-2xl bg-primary-foreground/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-8 border border-primary-foreground/20">
            <Brain className="w-12 h-12 text-primary-foreground" />
          </div>
          <h1 className="font-display text-5xl font-bold text-primary-foreground mb-4">
            SenStock
          </h1>
          <p className="text-xl text-primary-foreground/80 font-display">AI Brain</p>
          <p className="mt-6 text-primary-foreground/60 max-w-md leading-relaxed">
            Le cerveau numérique de SenStock. Accédez à l'intelligence artificielle
            pour centraliser vos connaissances et optimiser vos opérations.
          </p>
          <div className="mt-10 flex items-center justify-center gap-8 text-primary-foreground/50 text-sm">
            <div>
              <div className="text-2xl font-display font-bold text-primary-foreground">284M</div>
              <div>Litres de capacité</div>
            </div>
            <div className="w-px h-12 bg-primary-foreground/20" />
            <div>
              <div className="text-2xl font-display font-bold text-primary-foreground">IA</div>
              <div>Assistée par RAG</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">SenStock AI Brain</span>
          </div>

          <h2 className="font-display text-3xl font-bold text-foreground mb-2">
            Connexion
          </h2>
          <p className="text-muted-foreground mb-8">
            Accédez à votre espace SenStock AI Brain
          </p>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Nom d'utilisateur
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="senstock-input w-full"
                placeholder="Entrez votre identifiant"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="senstock-input w-full pr-12"
                  placeholder="Entrez votre mot de passe"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" className="rounded border-input" />
                Se souvenir de moi
              </label>
              <button type="button" className="text-sm text-primary hover:underline">
                Mot de passe oublié ?
              </button>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-lg font-display font-semibold text-primary-foreground flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: "var(--gradient-primary)" }}
            >
              Se connecter
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Contactez votre administrateur pour obtenir vos identifiants
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
