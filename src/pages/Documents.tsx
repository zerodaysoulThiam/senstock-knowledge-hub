import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { FileText, Upload, Trash2, Search, File, FileSpreadsheet, BookOpen, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const typeIcon: Record<string, typeof FileText> = {
  "application/pdf": FileText,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": File,
  "text/plain": FileText,
  pdf: FileText,
  docx: File,
  txt: FileText,
};

const statusColors: Record<string, string> = {
  "indexé": "bg-success/10 text-success",
  "en cours": "bg-warning/10 text-warning",
  "erreur": "bg-destructive/10 text-destructive",
};

const Documents = () => {
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document supprimé");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Type de fichier non supporté. Utilisez PDF, DOCX ou TXT.");
      return;
    }

    setUploading(true);
    try {
      const filePath = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath);

      // Call extract-text edge function
      const { data, error } = await supabase.functions.invoke("extract-text", {
        body: {
          file_url: urlData.publicUrl,
          title: file.name,
          file_type: file.type,
          file_size: `${(file.size / 1024).toFixed(0)} KB`,
        },
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document téléversé et indexé avec succès !");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erreur lors du téléversement");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filtered = docs.filter((d: any) =>
    d.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Documents</h1>
            <p className="text-muted-foreground mt-1">Base de connaissances SenStock AI Brain</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-display font-semibold text-sm text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--gradient-primary)" }}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? "Téléversement..." : "Téléverser un document"}
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
                {docs.filter((d: any) => d.status === "indexé").length}
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
                {docs.filter((d: any) => d.status === "en cours").length}
              </div>
              <div className="text-sm text-muted-foreground">En cours</div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="senstock-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-display font-semibold">Aucun document téléversé pour le moment.</p>
              <p className="text-sm mt-1">Cliquez sur « Téléverser un document » pour commencer.</p>
            </div>
          ) : (
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
                  {filtered.map((doc: any) => {
                    const Icon = typeIcon[doc.file_type] || FileText;
                    return (
                      <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Icon className="w-5 h-5 text-primary flex-shrink-0" />
                            <span className="text-sm font-medium text-foreground">{doc.title}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{doc.file_type}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{doc.file_size}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[doc.status] || ""}`}>
                            {doc.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => deleteMutation.mutate(doc.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Documents;
