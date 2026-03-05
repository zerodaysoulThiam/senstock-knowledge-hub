import { motion } from "framer-motion";
import { BarChart3, TrendingUp, MessageSquare, FileText, Clock, Brain } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

const topicData = [
  { name: "Procédures", value: 35, fill: "hsl(210, 80%, 45%)" },
  { name: "Stocks", value: 25, fill: "hsl(195, 85%, 42%)" },
  { name: "Logistique", value: 20, fill: "hsl(152, 60%, 42%)" },
  { name: "RH", value: 12, fill: "hsl(38, 92%, 50%)" },
  { name: "Autres", value: 8, fill: "hsl(215, 15%, 50%)" },
];

const monthlyData = [
  { month: "Jul", questions: 180 },
  { month: "Aoû", questions: 220 },
  { month: "Sep", questions: 310 },
  { month: "Oct", questions: 290 },
  { month: "Nov", questions: 340 },
  { month: "Déc", questions: 380 },
];

const topDocs = [
  { name: "Procédures de sécurité 2024", uses: 234 },
  { name: "Manuel opérationnel des réservoirs", uses: 189 },
  { name: "Normes QHSE", uses: 156 },
  { name: "Guide de maintenance des pompes", uses: 123 },
  { name: "Politique RH", uses: 98 },
];

const Stats = () => {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground">Statistiques</h1>
        <p className="text-muted-foreground mt-1">Analyse des performances de l'IA</p>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: MessageSquare, label: "Total questions", value: "4,832", sub: "Ce trimestre" },
          { icon: Brain, label: "Taux de résolution", value: "94%", sub: "Réponses pertinentes" },
          { icon: Clock, label: "Temps moyen", value: "1.8s", sub: "Par réponse" },
          { icon: TrendingUp, label: "Croissance", value: "+23%", sub: "vs mois dernier" },
        ].map((kpi) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="senstock-stat-card">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <kpi.icon className="w-5 h-5 text-primary" />
            </div>
            <div className="text-2xl font-display font-bold text-foreground">{kpi.value}</div>
            <div className="text-sm text-muted-foreground">{kpi.label}</div>
            <div className="text-xs text-muted-foreground/70 mt-1">{kpi.sub}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Monthly questions */}
        <div className="senstock-card p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Questions par mois</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
              <Bar dataKey="questions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Topics pie */}
        <div className="senstock-card p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Sujets populaires</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={topicData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" strokeWidth={0}>
                  {topicData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2.5">
              {topicData.map((t) => (
                <div key={t.name} className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.fill }} />
                  <span className="text-sm text-foreground">{t.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{t.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top docs */}
      <div className="senstock-card p-6">
        <h3 className="font-display font-semibold text-foreground mb-4">Documents les plus consultés</h3>
        <div className="space-y-3">
          {topDocs.map((doc, i) => (
            <div key={doc.name} className="flex items-center gap-4">
              <span className="text-sm font-display font-bold text-muted-foreground w-6">{i + 1}</span>
              <FileText className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-sm text-foreground flex-1">{doc.name}</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(doc.uses / topDocs[0].uses) * 100}%`,
                      background: "var(--gradient-primary)",
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-10 text-right">{doc.uses}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Stats;
