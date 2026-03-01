import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
    Brain, FileText, ArrowLeft, Download, Eye, Calendar,
    Cpu, CheckCircle, XCircle, UserCheck, ClipboardList,
    X, Users, FileCheck, Clock, FolderOpen,
    Search, ChevronUp, ChevronDown
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import Button from '../components/ui/Button';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import { documentService } from '../services/document.service';
import { addToast } from '../store/slices/uiSlice';
import api from '../services/api';

/* ─── API helpers ─────────────────────────────────────────────────────────── */
const fetchResultDetail = (id) => api.get(`/ai/mistral/results/${id}/detail/`);
const fetchClinicians = () => api.get('/ai/mistral/clinicians/');
const assignReport = (payload) => api.post('/ai/mistral/assign/', payload);
const saveResult = (payload) => api.post('/ai/mistral/save/', payload);

// Download clinician document via the AssignedAuditReport download endpoint
const downloadAssignmentDoc = (assignmentId) =>
    api.get(`/ai/mistral/assigned/${assignmentId}/download_document/`, { responseType: 'blob' });

/* ─── Markdown config ─────────────────────────────────────────────────────── */
const MD_PLUGINS = [remarkGfm, remarkBreaks];

const mdComponents = {
    strong: ({ children }) => (
        <strong className="text-gray-900 dark:text-white font-semibold">{children}</strong>
    ),
    hr: () => <hr className="my-6 border-gray-200 dark:border-gray-700" />,
    blockquote: ({ children }) => (
        <blockquote className="not-italic border-l-4 border-teal-400 bg-teal-50 dark:bg-teal-900/10
      px-4 py-3 rounded-r-lg my-4 text-gray-700 dark:text-gray-300 text-sm">
            {children}
        </blockquote>
    ),
    h1: ({ children }) => (
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-0 mb-4 pb-3
      border-b-2 border-teal-200 dark:border-teal-800">
            {children}
        </h1>
    ),
    h2: ({ children }) => (
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mt-8 mb-3 pb-2
      border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            {children}
        </h2>
    ),
    h3: ({ children }) => (
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mt-6 mb-2">
            {children}
        </h3>
    ),
    p: ({ children }) => (
        <p className="leading-relaxed text-sm text-gray-700 dark:text-gray-300 my-1">{children}</p>
    ),
    li: ({ children }) => (
        <li className="text-sm text-gray-700 dark:text-gray-300 my-0.5">{children}</li>
    ),
    code: ({ children }) => (
        <code className="text-teal-700 dark:text-teal-300 bg-teal-50
      dark:bg-teal-900/20 px-1.5 py-0.5 rounded text-xs font-mono">
            {children}
        </code>
    ),
    table: ({ children }) => (
        <div className="overflow-x-auto my-4">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm border
        border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                {children}
            </table>
        </div>
    ),
    thead: ({ children }) => (
        <thead className="bg-gray-100 dark:bg-gray-800">{children}</thead>
    ),
    th: ({ children }) => (
        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600
      dark:text-gray-300 uppercase tracking-wider">
            {children}
        </th>
    ),
    td: ({ children }) => (
        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 border-t
      border-gray-100 dark:border-gray-800">
            {children}
        </td>
    ),
    a: ({ children }) => (
        <span className="font-semibold text-gray-900 dark:text-white">
            {children}
        </span>
    ),
};

