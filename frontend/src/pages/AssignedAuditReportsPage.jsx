import { useState, useEffect, useRef, useContext } from 'react';
import { useDispatch } from 'react-redux';
import {
    ClipboardList, CheckCircle, Clock, User, Calendar, ChevronDown,
    ChevronUp, Upload, Eye, Download, X, FileText, ArrowLeft, Cpu,
    FileStack, AlertTriangle, Bot, Paperclip, FileBadge, Shield, Info,
    ChevronRight, ChevronLeft, Lock, Unlock
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
import { documentService } from '../services/document.service';
import AuthContext from '../context/AuthContext';

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
    a: ({ children }) => <span className="font-semibold text-gray-900 dark:text-white">{children}</span>,
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

/* ─── AI Result Badge ─────────────────────────────────────────────────────── */
const AiResultBadge = ({ status }) => {
    const isPass = status === 'Pass';
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${isPass
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            }`}>
            <Shield className="h-3.5 w-3.5" />
            AI: {status}
        </span>
    );
};

/* ─── Document type label helper ─────────────────────────────────────────── */
const DOC_TYPE_LABELS = {
    election_statement: 'Election Statement',
    cti_initial: 'CTI – Initial',
    cti_recertification: 'CTI – Recertification',
    rn_assessment: 'RN Initial Assessment',
    comprehensive_assessment: 'Comprehensive Assessment',
    plan_of_care: 'Plan of Care',
    f2f_encounter: 'Face-to-Face Encounter',
    clinical_notes: 'Clinical Notes',
    physician_orders: 'Physician Orders',
    other: 'Other',
};

/* ─── Main Page ───────────────────────────────────────────────────────────── */
const AssignedAuditReportsPage = () => {
    const dispatch = useDispatch();
    const { user } = useContext(AuthContext);
    const isClinician = user?.role === 'clinician';
    const isQa = user?.role === 'qa_compliance';
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
    const [dragActive, setDragActive] = useState(false);

    // Doc download loading states
    const [downloadingDocId, setDownloadingDocId] = useState(null);

    // Upload Sidebar collapse state
    const [uploadSidebarCollapsed, setUploadSidebarCollapsed] = useState(false);

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

    const handleDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (file) setSelectedFile(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragActive(true);
    };

    const handleDragLeave = () => setDragActive(false);

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
            setDetailItem((prev) => ({
                ...prev,
                status: res.data?.status ?? 'complete',
                has_document: res.data?.has_document ?? true,
                uploaded_document_name: res.data?.uploaded_document_name ?? prev.uploaded_document_name,
                completed_at: res.data?.completed_at ?? prev.completed_at,
            }));
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

    const handleViewAnalyzedDoc = async (docId, filename) => {
        if (!detailItem?.id) return;
        setDownloadingDocId(docId);
        try {
            const res = await documentService.downloadAnalyzedSourceFromAssignment(detailItem.id, docId);
            const mimeType = filename.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';
            const url = window.URL.createObjectURL(new Blob([res.data], { type: mimeType }));
            window.open(url, '_blank');
        } catch {
            dispatch(addToast({ type: 'error', message: `Failed to open ${filename}` }));
        } finally {
            setDownloadingDocId(null);
        }
    };

    const handleDownloadAnalyzedDoc = async (docId, filename) => {
        if (!detailItem?.id) return;
        setDownloadingDocId(docId);
        try {
            const res = await documentService.downloadAnalyzedSourceFromAssignment(detailItem.id, docId);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.setAttribute('download', filename);
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch {
            dispatch(addToast({ type: 'error', message: `Failed to download ${filename}` }));
        } finally {
            setDownloadingDocId(null);
        }
    };

    /* ── Render detail view ── */
    if (detailItem) {
        const isComplete = detailItem.status === 'complete';
        const analyzedDocs = detailItem.analyzed_documents || [];

        return (
            <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] dark:bg-gray-950 dark:text-gray-100">
                <Sidebar onToggle={setSidebarCollapsed} isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
                <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-0 lg:ml-64'}`}>
                    <Navbar variant="app" onMenuToggle={() => setIsMobileMenuOpen((p) => !p)} />

                    {/* ── Two-column layout wrapper ── */}
                    <div className="mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8 h-[calc(100vh-64px)] max-w-[1600px] flex flex-col w-full">
                        <Card className="bg-white dark:bg-gray-900 border-none shadow-xl ring-1 ring-gray-200 dark:ring-gray-800 overflow-hidden flex-1 flex flex-col rounded-xl">
                            <CardContent className="p-0 flex-1 flex flex-col lg:flex-row overflow-hidden relative">

                                {/* ── LEFT: Scrollable content column ── */}
                                <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
                                    <div className="max-w-4xl mx-auto space-y-5">

                                        {/* Back button */}
                                        <button
                                            type="button"
                                            onClick={() => setDetailItem(null)}
                                            className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-teal-600 dark:text-gray-400 dark:hover:text-teal-400 transition-colors group"
                                        >
                                            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                                            Back to Assigned Reports
                                        </button>

                                        {/* ── Page Header ── */}
                                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 sm:p-6">
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="h-11 w-11 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center flex-shrink-0">
                                                        <ClipboardList className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                                                    </div>
                                                    <div>
                                                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                                            Assigned Report
                                                        </h1>
                                                        <p className="text-sm text-gray-500 mt-0.5">
                                                            Patient:{' '}
                                                            <span className="font-semibold text-gray-800 dark:text-gray-200">
                                                                {detailItem.patient_name}
                                                            </span>
                                                        </p>
                                                        {(isClinician || isQa) && user?.username && (
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                <span className="font-medium text-gray-600 dark:text-gray-300">Username</span>{' '}
                                                                <span className="font-semibold text-gray-800 dark:text-gray-200">{user.username}</span>
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <AiResultBadge status={detailItem.ai_status} />
                                                    <StatusBadge status={detailItem.status} />
                                                </div>
                                            </div>

                                            {/* Meta pills */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
                                                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40">
                                                    <User className="h-4 w-4 text-teal-600 flex-shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-0.5">Assigned To</p>
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{detailItem.assigned_to_name || '—'}</p>
                                                        <p className="text-xs text-gray-400 truncate">{detailItem.assigned_to_email || ''}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40">
                                                    <Calendar className="h-4 w-4 text-teal-600 flex-shrink-0" />
                                                    <div>
                                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-0.5">Assigned On</p>
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                            {new Date(detailItem.assigned_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40">
                                                    <Cpu className="h-4 w-4 text-teal-600 flex-shrink-0" />
                                                    <div>
                                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-0.5">AI Model</p>
                                                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{detailItem.ai_model_used || '—'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ── AI-Analyzed Documents Section ── */}
                                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-teal-200 dark:border-teal-800/50 shadow-sm overflow-hidden">
                                            {/* Header */}
                                            <div className="px-5 py-4 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/10 border-b border-teal-100 dark:border-teal-800/40 flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-teal-500 flex items-center justify-center flex-shrink-0">
                                                    <Bot className="h-4 w-4 text-white" />
                                                </div>
                                                <div className="flex-1">
                                                    <h2 className="text-sm font-bold text-teal-900 dark:text-teal-100">
                                                        AI-Analyzed Source Documents
                                                    </h2>
                                                    <p className="text-xs text-teal-600 dark:text-teal-400 mt-0.5">
                                                        These are the clinical documents that were submitted to the AI for compliance analysis
                                                    </p>
                                                </div>
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-700 dark:bg-teal-800/40 dark:text-teal-300">
                                                    {analyzedDocs.length > 0 ? analyzedDocs.length : (detailItem.analyzed_document_names?.length ?? 0)} file{analyzedDocs.length !== 1 ? 's' : ''}
                                                </span>
                                            </div>

                                            {/* Document list */}
                                            <div className="p-4 space-y-2">
                                                {analyzedDocs.length > 0 ? (
                                                    analyzedDocs.map((doc) => (
                                                        <div
                                                            key={doc.id}
                                                            className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30 hover:bg-teal-50/40 dark:hover:bg-teal-900/10 transition-colors group"
                                                        >
                                                            <div className="h-9 w-9 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                                                                <FileText className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{doc.filename}</p>
                                                                <div className="flex items-center gap-3 mt-0.5">
                                                                    <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                                                        {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                                                                    </span>
                                                                    <span className="text-xs text-gray-400">{doc.file_size_mb} MB</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    className="flex items-center gap-1.5 text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline disabled:opacity-50 px-2 py-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
                                                                    onClick={() => handleViewAnalyzedDoc(doc.id, doc.filename)}
                                                                    disabled={downloadingDocId === doc.id}
                                                                >
                                                                    {downloadingDocId === doc.id
                                                                        ? <span className="h-3.5 w-3.5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                                                                        : <Eye className="h-3.5 w-3.5" />
                                                                    }
                                                                    View
                                                                </button>
                                                                <button
                                                                    className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                                                    onClick={() => handleDownloadAnalyzedDoc(doc.id, doc.filename)}
                                                                    disabled={downloadingDocId === doc.id}
                                                                >
                                                                    <Download className="h-3.5 w-3.5" />
                                                                    Download
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    /* Fallback: show just filenames if IDs not available */
                                                    (detailItem.analyzed_document_names || []).length > 0
                                                        ? (detailItem.analyzed_document_names || []).map((name, i) => (
                                                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30">
                                                                <div className="h-9 w-9 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                                                                    <FileText className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                                                                </div>
                                                                <p className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">{name}</p>
                                                                <span className="text-xs text-gray-400 italic">No download available</span>
                                                            </div>
                                                        ))
                                                        : (
                                                            <p className="text-sm text-gray-400 italic text-center py-4">No source documents found.</p>
                                                        )
                                                )}
                                            </div>

                                            {/* Info note */}
                                            <div className="px-5 py-3 bg-teal-50/50 dark:bg-teal-900/10 border-t border-teal-100 dark:border-teal-800/30 flex items-center gap-2">
                                                <Info className="h-3.5 w-3.5 text-teal-500 flex-shrink-0" />
                                                <p className="text-xs text-teal-600 dark:text-teal-400">
                                                    These documents were used as the source data for the AI compliance analysis report below.
                                                </p>
                                            </div>
                                        </div>

                                        {/* ── Full AI Report ── */}
                                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                                            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                                                    <FileStack className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                                <div>
                                                    <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                                                        Full Compliance Audit Report
                                                    </h2>
                                                    <p className="text-xs text-gray-400">AI-generated, read-only</p>
                                                </div>
                                            </div>
                                            <div className="p-5 sm:p-6">
                                                {loadingDetail ? (
                                                    <div className="flex items-center gap-3 py-12 justify-center">
                                                        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-teal-500" />
                                                        <p className="text-sm text-gray-500">Loading compliance report…</p>
                                                    </div>
                                                ) : (
                                                    <MarkdownReport markdown={detailItem.report_markdown} />
                                                )}
                                            </div>
                                        </div>

                                        {/* Bottom padding for breathing room */}
                                        <div className="h-6" />
                                    </div>
                                </div>

                                {/* ── RIGHT: Sticky upload sidebar ── */}
                                <div className={`hidden lg:flex flex-col flex-shrink-0 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-y-auto transition-all duration-300 ${uploadSidebarCollapsed ? 'w-20' : 'w-80 xl:w-96'}`}>
                                    {uploadSidebarCollapsed ? (
                                        <div className="flex flex-col items-center py-5 space-y-4 h-full">
                                            <button
                                                onClick={() => setUploadSidebarCollapsed(false)}
                                                className="p-2 rounded-xl text-teal-600 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors"
                                                title="Expand Upload Section"
                                            >
                                                <ChevronLeft className="h-5 w-5" />
                                            </button>
                                            <div className="h-px w-8 bg-gray-200 dark:bg-gray-800 my-2" />
                                            <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-400" title="Compliance Document">
                                                <Paperclip className="h-5 w-5" />
                                            </div>
                                            <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-400" title="Upload Document">
                                                <Upload className="h-5 w-5" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-5 space-y-5 flex-1">

                                            {/* Panel header */}
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Paperclip className="h-4 w-4 text-teal-600" />
                                                        <h2 className="text-sm font-bold text-gray-900 dark:text-white">Compliance Document</h2>
                                                    </div>
                                                    <p className="text-xs text-gray-400 leading-relaxed">
                                                        Upload the completed compliance document for this assigned report.
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => setUploadSidebarCollapsed(true)}
                                                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ml-2"
                                                    title="Collapse Upload Section"
                                                >
                                                    <ChevronRight className="h-5 w-5" />
                                                </button>
                                            </div>

                                            {/* Divider */}
                                            <div className="border-t border-gray-100 dark:border-gray-800" />

                                            {/* Existing uploaded document */}
                                            {detailItem.has_document && (
                                                <div className="space-y-2">
                                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Uploaded Document</p>
                                                    <div className="p-3.5 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/40">
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <div className="h-9 w-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                                                                <FileBadge className="h-5 w-5 text-green-600 dark:text-green-400" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                                                    {detailItem.uploaded_document_name}
                                                                </p>
                                                                {detailItem.completed_at && (
                                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                                        {new Date(detailItem.completed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={handleViewDoc}
                                                                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400 bg-white dark:bg-gray-800 border border-teal-200 dark:border-teal-700 rounded-lg px-3 py-2 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
                                                            >
                                                                <Eye className="h-3.5 w-3.5" />
                                                                View
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleDownloadDoc}
                                                                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                                            >
                                                                <Download className="h-3.5 w-3.5" />
                                                                Download
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Upload area */}
                                            {isComplete ? (
                                                /* Completed state */
                                                <div className="rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 p-4">
                                                    <div className="flex items-center gap-2.5 mb-2">
                                                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                                        <p className="text-sm font-bold text-green-800 dark:text-green-300">Report Completed</p>
                                                    </div>
                                                    <p className="text-xs text-green-600 dark:text-green-400 leading-relaxed">
                                                        This report has been marked as complete and the compliance document has been submitted. No further uploads are required.
                                                    </p>
                                                    <div className="flex items-center gap-1.5 mt-3 text-xs text-green-500">
                                                        <Lock className="h-3 w-3" />
                                                        This section is now read-only
                                                    </div>
                                                </div>
                                            ) : (
                                                /* Upload form */
                                                <div className="space-y-4">
                                                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-widest">
                                                        {detailItem.has_document ? 'Replace Document' : 'Upload New Document'}
                                                    </p>

                                                    {/* Drop zone */}
                                                    <div
                                                        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 ${dragActive
                                                            ? 'border-teal-400 bg-teal-50 dark:bg-teal-900/10'
                                                            : selectedFile
                                                                ? 'border-teal-400 bg-teal-50/50 dark:bg-teal-900/5'
                                                                : 'border-gray-300 dark:border-gray-700 hover:border-teal-400 dark:hover:border-teal-600 hover:bg-gray-50 dark:hover:bg-gray-800/40'
                                                            }`}
                                                        onClick={() => fileInputRef.current?.click()}
                                                        onDrop={handleDrop}
                                                        onDragOver={handleDragOver}
                                                        onDragLeave={handleDragLeave}
                                                    >
                                                        {selectedFile ? (
                                                            <div className="space-y-2">
                                                                <div className="h-10 w-10 mx-auto rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                                                                    <FileText className="h-5 w-5 text-teal-600" />
                                                                </div>
                                                                <p className="text-sm font-semibold text-teal-700 dark:text-teal-400 break-all">
                                                                    {selectedFile.name}
                                                                </p>
                                                                <p className="text-xs text-gray-400">
                                                                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB — Click to change
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                <div className="h-10 w-10 mx-auto rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                                    <Upload className="h-5 w-5 text-gray-400" />
                                                                </div>
                                                                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                                                    Drop file here or click to browse
                                                                </p>
                                                                <p className="text-xs text-gray-400">PDF, DOC, DOCX supported</p>
                                                            </div>
                                                        )}
                                                        <input
                                                            ref={fileInputRef}
                                                            type="file"
                                                            className="hidden"
                                                            accept=".pdf,.doc,.docx"
                                                            onChange={handleFileChange}
                                                        />
                                                    </div>

                                                    {/* Action buttons */}
                                                    {selectedFile ? (
                                                        <div className="space-y-2">
                                                            <button
                                                                type="button"
                                                                onClick={handleUpload}
                                                                disabled={uploading}
                                                                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
                                                            >
                                                                {uploading ? (
                                                                    <>
                                                                        <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                                        Uploading…
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Upload className="h-4 w-4" />
                                                                        Submit &amp; Mark Complete
                                                                    </>
                                                                )}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedFile(null)}
                                                                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                                            >
                                                                <X className="h-4 w-4" />
                                                                Clear Selection
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 text-xs text-amber-500 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-lg px-3 py-2">
                                                            <Unlock className="h-3 w-3 flex-shrink-0" />
                                                            Select a file above to upload &amp; complete this report
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Divider */}
                                            <div className="border-t border-gray-100 dark:border-gray-800" />

                                            {/* Quick info panel */}
                                            <div className="space-y-3">
                                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Report Summary</p>
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="text-gray-500">AI Result</span>
                                                        <AiResultBadge status={detailItem.ai_status} />
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="text-gray-500">Status</span>
                                                        <StatusBadge status={detailItem.status} />
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="text-gray-500">Source Documents</span>
                                                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                                                            {(analyzedDocs.length || detailItem.analyzed_document_names?.length) ?? 0} file(s)
                                                        </span>
                                                    </div>
                                                    {detailItem.completed_at && (
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="text-gray-500">Completed On</span>
                                                            <span className="font-semibold text-gray-800 dark:text-gray-200">
                                                                {new Date(detailItem.completed_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* ── MOBILE: Upload section at bottom (only visible on small screens) ── */}
                                <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 z-30">
                                    {isComplete ? (
                                        <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 font-medium">
                                            <CheckCircle className="h-4 w-4" />
                                            Report completed — read-only
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-teal-700 border-2 border-teal-200 hover:bg-teal-50 transition-colors"
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                <Upload className="h-4 w-4" />
                                                {selectedFile ? selectedFile.name.slice(0, 20) + '…' : 'Choose File'}
                                            </button>
                                            {selectedFile && (
                                                <button
                                                    type="button"
                                                    onClick={handleUpload}
                                                    disabled={uploading}
                                                    className="flex items-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60 transition-colors"
                                                >
                                                    {uploading ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Upload className="h-4 w-4" />}
                                                    Submit
                                                </button>
                                            )}
                                            <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleFileChange} />
                                        </div>
                                    )}
                                </div>
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
                                    {isClinician
                                        ? 'Audit reports assigned to you. Review the AI analysis and submit your compliance document to complete each report.'
                                        : 'All audit reports assigned to clinicians in your agency.'}
                                </p>
                                {(isClinician || isQa) && user?.username && (
                                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                        <span className="text-gray-500 dark:text-gray-400">Username</span>{' '}
                                        <span className="font-semibold text-gray-900 dark:text-white">{user.username}</span>
                                        {user?.email ? (
                                            <>
                                                <span className="mx-2 text-gray-300 dark:text-gray-600" aria-hidden="true">
                                                    ·
                                                </span>
                                                <span className="text-gray-500 dark:text-gray-400">Email</span>{' '}
                                                <span className="font-medium text-gray-800 dark:text-gray-200 truncate inline-block max-w-[220px] align-bottom">
                                                    {user.email}
                                                </span>
                                            </>
                                        ) : null}
                                    </p>
                                )}
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
                                        {isClinician
                                            ? 'You have no audit reports assigned to you at this time. Please check back later or contact your agency admin.'
                                            : 'Go to the AI Analyzer, open a saved result, and click "Assign" to assign it to a clinician.'}
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
