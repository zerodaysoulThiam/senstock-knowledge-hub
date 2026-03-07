import { motion } from "framer-motion";
import {
  MessageSquare,
  FileText,
  Users,
  Clock,
  ArrowUpRight,
  Brain,
  Loader2,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};

const Dashboard = () => {
  const { data: docCount = 0 } = useQuery({
    queryKey: ["dashboard-docs"],
    queryFn: async () => {
      const { count } = await supabase.from("documents").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: userCount = 0 } = useQuery({
    queryKey: ["dashboard-users"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: questionCount = 0 } = useQuery({
    queryKey: ["dashboard-questions"],
    queryFn: async () => {
      const { count } = await supabase.from("chat_messages").select("*", { count: "exact", head: true }).eq("role", "user");
      return count || 0;
    },
  });

  const { data: responseCount = 0 } = useQuery({
    queryKey: ["dashboard-responses"],
    queryFn: async () => {
      const { count } = await supabase.from("chat_messages").select("*", { count: "exact", head: true }).eq("role", "assistant");
      return count || 0;
    },
  });

  const { data: recentQuestions = [], isLoading: loadingRecent } = useQuery({
    queryKey: ["dashboard-recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("content, created_at, user_id")
        .eq("role", "user")
        .order("created_at", { ascending: false })
        .limit(5);
      if (!data || data.length === 0) return [];
      
      const userIds = [...new Set(data.map((m: any) => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.name]));
      
      return data.map((m: any) => ({
        q: m.content,
        time: formatRelativeTime(m.created_at),
        user: profileMap.get(m.user_id) || "Utilisateur",
      }));
    },
  });

  const { data: monthlyData = [] } = useQuery({
    queryKey: ["dashboard-monthly"],
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("created_at, role")
        .eq("role", "user");
      
      if (!data || data.length === 0) return [];
      
      const months: Record<string, number> = {};
      const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
      
      // Group by day of week for last 7 days
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        months[key] = 0;
      }
      
      data.forEach((m: any) => {
        const key = m.created_at.split("T")[0];
        if (key in months) months[key]++;
      });
      
      return Object.entries(months).map(([date, count]) => ({
        name: dayNames[new Date(date).getDay()],
        questions: count,
      }));
    },
  });

  const stats = [
    { icon: MessageSquare, label: "Questions posées", value: questionCount.toLocaleString(), color: "text-primary" },
    { icon: FileText, label: "Documents indexés", value: docCount.toLocaleString(), color: "text-accent" },
    { icon: Users, label: "Utilisateurs actifs", value: userCount.toLocaleString(), color: "text-success" },
    { icon: Brain, label: "Réponses générées", value: responseCount.toLocaleString(), color: "text-warning" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Vue d'ensemble de SenStock AI Brain</p>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <motion.div key={s.label} variants={item} className="senstock-stat-card">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-display font-bold text-foreground">{s.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <motion.div variants={item} initial="hidden" animate="show" className="senstock-card p-6 lg:col-span-2">
          <h3 className="font-display font-semibold text-foreground mb-4">Questions IA — 7 derniers jours</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="questions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
              Aucune activité pour le moment
            </div>
          )}
        </motion.div>

        <motion.div variants={item} initial="hidden" animate="show" className="senstock-card p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Questions récentes</h3>
          {loadingRecent ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : recentQuestions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Aucune question posée pour le moment.</p>
          ) : (
            <div className="space-y-4">
              {recentQuestions.map((rq: any, i: number) => (
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Brain className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">{rq.q}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{rq.user} · {rq.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days}j`;
}

export default Dashboard;