/* ─── Document Action Row ─────────────────────────────────────────────────── */
const DocumentRow = ({ doc, onView, onDownload }) => (
    <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-teal-300 dark:hover:border-teal-700 transition-colors group">
        <div className="h-10 w-10 rounded-lg bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center flex-shrink-0">
            <FileText className="h-5 w-5 text-teal-600 dark:text-teal-400" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{doc.filename}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {doc.document_type
                    ? doc.document_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                    : ''}
                {doc.file_size_mb != null ? ` · ${doc.file_size_mb} MB` : ''}
            </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
            <button
                onClick={() => onView(doc)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                    bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300
                    hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800
                    transition-colors cursor-pointer"
            >
                <Eye className="h-3.5 w-3.5" />
                View
            </button>
            <button
                onClick={() => onDownload(doc)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                    bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300
                    hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700
                    transition-colors cursor-pointer"
            >
                <Download className="h-3.5 w-3.5" />
                Download
            </button>
        </div>
    </div>
);

/* ─── Clinician Doc Row (submission read-only) ────────────────────────────── */
/* ─── Clinician Document Action Row ───────────────────────────────────────── */
const ClinicianDocRow = ({ name, submittedAt, clinicianName, onView, onDownload, onAnalyze }) => (
    <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800/50 rounded-xl border border-emerald-200 dark:border-emerald-800 transition-colors">
        <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
            <FileCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {clinicianName ? `Submitted by ${clinicianName}` : 'Submitted'}
                {submittedAt ? ` · ${new Date(submittedAt).toLocaleString()}` : ''}
            </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
            {onAnalyze && (
                <button
                    onClick={onAnalyze}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                        bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300
                        hover:bg-teal-100 dark:hover:bg-teal-900/50 border border-teal-200 dark:border-teal-800
                        transition-colors cursor-pointer mr-1"
                >
                    <Cpu className="h-3.5 w-3.5" />
                    Analyze
                </button>
            )}
            <button
                onClick={onView}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                    bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300
                    hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800
                    transition-colors cursor-pointer"
            >
                <Eye className="h-3.5 w-3.5" />
                View
            </button>
            <button
                onClick={onDownload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                    bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300
                    hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700
                    transition-colors cursor-pointer"
            >
                <Download className="h-3.5 w-3.5" />
                Download
            </button>
        </div>
    </div>
);

/* ─── Full-screen "Analyzing…" overlay ───────────────────────────────────── */
const AnalyzingOverlay = () => (
    /* z-[200] → always above the Navbar (z-50) */
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gray-900/80 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-10
      flex flex-col items-center gap-6 max-w-sm w-full mx-4">
            <div className="relative flex items-center justify-center">
                <div className="absolute h-20 w-20 rounded-full border-4 border-teal-500/30 animate-ping" />
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-teal-400 to-indigo-500
          flex items-center justify-center shadow-lg">
                    <Brain className="h-8 w-8 text-white animate-pulse" />
                </div>
            </div>
            <div className="text-center">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight mb-2">
                    Analyzing Document…
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-[260px] mx-auto">
                    The AI is currently processing the submitted clinician document.
                    This usually takes 10 to 30 seconds.
                </p>
            </div>
            {/* Minimal progress bar effect */}
            <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-teal-500 rounded-full animate-[progress_2s_ease-in-out_infinite]"
                    style={{ width: '40%', transformOrigin: '0% 50%' }}
                />
            </div>
        </div>
    </div>
);

/* ─── ResultModal – shows the newly generated report ─────────────────────── */
const ResultModal = ({ result, onClose, mdComponents }) => (
    <div className="fixed inset-0 z-[200] flex flex-col">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm" onClick={onClose} />

        {/* Dialog – centred but pushed below navbar height (64px / pt-16) */}
        <div className="relative flex-1 flex items-center justify-center p-4 pt-20">
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl
        flex flex-col w-full max-w-5xl"
                style={{ maxHeight: 'calc(100vh - 96px)' }}
            >
                {/* Modal header */}
                <div className="flex items-center justify-between px-6 py-4 border-b
          border-gray-200 dark:border-gray-700 flex-shrink-0 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30
              flex items-center justify-center">
                            <Brain className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                                AI Compliance Audit Report
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Generated by Mistral · {result.ai_model}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100
              dark:hover:bg-gray-800 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-6 py-6 border-b border-gray-200 dark:border-gray-800">
                    <div className="prose prose-sm prose-gray dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={mdComponents}>
                            {result.report_markdown}
                        </ReactMarkdown>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 flex flex-shrink-0 justify-end gap-3 rounded-b-2xl bg-gray-50 dark:bg-gray-800/20">
                    <Button variant="primary" onClick={onClose} className="px-6">Close</Button>
                </div>
            </div>
        </div>
    </div>
);

/* ─── Searchable Clinician Select ─────────────────────────────────────────── */
const SearchableClinicianSelect = ({ clinicians, value, onChange }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef(null);
    const searchRef = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
                setQuery('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (open && searchRef.current) searchRef.current.focus();
    }, [open]);

    const filtered = clinicians.filter(c =>
        `${c.full_name} ${c.email}`.toLowerCase().includes(query.toLowerCase())
    );
    const selected = clinicians.find(c => c.id === value);

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={`w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm
                bg-white dark:bg-gray-800 text-left transition-colors
                ${open ? 'border-teal-500 ring-2 ring-teal-500/20' : 'border-gray-300 dark:border-gray-700 hover:border-teal-400'}
                text-gray-900 dark:text-white focus:outline-none`}
            >
                <span className={selected ? '' : 'text-gray-400 dark:text-gray-500'}>
                    {selected ? selected.full_name : 'Select a clinician…'}
                </span>
                {open
                    ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                }
            </button>
            {open && (
                <div className="absolute z-[200] mt-1 w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-600">
                            <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <input
                                ref={searchRef}
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Search clinicians…"
                                className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
                            />
                        </div>
                    </div>
                    <ul className="max-h-52 overflow-y-auto py-1">
                        {filtered.length === 0 ? (
                            <li className="px-4 py-4 text-sm text-gray-400 text-center">No clinicians found</li>
                        ) : filtered.map(c => (
                            <li key={c.id}>
                                <button
                                    type="button"
                                    onClick={() => { onChange(c.id); setOpen(false); setQuery(''); }}
                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors
                                    ${value === c.id
                                            ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 font-medium'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                                >
                                    <span className="font-medium">{c.full_name}</span>
                                    <span className="ml-2 text-xs text-gray-400">{c.email}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

/* ─── Main Page ───────────────────────────────────────────────────────────── */
const AiReportDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);

    /* Analysis state */
    const [analyzing, setAnalyzing] = useState(false);
    const [pendingResult, setPendingResult] = useState(null);

    /* Assign modal */
    const [clinicians, setClinicians] = useState([]);
    const [showAssignDropdown, setShowAssignDropdown] = useState(false);
    const [showConfirmAssign, setShowConfirmAssign] = useState(false);
    const [selectedClinician, setSelectedClinician] = useState('');
    const [assigning, setAssigning] = useState(false);

    /* Load data */
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [resDetail, resClinicians] = await Promise.all([
                    fetchResultDetail(id),
                    fetchClinicians(),
                ]);
                setResult(resDetail.data);
                setClinicians(resClinicians.data ?? []);
            } catch {
                dispatch(addToast({ type: 'error', message: 'Failed to load report details' }));
                navigate('/ai-analyzer');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    /* ── Back navigation: restore Results tab + patient ── */
    const handleBack = () => {
        // Pass state so AiAnalyzerPage restores the correct tab + patient
        navigate('/ai-analyzer', {
            state: {
                tab: 'result',
                patientId: result?.patient_id || null,
            },
        });
    };

    /* ── Source document actions ── */
    const handleViewDoc = async (doc) => {
        try {
            const response = await documentService.downloadDocument(doc.id);
            const contentType =
                response.headers?.['content-type'] ||
                response.headers?.get?.('content-type') ||
                'application/pdf';
            const blob = new Blob([response.data], { type: contentType });
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => window.URL.revokeObjectURL(url), 60000);
        } catch {
            dispatch(addToast({ type: 'error', message: 'Failed to open document' }));
        }
    };

    const handleDownloadDoc = async (doc) => {
        try {
            const response = await documentService.downloadDocument(doc.id);
            const blob = new Blob([response.data], { type: 'application/octet-stream' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = doc.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => window.URL.revokeObjectURL(url), 60000);
        } catch {
            dispatch(addToast({ type: 'error', message: 'Failed to download document' }));
        }
    };

    /* ── Clinician document (from AssignedAuditReport) actions ── */
    const handleViewClinicianDoc = async () => {
        if (!result?.clinician_assignment_id) return;
        try {
            const response = await downloadAssignmentDoc(result.clinician_assignment_id);
            const blob = new Blob([response.data], {
                type: response.headers?.['content-type'] || 'application/octet-stream',
            });
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => window.URL.revokeObjectURL(url), 60000);
        } catch {
            dispatch(addToast({ type: 'error', message: 'Failed to open clinician document' }));
        }
    };

    const handleDownloadClinicianDoc = async () => {
        if (!result?.clinician_assignment_id) return;
        try {
            const response = await downloadAssignmentDoc(result.clinician_assignment_id);
            const blob = new Blob([response.data], {
                type: response.headers?.['content-type'] || 'application/octet-stream',
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = result.clinician_document_name || 'clinician_document';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => window.URL.revokeObjectURL(url), 60000);
        } catch {
            dispatch(addToast({ type: 'error', message: 'Failed to download clinician document' }));
        }
    };

    /* ── Assign handlers ── */
    const handleConfirmAssign = async () => {
        if (!selectedClinician) return;
        setAssigning(true);
        try {
            await assignReport({ analysis_result_id: id, clinician_id: selectedClinician });
            dispatch(addToast({ type: 'success', message: 'Report assigned successfully!' }));
            setResult(prev => ({ ...prev, is_assigned: true }));
            setShowConfirmAssign(false);
            setShowAssignDropdown(false);
            setSelectedClinician('');
        } catch (err) {
            dispatch(addToast({ type: 'error', message: err?.response?.data?.error || 'Failed to assign report' }));
        } finally {
            setAssigning(false);
        }
    };

    const handleAnalyzeClinicianDocument = async () => {
        if (!result?.clinician_assignment_id) return;
        setAnalyzing(true);
        try {
            const res = await api.post('/ai/mistral/analyze_assignment/', {
                assignment_id: result.clinician_assignment_id
            });
            const analysisData = res.data;

            let docStatus = 'Fail';
            const findingsMatch = analysisData.report_markdown.match(/Total\s+Findings\D*(\d+)/i);
            if (findingsMatch) {
                docStatus = parseInt(findingsMatch[1], 10) === 0 ? 'Pass' : 'Fail';
            } else {
                const scoreMatch = analysisData.report_markdown.match(/Compliance\s+Score\s*:\s*(\d+)\s*\/\s*100/i);
                if (scoreMatch) {
                    docStatus = parseInt(scoreMatch[1], 10) >= 85 ? 'Pass' : 'Fail';
                } else {
                    const riskMatch = analysisData.report_markdown.match(/Overall\s+Risk\s+Level\s*:.*?(CRITICAL|HIGH|MEDIUM|LOW|NONE)/i);
                    if (riskMatch && (riskMatch[1].toUpperCase() === 'LOW' || riskMatch[1].toUpperCase() === 'NONE')) {
                        docStatus = 'Pass';
                    }
                }
            }

            const saveRes = await saveResult({
                patient_id: analysisData.patient_info.patient_id,
                report_markdown: analysisData.report_markdown,
                document_names: analysisData.document_names,
                ai_model_used: 'open-mistral-nemo',
                status: docStatus,
            });

            setPendingResult({
                id: saveRes.data.id,
                patient_name: `${analysisData.patient_info.first_name} ${analysisData.patient_info.last_name}`,
                report_markdown: analysisData.report_markdown,
                ai_model: 'open-mistral-nemo',
            });

            dispatch(addToast({ type: 'success', message: 'Report generated and saved automatically.' }));

        } catch (error) {
            console.error(error);
            dispatch(addToast({ type: 'error', message: 'Analysis failed. Make sure the document is a valid format.' }));
        } finally {
            setAnalyzing(false);
        }
    };

    /* ── Loading ── */
    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--background)] dark:bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500" />
            </div>
        );
    }

    if (!result) return null;

    const isPassed = result.status === 'Pass';
    const isDocSubmitted = result.clinician_document_status === 'submitted';

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] dark:bg-gray-900 dark:text-gray-100">
            <Sidebar
                onToggle={setSidebarCollapsed}
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />
            <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-0 lg:ml-64'}`}>
                <Navbar variant="app" onMenuToggle={() => setIsMobileMenuOpen(p => !p)} />

                <div className="mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-5xl">

                    {/* ── Back button ── */}
                    <button
                        onClick={handleBack}
                        className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-5 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back to Results
                    </button>

                    {/* ── Page header ── */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-7">
                        <div className="flex items-start gap-3">
                            <div className="h-11 w-11 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Brain className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                                    AI Compliance Audit Report
                                </h1>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{result.patient_name}</span>
                                    <span className="text-gray-300 dark:text-gray-600">·</span>
                                    <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                                        <Calendar className="h-3.5 w-3.5" />
                                        {new Date(result.created_at).toLocaleString()}
                                    </span>
                                    <span className="text-gray-300 dark:text-gray-600">·</span>
                                    <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                                        <Cpu className="h-3.5 w-3.5" />
                                        {result.ai_model_used}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Action badges */}
                        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                            {/* Doc status */}
                            {!isPassed && (
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border
                                    ${isDocSubmitted
                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                        : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                    }`}>
                                    {isDocSubmitted
                                        ? <><FileCheck className="h-3.5 w-3.5" /> Document Submitted</>
                                        : <><Clock className="h-3.5 w-3.5" /> Document Pending</>
                                    }
                                </span>
                            )}

                            {/* Pass/Fail status */}
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border
                                ${isPassed
                                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                                }`}>
                                {isPassed
                                    ? <><CheckCircle className="h-3.5 w-3.5" /> Pass</>
                                    : <><XCircle className="h-3.5 w-3.5" /> Fail</>
                                }
                            </span>

                            {/* Assign button (only Fail reports) */}
                            {!isPassed && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!result.is_assigned) {
                                            setShowAssignDropdown(true);
                                            setShowConfirmAssign(false);
                                            setSelectedClinician('');
                                        }
                                    }}
                                    disabled={result.is_assigned}
                                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors
                                        ${result.is_assigned
                                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 cursor-not-allowed'
                                            : 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 border-teal-200 dark:border-teal-800 cursor-pointer'
                                        }`}
                                    title={result.is_assigned ? 'Already assigned' : 'Assign to a clinician'}
                                >
                                    {result.is_assigned
                                        ? <><CheckCircle className="h-4 w-4" /> Assigned</>
                                        : <><UserCheck className="h-4 w-4" /> Assign</>
                                    }
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ══════════════════════════════════════════════════════════
                        SECTION 1 – AI-Analyzed Source Documents
                    ══════════════════════════════════════════════════════════ */}
                    <Card className="mb-6 border border-gray-200 dark:border-gray-800 shadow-sm">
                        <CardHeader className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 py-3 px-5">
                            <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <FolderOpen className="h-4 w-4 text-teal-500" />
                                AI-Analyzed Source Documents
                            </h2>
                        </CardHeader>
                        <CardContent className="p-5">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                                These are the clinical documents that were submitted to the AI for compliance analysis.
                            </p>

                            {result.analyzed_documents && result.analyzed_documents.length > 0 ? (
                                <>
                                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3">
                                        {result.analyzed_documents.length} file{result.analyzed_documents.length !== 1 ? 's' : ''}
                                    </p>
                                    <div className="space-y-2">
                                        {result.analyzed_documents.map(doc => (
                                            <DocumentRow
                                                key={doc.id}
                                                doc={doc}
                                                onView={handleViewDoc}
                                                onDownload={handleDownloadDoc}
                                            />
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3">
                                        {result.analyzed_document_names?.length ?? 0} file{(result.analyzed_document_names?.length ?? 0) !== 1 ? 's' : ''}
                                    </p>
                                    <div className="space-y-2">
                                        {(result.analyzed_document_names ?? []).map((name, i) => (
                                            <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                                                <div className="h-9 w-9 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                                    <FileText className="h-4 w-4 text-gray-400" />
                                                </div>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{name}</p>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 leading-relaxed border-t border-gray-100 dark:border-gray-800 pt-4">
                                These documents were used as the source data for the AI compliance analysis report below.
                            </p>
                        </CardContent>
                    </Card>

                    {/* ══════════════════════════════════════════════════════════
                        SECTION 2 – AI Compliance Report
                    ══════════════════════════════════════════════════════════ */}
                    <Card className="mb-6 border border-gray-200 dark:border-gray-800 shadow-sm">
                        <CardHeader className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 py-3 px-5">
                            <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Brain className="h-4 w-4 text-indigo-500" />
                                AI Compliance Analysis Report
                            </h2>
                        </CardHeader>
                        <CardContent className="p-6 sm:p-8">
                            <div className="prose prose-sm prose-gray dark:prose-invert max-w-none">
                                <ReactMarkdown remarkPlugins={MD_PLUGINS} components={mdComponents}>
                                    {result.report_markdown}
                                </ReactMarkdown>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ══════════════════════════════════════════════════════════
                        SECTION 3 – Clinician Submitted Document (read-only)
                    ══════════════════════════════════════════════════════════ */}
                    {!isPassed && (
                        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm">
                            <CardHeader className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 py-3 px-5">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                        <FileCheck className="h-4 w-4 text-indigo-500" />
                                        Clinician Submitted Document
                                    </h2>
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border
                                        ${isDocSubmitted
                                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                            : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                        }`}>
                                        {isDocSubmitted
                                            ? <><FileCheck className="h-3 w-3" /> Submitted</>
                                            : <><Clock className="h-3 w-3" /> Pending</>
                                        }
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-5">
                                {isDocSubmitted && result.has_clinician_document ? (
                                    <>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
                                            The clinician has reviewed and submitted the following document in response to this compliance audit report.
                                        </p>
                                        <ClinicianDocRow
                                            name={result.clinician_document_name}
                                            submittedAt={result.clinician_document_submitted_at}
                                            clinicianName={result.clinician_name}
                                            onView={handleViewClinicianDoc}
                                            onDownload={handleDownloadClinicianDoc}
                                            onAnalyze={handleAnalyzeClinicianDocument}
                                        />
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <div className="h-14 w-14 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-3">
                                            <Clock className="h-7 w-7 text-amber-500 dark:text-amber-400" />
                                        </div>
                                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            No Document Submitted Yet
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed">
                                            The assigned clinician has not submitted a document for this report yet.
                                            The status will update to "Document Submitted" once they upload one from their assigned reports.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                </div>
            </div>

            {/* ── Assign Clinician Modal ── */}
            {showAssignDropdown && !showConfirmAssign && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                        onClick={() => { setShowAssignDropdown(false); setSelectedClinician(''); }}
                    />
                    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                                <UserCheck className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white">Assign Report to Clinician</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    {result.patient_name} &bull; {new Date(result.created_at).toLocaleDateString()}
                                </p>
                            </div>
                            <button
                                onClick={() => { setShowAssignDropdown(false); setSelectedClinician(''); }}
                                className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {clinicians.length === 0 ? (
                            <div className="py-6 text-center">
                                <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                <p className="text-sm text-gray-500">No clinicians found in your agency.</p>
                                <p className="text-xs text-gray-400 mt-1">Create clinician users first from the Users section.</p>
                            </div>
                        ) : (
                            <>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Select Clinician
                                </label>
                                <SearchableClinicianSelect
                                    clinicians={clinicians}
                                    value={selectedClinician}
                                    onChange={setSelectedClinician}
                                />
                                <div className="flex gap-3 mt-5">
                                    <Button
                                        variant="outline"
                                        onClick={() => { setShowAssignDropdown(false); setSelectedClinician(''); }}
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="primary"
                                        disabled={!selectedClinician}
                                        onClick={() => setShowConfirmAssign(true)}
                                        className="flex-1"
                                    >
                                        Continue
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── Confirm Assignment Modal ── */}
            {showConfirmAssign && (
                <div className="fixed inset-0 z-[310] flex items-center justify-center">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowConfirmAssign(false)} />
                    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 text-center">
                        <div className="h-14 w-14 rounded-full bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center mx-auto mb-4">
                            <ClipboardList className="h-7 w-7 text-teal-600 dark:text-teal-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Confirm Assignment</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                            Assign this report for{' '}
                            <span className="font-semibold text-gray-800 dark:text-white">{result.patient_name}</span> to:
                        </p>
                        <p className="text-base font-bold text-teal-600 dark:text-teal-400 mb-5">
                            {clinicians.find(c => c.id === selectedClinician)?.full_name}
                        </p>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setShowConfirmAssign(false)} disabled={assigning} className="flex-1">
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={handleConfirmAssign} disabled={assigning} className="flex-1">
                                {assigning ? 'Assigning…' : 'OK, Assign'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            {/* ── Overlay ── */}
            {analyzing && <AnalyzingOverlay />}

            {/* ── Result Modal ── */}
            {pendingResult && (
                <ResultModal
                    result={pendingResult}
                    onClose={() => setPendingResult(null)}
                    mdComponents={mdComponents}
                />
            )}
        </div>
    );
};

export default AiReportDetailPage;
