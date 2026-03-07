import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Upload, Search, File, BookOpen, Loader2, Download, Info, X, Eye } from "lucide-react";
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
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [aiSearch, setAiSearch] = useState("");
  const [aiSearchResults, setAiSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
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

  const trackView = async (docId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("document_views").insert({
      document_id: docId,
      user_id: user.id,
    });
    // Increment view count
    const doc = docs.find((d: any) => d.id === docId);
    if (doc) {
      await supabase.from("documents").update({
        view_count: (doc.view_count || 0) + 1,
        last_viewed_at: new Date().toISOString(),
      }).eq("id", docId);
    }
  };

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
      const { data: { user } } = await supabase.auth.getUser();
      const filePath = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("documents").getPublicUrl(filePath);

      const { data, error } = await supabase.functions.invoke("extract-text", {
        body: {
          file_url: urlData.publicUrl,
          title: file.name,
          file_type: file.type,
          file_size: `${(file.size / 1024).toFixed(0)} KB`,
          uploaded_by: user?.id || null,
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

  const handleAiSearch = async () => {
    if (!aiSearch.trim()) return;
    setSearching(true);
    setAiSearchResults([]);
    try {
      const { data: chunks } = await supabase
        .from("document_chunks")
        .select("content, chunk_index, document_id")
        .limit(500);
      
      if (!chunks || chunks.length === 0) {
        toast.info("Aucun document indexé pour la recherche.");
        setSearching(false);
        return;
      }

      const searchTerms = aiSearch.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
      const scored = chunks.map((c: any) => {
        const text = c.content.toLowerCase();
        const score = searchTerms.reduce((s: number, term: string) => s + (text.includes(term) ? 1 : 0), 0);
        return { ...c, score };
      }).filter((c: any) => c.score > 0)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 10);

      const docIds = [...new Set(scored.map((c: any) => c.document_id))];
      const { data: docData } = await supabase.from("documents").select("id, title").in("id", docIds);
      const docMap = new Map((docData || []).map((d: any) => [d.id, d.title]));

      setAiSearchResults(scored.map((c: any) => ({
        document: docMap.get(c.document_id) || "Document",
        passage: c.content.substring(0, 300),
        passageIndex: c.chunk_index + 1,
      })));
    } catch (e) {
      toast.error("Erreur lors de la recherche");
    } finally {
      setSearching(false);
    }
  };

  const { data: docInfo } = useQuery({
    queryKey: ["doc-info", selectedDoc?.id],
    queryFn: async () => {
      if (!selectedDoc) return null;
      const { data: views } = await supabase
        .from("document_views")
        .select("viewed_at, user_id")
        .eq("document_id", selectedDoc.id)
        .order("viewed_at", { ascending: false })
        .limit(1);
      
      let uploaderName = "Inconnu";
      if (selectedDoc.uploaded_by) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", selectedDoc.uploaded_by)
          .single();
        if (profile) uploaderName = profile.name;
      }

      return {
        uploaderName,
        lastViewed: views?.[0]?.viewed_at || null,
      };
    },
    enabled: !!selectedDoc,
  });

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
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={handleUpload} />
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

        {/* AI Search */}
        <div className="senstock-card p-4 mb-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={aiSearch}
                onChange={(e) => setAiSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAiSearch()}
                placeholder="🔎 Rechercher dans tous les documents..."
                className="senstock-input w-full pl-11"
              />
            </div>
            <button
              onClick={handleAiSearch}
              disabled={searching || !aiSearch.trim()}
              className="px-5 py-2.5 rounded-lg font-display font-semibold text-sm text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--gradient-primary)" }}
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Rechercher"}
            </button>
          </div>
          {aiSearchResults.length > 0 && (
            <div className="mt-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground">{aiSearchResults.length} résultat(s) trouvé(s)</h4>
              {aiSearchResults.map((r, i) => (
                <div key={i} className="p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">{r.document}</span>
                    <span className="text-xs text-muted-foreground">Passage {r.passageIndex}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{r.passage}...</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filter search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrer les documents..."
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
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Eye className="w-5 h-5 text-accent" />
            </div>
            <div>
              <div className="text-xl font-display font-bold text-foreground">
                {docs.reduce((sum: number, d: any) => sum + (d.view_count || 0), 0)}
              </div>
              <div className="text-sm text-muted-foreground">Consultations</div>
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
                            <div>
                              <span className="text-sm font-medium text-foreground">{doc.title}</span>
                              {doc.summary && (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{doc.summary}</p>
                              )}
                            </div>
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
                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                          {doc.file_url && (
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary transition-colors"
                              title="Télécharger"
                              onClick={() => trackView(doc.id)}
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={() => { setSelectedDoc(doc); trackView(doc.id); }}
                            className="text-muted-foreground hover:text-primary transition-colors"
                            title="Informations"
                          >
                            <Info className="w-4 h-4" />
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

        {/* Document Info Modal */}
        <AnimatePresence>
          {selectedDoc && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedDoc(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-card rounded-xl border p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-semibold text-foreground">Informations du document</h3>
                  <button onClick={() => setSelectedDoc(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-3">
                  <InfoRow label="Titre" value={selectedDoc.title} />
                  <InfoRow label="ID" value={selectedDoc.id} />
                  <InfoRow label="Type" value={selectedDoc.file_type || "—"} />
                  <InfoRow label="Taille" value={selectedDoc.file_size || "—"} />
                  <InfoRow label="Date de téléversement" value={new Date(selectedDoc.created_at).toLocaleString("fr-FR")} />
                  <InfoRow label="Téléversé par" value={docInfo?.uploaderName || "Chargement..."} />
                  <InfoRow label="Consultations" value={String(selectedDoc.view_count || 0)} />
                  <InfoRow label="Dernière consultation" value={docInfo?.lastViewed ? new Date(docInfo.lastViewed).toLocaleString("fr-FR") : "Jamais"} />
                  <InfoRow label="Statut" value={selectedDoc.status || "—"} />
                  {selectedDoc.summary && <InfoRow label="Résumé" value={selectedDoc.summary} />}
                  {selectedDoc.keywords && <InfoRow label="Mots-clés" value={selectedDoc.keywords} />}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div>
    <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
    <dd className="text-sm text-foreground mt-0.5 break-all">{value}</dd>
  </div>
);

export default Documents;
