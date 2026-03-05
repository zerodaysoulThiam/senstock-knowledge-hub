import { motion } from "framer-motion";
import { Settings, Brain, Database, Shield, Bell } from "lucide-react";

const SettingsPage = () => {
  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground">Paramètres</h1>
        <p className="text-muted-foreground mt-1">Configuration de SenStock AI Brain</p>
      </motion.div>

      <div className="space-y-6">
        {[
          { icon: Brain, title: "Modèle IA", desc: "Configuration du modèle de langage et des paramètres RAG", badge: "Actif" },
          { icon: Database, title: "Base vectorielle", desc: "Gestion de l'index documentaire et des embeddings", badge: "89 documents" },
          { icon: Shield, title: "Sécurité", desc: "Authentification JWT, chiffrement et contrôle d'accès", badge: "Activé" },
          { icon: Bell, title: "Notifications", desc: "Alertes stocks bas, rapports automatiques", badge: "3 actives" },
        ].map((s) => (
          <div key={s.title} className="senstock-card p-6 flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <s.icon className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-display font-semibold text-foreground">{s.title}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{s.desc}</p>
            </div>
            <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-success/10 text-success">{s.badge}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SettingsPage;
