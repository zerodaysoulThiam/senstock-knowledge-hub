import { motion } from "framer-motion";
import { MessageSquare, FileText, Clock, Brain, Loader2, Users } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const COLORS = [
  "hsl(210, 80%, 45%)",
  "hsl(195, 85%, 42%)",
  "hsl(152, 60%, 42%)",
  "hsl(38, 92%, 50%)",
  "hsl(215, 15%, 50%)",
];

const Stats = () => {
  const { data: totalQuestions = 0 } = useQuery({
    queryKey: ["stats-questions"],
    queryFn: async () => {
      const { count } = await supabase.from("chat_messages").select("*", { count: "exact", head: true }).eq("role", "user");
      return count || 0;
    },
  });

  const { data: totalDocs = 0 } = useQuery({
    queryKey: ["stats-docs"],
    queryFn: async () => {
      const { count } = await supabase.from("documents").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: totalUsers = 0 } = useQuery({
    queryKey: ["stats-users"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: totalResponses = 0 } = useQuery({
    queryKey: ["stats-responses"],
    queryFn: async () => {
      const { count } = await supabase.from("chat_messages").select("*", { count: "exact", head: true }).eq("role", "assistant");
      return count || 0;
    },
  });

  const { data: monthlyData = [] } = useQuery({
    queryKey: ["stats-monthly"],
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("created_at")
        .eq("role", "user");
      if (!data || data.length === 0) return [];

      const months: Record<string, number> = {};
      const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
      data.forEach((m: any) => {
        const d = new Date(m.created_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
        months[key] = (months[key] || 0) + 1;
      });
      return Object.entries(months)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([key, count]) => {
          const [y, m] = key.split("-");
          return { month: `${monthNames[parseInt(m)]}`, questions: count };
        });
    },
  });

  const { data: topDocs = [] } = useQuery({
    queryKey: ["stats-topdocs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select("title, view_count")
        .order("view_count", { ascending: false })
        .limit(5);
      return (data || []).filter((d: any) => d.view_count > 0).map((d: any) => ({
        name: d.title,
        uses: d.view_count || 0,
      }));
    },
  });

  const kpis = [
    { icon: MessageSquare, label: "Total questions", value: totalQuestions.toLocaleString(), sub: "Toutes les questions" },
    { icon: Brain, label: "Réponses IA", value: totalResponses.toLocaleString(), sub: "Réponses générées" },
    { icon: FileText, label: "Documents", value: totalDocs.toLocaleString(), sub: "Documents indexés" },
    { icon: Users, label: "Utilisateurs", value: totalUsers.toLocaleString(), sub: "Comptes actifs" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground">Statistiques</h1>
        <p className="text-muted-foreground mt-1">Analyse des performances de l'IA</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => (
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
        <div className="senstock-card p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Questions par mois</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Bar dataKey="questions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
              Aucune donnée disponible
            </div>
          )}
        </div>

        <div className="senstock-card p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Aperçu global</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-foreground">Questions posées</span>
              <span className="text-sm font-bold text-foreground">{totalQuestions}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-foreground">Réponses générées</span>
              <span className="text-sm font-bold text-foreground">{totalResponses}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-foreground">Documents indexés</span>
              <span className="text-sm font-bold text-foreground">{totalDocs}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-foreground">Utilisateurs</span>
              <span className="text-sm font-bold text-foreground">{totalUsers}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="senstock-card p-6">
        <h3 className="font-display font-semibold text-foreground mb-4">Documents les plus consultés</h3>
        {topDocs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Aucune consultation enregistrée.</p>
        ) : (
          <div className="space-y-3">
            {topDocs.map((doc: any, i: number) => (
              <div key={doc.name} className="flex items-center gap-4">
                <span className="text-sm font-display font-bold text-muted-foreground w-6">{i + 1}</span>
                <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm text-foreground flex-1 truncate">{doc.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${topDocs[0]?.uses ? (doc.uses / topDocs[0].uses) * 100 : 0}%`,
                        background: "var(--gradient-primary)",
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-10 text-right">{doc.uses}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Stats;
