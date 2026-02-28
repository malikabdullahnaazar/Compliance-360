import { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import {
    ClipboardList, CheckCircle, Clock, User, Calendar, ChevronDown,
    ChevronUp, Upload, Eye, Download, X, FileText, ArrowLeft, Cpu,
    FileStack, AlertTriangle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { addToast } from '../store/slices/uiSlice';
import api from '../services/api';

/* ─── API helpers ─────────────────────────────────────────────────────────── */
const fetchAssigned = () => api.get('/ai/mistral/assigned/');
const fetchDetail = (id) => api.get(`/ai/mistral/assigned/${id}/detail/`);
const uploadDoc = (id, formData) =>
    api.post(`/ai/mistral/assigned/${id}/upload_document/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
const downloadAssignedDoc = (id) =>
    api.get(`/ai/mistral/assigned/${id}/download_document/`, { responseType: 'blob' });

/* ─── Markdown components ─────────────────────────────────────────────────── */
const MD_PLUGINS = [remarkGfm, remarkBreaks];

const mdComponents = {
    h1: ({ children }) => <h1 className="text-xl font-bold text-gray-900 dark:text-white mt-6 mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">{children}</h1>,
    h2: ({ children }) => <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mt-5 mb-2">{children}</h2>,
    h3: ({ children }) => <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mt-4 mb-1.5">{children}</h3>,
    p: ({ children }) => <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-2">{children}</p>,
    ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3 text-sm text-gray-700 dark:text-gray-300">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3 text-sm text-gray-700 dark:text-gray-300">{children}</ol>,
    li: ({ children }) => <li className="ml-2">{children}</li>,
    strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>,
    blockquote: ({ children }) => <blockquote className="border-l-4 border-teal-400 pl-4 italic text-gray-600 dark:text-gray-400 my-3">{children}</blockquote>,
    table: ({ children }) => (
        <div className="overflow-x-auto my-4">
            <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg text-sm">{children}</table>
        </div>
    ),
    thead: ({ children }) => <thead className="bg-gray-50 dark:bg-gray-800/60">{children}</thead>,
    th: ({ children }) => <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">{children}</th>,
    td: ({ children }) => <td className="px-4 py-2 text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800">{children}</td>,
    code: ({ children }) => <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs font-mono text-teal-700 dark:text-teal-300">{children}</code>,
};

const MarkdownReport = ({ markdown }) => (
    <div className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown components={mdComponents} remarkPlugins={MD_PLUGINS}>
            {markdown}
        </ReactMarkdown>
    </div>
);

/* ─── Status Badge ────────────────────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
    if (status === 'complete') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle className="h-3.5 w-3.5" />
                Complete
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            <Clock className="h-3.5 w-3.5" />
            Incomplete
        </span>
    );
};

/* ─── Main Page ───────────────────────────────────────────────────────────── */
const AssignedAuditReportsPage = () => {
    const dispatch = useDispatch();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);

    // Expanded card for list view
    const [expandedId, setExpandedId] = useState(null);

    // Detail view
    const [detailItem, setDetailItem] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Upload
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);

    useEffect(() => {
        loadAssignments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadAssignments = async () => {
        setLoading(true);
        try {
            const res = await fetchAssigned();
            setAssignments(res.data);
        } catch {
            dispatch(addToast({ type: 'error', message: 'Failed to load assigned reports' }));
        } finally {
            setLoading(false);
        }
    };

    const openDetail = async (item) => {
        setLoadingDetail(true);
        setDetailItem(item); // Optimistic
        setSelectedFile(null);
        try {
            const res = await fetchDetail(item.id);
            setDetailItem(res.data);
        } catch {
            dispatch(addToast({ type: 'error', message: 'Failed to load report details' }));
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) setSelectedFile(file);
    };

    const handleUpload = async () => {
        if (!selectedFile || !detailItem) return;
        if (detailItem.status === 'complete') {
            dispatch(addToast({ type: 'error', message: 'This report is already completed.' }));
            return;
        }
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('document', selectedFile);
            const res = await uploadDoc(detailItem.id, fd);
            dispatch(addToast({ type: 'success', message: 'Document uploaded! Report marked as Complete.' }));
            setDetailItem((prev) => ({ ...prev, ...res.data }));
            setSelectedFile(null);
            // Refresh list
            loadAssignments();
        } catch (err) {
            dispatch(addToast({ type: 'error', message: err?.response?.data?.error || 'Upload failed' }));
        } finally {
            setUploading(false);
        }
    };

    const handleDownloadDoc = async () => {
        if (!detailItem) return;
        try {
            const res = await downloadAssignedDoc(detailItem.id);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.setAttribute('download', detailItem.uploaded_document_name || 'document.pdf');
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch {
            dispatch(addToast({ type: 'error', message: 'Failed to download document' }));
        }
    };

    const handleViewDoc = async () => {
        if (!detailItem) return;
        try {
            const res = await downloadAssignedDoc(detailItem.id);
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            window.open(url, '_blank');
        } catch {
            dispatch(addToast({ type: 'error', message: 'Failed to view document' }));
        }
    };

    /* ── Render detail view ── */
    if (detailItem) {
        return (
            <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] dark:bg-gray-900 dark:text-gray-100">
                <Sidebar onToggle={setSidebarCollapsed} isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
                <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-0 lg:ml-64'}`}>
                    <Navbar variant="app" onMenuToggle={() => setIsMobileMenuOpen((p) => !p)} />
                    <div className="mx-auto px-4 py-8 sm:px-6 lg:px-8">
                        <Card className="bg-white dark:bg-gray-900 border-none shadow-xl ring-1 ring-gray-200 dark:ring-gray-800 p-6 sm:p-8">
                            <CardContent className="p-0 space-y-6">
                                {/* Back button */}
                                <button
                                    type="button"
                                    onClick={() => setDetailItem(null)}
                                    className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-teal-600 dark:text-gray-400 dark:hover:text-teal-400 transition-colors"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Back to Assigned Reports
                                </button>

                                {/* Header */}
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                    <div>
                                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                            <ClipboardList className="h-7 w-7 text-teal-600" />
                                            Assigned Report
                                        </h1>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Patient: <span className="font-semibold text-gray-800 dark:text-white">{detailItem.patient_name}</span>
                                        </p>
                                    </div>
                                    <StatusBadge status={detailItem.status} />
                                </div>

                                {/* Meta grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/30">
                                        <User className="h-4 w-4 text-teal-600 flex-shrink-0" />
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide">Assigned To</p>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{detailItem.assigned_to_name || '—'}</p>
                                            <p className="text-xs text-gray-500">{detailItem.assigned_to_email || ''}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/30">
                                        <Calendar className="h-4 w-4 text-teal-600 flex-shrink-0" />
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide">Assigned On</p>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                {new Date(detailItem.assigned_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/30">
                                        <Cpu className="h-4 w-4 text-teal-600 flex-shrink-0" />
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide">AI Result</p>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${detailItem.ai_status === 'Pass' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {detailItem.ai_status}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Document section */}
                                <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <CardContent className="p-4 space-y-3">
                                        <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                            <FileText className="h-5 w-5 text-teal-600" />
                                            Compliance Document
                                        </h2>

                                        {detailItem.has_document ? (
                                            <div className="flex items-center justify-between flex-wrap gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-lg bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
                                                        <FileText className="h-5 w-5 text-teal-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{detailItem.uploaded_document_name}</p>
                                                        <p className="text-xs text-gray-500">
                                                            Uploaded {detailItem.completed_at ? new Date(detailItem.completed_at).toLocaleDateString() : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button variant="outline" size="sm" onClick={handleViewDoc} className="flex items-center gap-1.5">
                                                        <Eye className="h-4 w-4" />
                                                        View
                                                    </Button>
                                                    <Button variant="outline" size="sm" onClick={handleDownloadDoc} className="flex items-center gap-1.5">
                                                        <Download className="h-4 w-4" />
                                                        Download
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500 italic">No document uploaded yet.</p>
                                        )}

                                        {/* Upload section – only if incomplete */}
                                        {detailItem.status !== 'complete' && (
                                            <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-3">
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Upload Compliance Document</p>
                                                <div
                                                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center cursor-pointer hover:border-teal-400 dark:hover:border-teal-500 transition-colors"
                                                    onClick={() => fileInputRef.current?.click()}
                                                >
                                                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                                    {selectedFile ? (
                                                        <p className="text-sm font-medium text-teal-600">{selectedFile.name}</p>
                                                    ) : (
                                                        <>
                                                            <p className="text-sm text-gray-500">Click to browse or drag and drop</p>
                                                            <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX supported</p>
                                                        </>
                                                    )}
                                                    <input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        className="hidden"
                                                        accept=".pdf,.doc,.docx"
                                                        onChange={handleFileChange}
                                                    />
                                                </div>
                                                {selectedFile && (
                                                    <div className="flex gap-3">
                                                        <Button variant="outline" onClick={() => setSelectedFile(null)} className="flex items-center gap-1.5">
                                                            <X className="h-4 w-4" />
                                                            Clear
                                                        </Button>
                                                        <Button
                                                            variant="primary"
                                                            onClick={handleUpload}
                                                            disabled={uploading}
                                                            className="flex items-center gap-1.5 flex-1"
                                                        >
                                                            <Upload className="h-4 w-4" />
                                                            {uploading ? 'Uploading…' : 'Submit & Mark Complete'}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {detailItem.status === 'complete' && (
                                            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm font-medium bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
                                                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                                                This report has been completed and is now read-only.
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Full AI Report */}
                                <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <CardContent className="p-4 sm:p-6">
                                        <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                                            <FileStack className="h-5 w-5 text-teal-600" />
                                            Full Compliance Audit Report
                                        </h2>
                                        {loadingDetail ? (
                                            <div className="flex items-center gap-3 py-8">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-500" />
                                                <p className="text-sm text-gray-500">Loading report…</p>
                                            </div>
                                        ) : (
                                            <MarkdownReport markdown={detailItem.report_markdown} />
                                        )}
                                    </CardContent>
                                </Card>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    /* ── List view ── */
    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] dark:bg-gray-900 dark:text-gray-100">
            <Sidebar onToggle={setSidebarCollapsed} isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
            <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-0 lg:ml-64'}`}>
                <Navbar variant="app" onMenuToggle={() => setIsMobileMenuOpen((p) => !p)} />
                <div className="mx-auto px-4 py-8 sm:px-6 lg:px-8">
                    <Card className="bg-white dark:bg-gray-900 border-none shadow-xl ring-1 ring-gray-200 dark:ring-gray-800 p-6 sm:p-8">
                        <CardContent className="p-0 space-y-6">
                            {/* Header */}
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl flex items-center gap-3">
                                    <ClipboardList className="h-8 w-8 text-teal-600 dark:text-teal-400" />
                                    Assigned Audit Reports
                                </h1>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    All audit reports assigned to clinicians in your agency.
                                </p>
                            </div>

                            {/* Loading */}
                            {loading && (
                                <div className="flex items-center gap-3 py-12 justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
                                    <p className="text-sm text-gray-500">Loading assignments…</p>
                                </div>
                            )}

                            {/* Empty */}
                            {!loading && assignments.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="h-16 w-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                        <AlertTriangle className="h-8 w-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                                        No assigned reports yet
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                                        Go to the AI Analyzer, open a saved result, and click "Assign" to assign it to a clinician.
                                    </p>
                                </div>
                            )}

                            {/* Assignments list */}
                            {!loading && assignments.length > 0 && (
                                <div className="space-y-4">
                                    {assignments.map((a) => (
                                        <Card key={a.id} className="border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                                            {/* Row header */}
                                            <div className="px-5 py-4 flex items-start justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                                                <button
                                                    type="button"
                                                    className="flex-1 text-left flex items-start gap-4 min-w-0"
                                                    onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                                                >
                                                    <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                        <ClipboardList className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                                                    </div>
                                                    <div className="min-w-0 flex-1 space-y-1">
                                                        <p className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2 flex-wrap">
                                                            {a.patient_name}
                                                            <StatusBadge status={a.status} />
                                                        </p>
                                                        <div className="flex flex-wrap gap-3 mt-1">
                                                            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                                                <User className="h-3.5 w-3.5" />
                                                                {a.assigned_to_name}
                                                            </span>
                                                            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                                                <Calendar className="h-3.5 w-3.5" />
                                                                {new Date(a.assigned_at).toLocaleDateString()}
                                                            </span>
                                                            <span className={`inline-flex items-center gap-1 text-xs font-semibold ${a.ai_status === 'Pass' ? 'text-green-600' : 'text-red-600'}`}>
                                                                AI: {a.ai_status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </button>
                                                <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openDetail(a)}
                                                        className="flex items-center gap-1.5 text-xs"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                        View
                                                    </Button>
                                                    {expandedId === a.id
                                                        ? <ChevronUp className="h-5 w-5 text-gray-400 cursor-pointer" onClick={() => setExpandedId(null)} />
                                                        : <ChevronDown className="h-5 w-5 text-gray-400 cursor-pointer" onClick={() => setExpandedId(a.id)} />
                                                    }
                                                </div>
                                            </div>

                                            {/* Expanded preview */}
                                            {expandedId === a.id && (
                                                <div className="border-t border-gray-200 dark:border-gray-700 px-5 py-4 bg-gray-50/50 dark:bg-gray-800/20 space-y-3">
                                                    <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500">
                                                        <span className="flex items-center gap-1"><FileStack className="h-3.5 w-3.5" />{a.analyzed_document_names?.length ?? 0} document(s) analyzed</span>
                                                        {a.has_document && <span className="flex items-center gap-1.5 text-green-600"><CheckCircle className="h-3.5 w-3.5" />Document uploaded</span>}
                                                        {a.completed_at && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Completed {new Date(a.completed_at).toLocaleDateString()}</span>}
                                                    </div>
                                                    <div className="max-h-56 overflow-y-auto pr-2">
                                                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Report Preview</p>
                                                        <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap line-clamp-6">
                                                            {a.report_markdown?.slice(0, 600)}{a.report_markdown?.length > 600 ? '…' : ''}
                                                        </p>
                                                    </div>
                                                    <Button variant="primary" size="sm" onClick={() => openDetail(a)} className="flex items-center gap-1.5 text-xs">
                                                        <Eye className="h-3.5 w-3.5" />
                                                        Open Full Report
                                                    </Button>
                                                </div>
                                            )}
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default AssignedAuditReportsPage;
