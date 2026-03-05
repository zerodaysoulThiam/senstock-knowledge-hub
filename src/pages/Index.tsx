import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, ArrowRight, Droplets, Shield, Zap, MessageSquare } from "lucide-react";

const features = [
  { icon: MessageSquare, title: "Chatbot IA", desc: "Posez vos questions en langage naturel et obtenez des réponses basées sur vos documents internes." },
  { icon: Zap, title: "Recherche intelligente", desc: "Trouvez instantanément l'information dans toute la base documentaire de SenStock." },
  { icon: Shield, title: "Sécurisé", desc: "Authentification JWT, chiffrement des données et contrôle d'accès granulaire." },
  { icon: Droplets, title: "Suivi des stocks", desc: "Visualisez en temps réel les niveaux de stockage et les tendances de consommation." },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <div className="absolute inset-0 opacity-5">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-primary-foreground/30"
              style={{
                width: `${300 + i * 180}px`,
                height: `${300 + i * 180}px`,
                top: "40%",
                left: "60%",
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}
        </div>

        <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-foreground/10 backdrop-blur-sm flex items-center justify-center border border-primary-foreground/20">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-primary-foreground">SenStock AI Brain</span>
          </div>
          <Link
            to="/login"
            className="px-5 py-2 rounded-lg bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 text-primary-foreground text-sm font-medium hover:bg-primary-foreground/20 transition-all"
          >
            Connexion
          </Link>
        </nav>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center px-6 py-20 lg:py-32 max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 text-primary-foreground/80 text-sm mb-6 backdrop-blur-sm">
            <Zap className="w-3.5 h-3.5" />
            Propulsé par l'Intelligence Artificielle
          </div>
          <h1 className="font-display text-4xl lg:text-6xl font-bold text-primary-foreground leading-tight mb-6">
            Le cerveau numérique
            <br />
            de <span className="opacity-90">SenStock</span>
          </h1>
          <p className="text-lg lg:text-xl text-primary-foreground/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            Centralisez vos connaissances, assistez vos équipes et optimisez vos opérations
            grâce à l'intelligence artificielle appliquée à vos données internes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/login"
              className="px-8 py-3.5 rounded-xl bg-primary-foreground text-primary font-display font-semibold text-sm hover:opacity-90 transition-all flex items-center gap-2"
            >
              Accéder à la plateforme
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="mt-16 flex items-center justify-center gap-12 text-primary-foreground/50 text-sm">
            <div>
              <div className="text-3xl font-display font-bold text-primary-foreground">284M</div>
              <div>Litres de stockage</div>
            </div>
            <div className="w-px h-12 bg-primary-foreground/20" />
            <div>
              <div className="text-3xl font-display font-bold text-primary-foreground">RAG</div>
              <div>IA documentaire</div>
            </div>
            <div className="w-px h-12 bg-primary-foreground/20" />
            <div>
              <div className="text-3xl font-display font-bold text-primary-foreground">&lt;2s</div>
              <div>Temps de réponse</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Features */}
      <div className="px-6 lg:px-12 py-20 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="font-display text-3xl font-bold text-foreground mb-3">
            Fonctionnalités principales
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Une plateforme complète pour transformer la gestion de vos connaissances et opérations.
          </p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="senstock-card p-6 text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t px-6 py-8 text-center">
        <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Brain className="w-4 h-4" />
          <span>SenStock AI Brain — © 2024 SenStock. Tous droits réservés.</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
