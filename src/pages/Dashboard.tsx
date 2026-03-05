import { motion } from "framer-motion";
import {
  MessageSquare,
  FileText,
  Users,
  TrendingUp,
  Droplets,
  Clock,
  ArrowUpRight,
  Brain,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

const stats = [
  { icon: MessageSquare, label: "Questions posées", value: "1,247", change: "+12%", color: "text-primary" },
  { icon: FileText, label: "Documents indexés", value: "89", change: "+5", color: "text-accent" },
  { icon: Users, label: "Utilisateurs actifs", value: "34", change: "+3", color: "text-success" },
  { icon: Clock, label: "Temps réponse moyen", value: "1.8s", change: "-0.3s", color: "text-warning" },
];

const chartData = [
  { name: "Lun", questions: 45, reponses: 42 },
  { name: "Mar", questions: 52, reponses: 50 },
  { name: "Mer", questions: 38, reponses: 36 },
  { name: "Jeu", questions: 65, reponses: 62 },
  { name: "Ven", questions: 58, reponses: 55 },
  { name: "Sam", questions: 22, reponses: 21 },
  { name: "Dim", questions: 15, reponses: 14 },
];

const stockData = [
  { name: "Jan", volume: 220 },
  { name: "Fév", volume: 235 },
  { name: "Mar", volume: 248 },
  { name: "Avr", volume: 260 },
  { name: "Mai", volume: 255 },
  { name: "Jun", volume: 270 },
];

const recentQuestions = [
  { q: "Procédure de réception des camions-citernes ?", time: "Il y a 5 min", user: "A. Diallo" },
  { q: "Capacité maximale du réservoir B3 ?", time: "Il y a 12 min", user: "M. Ndiaye" },
  { q: "Comment traiter une commande urgente ?", time: "Il y a 30 min", user: "F. Sow" },
  { q: "Normes de sécurité pour le stockage GPL ?", time: "Il y a 1h", user: "B. Fall" },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};

const Dashboard = () => {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Vue d'ensemble de SenStock AI Brain</p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <motion.div key={s.label} variants={item} className="senstock-stat-card">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-success flex items-center gap-0.5">
                {s.change}
                <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
            <div className="text-2xl font-display font-bold text-foreground">{s.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Chart - Questions */}
        <motion.div variants={item} initial="hidden" animate="show" className="senstock-card p-6 lg:col-span-2">
          <h3 className="font-display font-semibold text-foreground mb-4">Activité IA — Cette semaine</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
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
              <Bar dataKey="reponses" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Recent questions */}
        <motion.div variants={item} initial="hidden" animate="show" className="senstock-card p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Questions récentes</h3>
          <div className="space-y-4">
            {recentQuestions.map((rq, i) => (
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
        </motion.div>
      </div>

      {/* Stock chart */}
      <motion.div variants={item} initial="hidden" animate="show" className="senstock-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-foreground">Volume de stockage (millions de litres)</h3>
          <div className="flex items-center gap-2 text-sm text-success">
            <Droplets className="w-4 h-4" />
            <span>284M L capacité totale</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={stockData}>
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
            <Line type="monotone" dataKey="volume" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ fill: "hsl(var(--primary))", r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
};

export default Dashboard;
