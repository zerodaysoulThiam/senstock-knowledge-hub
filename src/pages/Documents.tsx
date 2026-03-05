import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Upload, Trash2, Search, File, FileSpreadsheet, Globe, BookOpen } from "lucide-react";

interface Doc {
  id: number;
  name: string;
  type: string;
  size: string;
  date: string;
  status: "indexé" | "en cours" | "erreur";
}

const mockDocs: Doc[] = [
  { id: 1, name: "Procédures de sécurité SenStock 2024", type: "PDF", size: "2.4 MB", date: "2024-12-15", status: "indexé" },
  { id: 2, name: "Manuel opérationnel des réservoirs", type: "PDF", size: "5.1 MB", date: "2024-11-20", status: "indexé" },
  { id: 3, name: "Inventaire des stocks Q4 2024", type: "Excel", size: "1.8 MB", date: "2024-12-01", status: "indexé" },
  { id: 4, name: "Politique RH — Intégration nouveaux employés", type: "Word", size: "890 KB", date: "2024-10-10", status: "indexé" },
  { id: 5, name: "Guide de maintenance des pompes", type: "PDF", size: "3.2 MB", date: "2024-09-05", status: "en cours" },
  { id: 6, name: "Normes QHSE applicables", type: "PDF", size: "1.5 MB", date: "2024-08-20", status: "indexé" },
];

const typeIcon: Record<string, typeof FileText> = {
  PDF: FileText,
  Excel: FileSpreadsheet,
  Word: File,
  Web: Globe,
};

const statusColors: Record<string, string> = {
  "indexé": "bg-success/10 text-success",
  "en cours": "bg-warning/10 text-warning",
  "erreur": "bg-destructive/10 text-destructive",
};

const Documents = () => {
  const [search, setSearch] = useState("");
  const [docs] = useState<Doc[]>(mockDocs);

  const filtered = docs.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Documents</h1>
            <p className="text-muted-foreground mt-1">Base de connaissances SenStock AI Brain</p>
          </div>
          <button
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-display font-semibold text-sm text-primary-foreground transition-all hover:opacity-90"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Upload className="w-4 h-4" />
            Importer un document
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un document..."
            className="senstock-input w-full pl-11"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="senstock-stat-card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-xl font-display font-bold text-foreground">{docs.length}</div>
              <div className="text-sm text-muted-foreground">Documents</div>
            </div>
          </div>
          <div className="senstock-stat-card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-success" />
            </div>
            <div>
              <div className="text-xl font-display font-bold text-foreground">
                {docs.filter((d) => d.status === "indexé").length}
              </div>
              <div className="text-sm text-muted-foreground">Indexés</div>
            </div>
          </div>
          <div className="senstock-stat-card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-warning" />
            </div>
            <div>
              <div className="text-xl font-display font-bold text-foreground">
                {docs.filter((d) => d.status === "en cours").length}
              </div>
              <div className="text-sm text-muted-foreground">En cours</div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="senstock-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Document</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Taille</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Statut</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc) => {
                  const Icon = typeIcon[doc.type] || FileText;
                  return (
                    <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5 text-primary flex-shrink-0" />
                          <span className="text-sm font-medium text-foreground">{doc.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{doc.type}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{doc.size}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{doc.date}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[doc.status]}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Documents;
