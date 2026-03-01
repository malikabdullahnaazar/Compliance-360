import { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Brain, FileText, X, Save, ChevronDown, AlertTriangle,
    Search, ChevronUp, Calendar, Cpu, FileStack, Users, ChevronLeft, ChevronRight, CheckCircle, XCircle,
    UserCheck, ClipboardList, Clock, FileCheck, ExternalLink
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { patientService } from '../services/patient.service';
import { documentService } from '../services/document.service';
import { addToast } from '../store/slices/uiSlice';
import api from '../services/api';

/* ─── API helpers ─────────────────────────────────────────────────────────── */
const analyzeDocuments = (patientId, documentIds) =>
    api.post('/ai/mistral/analyze/', { patient_id: patientId, document_ids: documentIds });
const saveResult = (payload) => api.post('/ai/mistral/save/', payload);
const fetchResults = (patientId) =>
    api.get('/ai/mistral/results/', { params: patientId ? { patient_id: patientId } : {} });
const fetchClinicians = () => api.get('/ai/mistral/clinicians/');
const assignReport = (payload) => api.post('/ai/mistral/assign/', payload);

/* ─── Shared Markdown config ──────────────────────────────────────────────── */
const MD_PLUGINS = [remarkGfm, remarkBreaks];

// Custom renderers – make the report look premium inside prose
const mdComponents = {
    // Patient header block: bold key-value lines become a styled info row
    strong: ({ children }) => (
        <strong className="text-gray-900 dark:text-white font-semibold">{children}</strong>
    ),
    // Horizontal rules → divider
    hr: () => <hr className="my-6 border-gray-200 dark:border-gray-700" />,
    // Blockquotes → teal evidence card
    blockquote: ({ children }) => (
        <blockquote className="not-italic border-l-4 border-teal-400 bg-teal-50 dark:bg-teal-900/10
      px-4 py-3 rounded-r-lg my-4 text-gray-700 dark:text-gray-300 text-sm">
            {children}
        </blockquote>
    ),
    // h1 → styled audit title
    h1: ({ children }) => (
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-0 mb-4 pb-3
      border-b-2 border-teal-200 dark:border-teal-800">
            {children}
        </h1>
    ),
    // h2 → section header
    h2: ({ children }) => (
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mt-8 mb-3 pb-2
      border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            {children}
        </h2>
    ),
    // h3 → finding title
    h3: ({ children }) => (
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mt-6 mb-2">
            {children}
        </h3>
    ),
    // Paragraphs within the header section
    p: ({ children }) => (
        <p className="leading-relaxed text-sm text-gray-700 dark:text-gray-300 my-1">{children}</p>
    ),
    // List items
    li: ({ children }) => (
        <li className="text-sm text-gray-700 dark:text-gray-300 my-0.5">{children}</li>
    ),
    // Inline code
    code: ({ children }) => (
        <code className="text-teal-700 dark:text-teal-300 bg-teal-50
      dark:bg-teal-900/20 px-1.5 py-0.5 rounded text-xs font-mono">
            {children}
        </code>
    ),
    // Tables
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
    // Links (handling custom doc:id scheme)
    a: ({ children }) => (
        <span className="font-semibold text-gray-900 dark:text-white">
            {children}
        </span>
    ),
};

/* ─── SearchablePatientSelect ─────────────────────────────────────────────── */
/**
 * A fully accessible searchable dropdown replacement for native <select>.
 * Props:
 *   patients      – array of patient objects
 *   value         – currently selected patient id
 *   onChange      – (id: string) => void
 *   placeholder   – string shown when nothing is selected
 *   disabled      – bool
 *   allOption     – string | null  (pass a string to show an "All patients" option)
 */
const SearchablePatientSelect = ({
    patients,
    value,
    onChange,
    placeholder = 'Select a patient…',
    disabled = false,
    allOption = null,
}) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef(null);
    const searchRef = useRef(null);

    // Close on outside click
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

    // Focus search when opening
    useEffect(() => {
        if (open && searchRef.current) searchRef.current.focus();
    }, [open]);

    const filtered = patients.filter((p) => {
        const name = `${p.first_name} ${p.last_name} ${p.patient_id}`.toLowerCase();
        return name.includes(query.toLowerCase());
    });

    const selectedPatient = patients.find((p) => p.id === value);

    const displayLabel = selectedPatient
        ? `${selectedPatient.first_name} ${selectedPatient.last_name}`
        : allOption && value === ''
            ? allOption
            : null;

    const handleSelect = (id) => {
        onChange(id);
        setOpen(false);
        setQuery('');
    };

    return (
        <div ref={containerRef} className="relative">
            {/* Trigger button */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setOpen((o) => !o)}
                className={`w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm
          bg-white dark:bg-gray-800 text-left transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700' :
                        'border-gray-300 dark:border-gray-700 hover:border-teal-400 dark:hover:border-teal-500 cursor-pointer'}
          ${open ? 'border-teal-500 ring-2 ring-teal-500/20 dark:border-teal-400' : ''}
          text-gray-900 dark:text-white focus:outline-none`}
            >
                <span className={displayLabel ? '' : 'text-gray-400 dark:text-gray-500'}>
                    {displayLabel || placeholder}
                </span>
                {open ? (
                    <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                )}
            </button>

            {/* Dropdown panel */}
            {open && (
                <div className="absolute z-[200] mt-1 w-full bg-white dark:bg-gray-800 rounded-xl
          border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">

                    {/* Search input */}
                    <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50
              rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-600">
                            <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <input
                                ref={searchRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search patients…"
                                className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white
                  placeholder-gray-400 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Options list */}
                    <ul className="max-h-60 overflow-y-auto py-1">
                        {allOption !== null && (
                            <li>
                                <button
                                    type="button"
                                    onClick={() => handleSelect('')}
                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors
                    ${value === ''
                                            ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 font-medium'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                                >
                                    {allOption}
                                </button>
                            </li>
                        )}
                        {filtered.length === 0 ? (
                            <li className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500 text-center">
                                No patients match "{query}"
                            </li>
                        ) : (
                            filtered.map((p) => (
                                <li key={p.id}>
                                    <button
                                        type="button"
                                        onClick={() => handleSelect(p.id)}
                                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors
                      ${value === p.id
                                                ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 font-medium'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                                    >
                                        <span className="font-medium">{p.first_name} {p.last_name}</span>
                                        <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                                            {p.patient_id}
                                        </span>
                                    </button>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

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
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Analyzing Documents…</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Mistral AI is reviewing the selected patient documents for compliance issues.
                    <br />
                    This may take a minute. Please wait.
                </p>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-indigo-500
          animate-pulse" style={{ width: '70%' }} />
            </div>
        </div>
    </div>
);

/* ─── Result popup modal ──────────────────────────────────────────────────── */
const ResultModal = ({ result, onClose }) => (
    /*
     * z-[200] → sits above Navbar (z-50).
     * We do NOT use inset-0 for the content wrapper – instead we use
     * flex + pt-16 so the dialog never slides behind the sticky header.
     */
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
                <div className="flex-1 overflow-y-auto px-6 py-6">
                    <MarkdownReport markdown={result.report_markdown} />
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700
          flex-shrink-0 flex justify-end gap-3 rounded-b-2xl">
                    <Button variant="primary" onClick={onClose} className="px-6">Close</Button>
                </div>
            </div>
        </div>
    </div>
);

/* ─── MarkdownReport – renders the AI output beautifully ─────────────────── */
const MarkdownReport = ({ markdown }) => (
    <div className="prose prose-sm prose-gray dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={MD_PLUGINS} components={mdComponents}>
            {markdown}
        </ReactMarkdown>
    </div>
);

/* ─── Main Page ───────────────────────────────────────────────────────────── */
const AiAnalyzerPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('analyze');

    /* Analyze tab */
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState('');
    const [documents, setDocuments] = useState([]);
    const [selectedDocuments, setSelectedDocuments] = useState([]);
    const [loadingPatients, setLoadingPatients] = useState(false);
    const [loadingDocuments, setLoadingDocuments] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);

    const [expandedResultPatient, setExpandedResultPatient] = useState(null);

    /* Result popup */
    const [pendingResult, setPendingResult] = useState(null);

    /* Results tab */
    const [resultPatient, setResultPatient] = useState('');
    const [savedResults, setSavedResults] = useState([]);
    const [loadingResults, setLoadingResults] = useState(false);
    const [expandedResult, setExpandedResult] = useState(null);

    /* Assign modal */
    const [clinicians, setClinicians] = useState([]);
    const [assignTarget, setAssignTarget] = useState(null); // { resultId, patientName, date }
    const [selectedClinician, setSelectedClinician] = useState('');
    const [showAssignDropdown, setShowAssignDropdown] = useState(false);
    const [showConfirmAssign, setShowConfirmAssign] = useState(false);
    const [assigning, setAssigning] = useState(false);

    useEffect(() => { fetchPatients(); loadClinicians(); }, []);

    // Restore tab + patient filter when navigating back from the report detail page
    useEffect(() => {
        const state = location.state;
        if (state?.tab) {
            setActiveTab(state.tab);
        }
        if (state?.patientId) {
            setResultPatient(state.patientId);
            setExpandedResultPatient(state.patientId);
        }
        // Clear the state so a manual refresh doesn't re-apply it
        window.history.replaceState({}, '');
    }, []);

    useEffect(() => {
        if (activeTab === 'result' || activeTab === 'passed') loadSavedResults();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    /* ── data fetchers ── */
    const fetchPatients = async () => {
        try {
            setLoadingPatients(true);
            const res = await patientService.getPatients({ page_size: 200 });
            setPatients(res.data?.results ?? (Array.isArray(res.data) ? res.data : []));
        } catch {
            dispatch(addToast({ type: 'error', message: 'Failed to fetch patients' }));
        } finally {
            setLoadingPatients(false);
        }
    };

    const fetchDocuments = async (patientId) => {
        if (!patientId) { setDocuments([]); setSelectedDocuments([]); return; }
        try {
            setLoadingDocuments(true);
            const res = await documentService.getDocumentsByPatient(patientId);
            setDocuments(Array.isArray(res.data) ? res.data : (res.data?.results ?? []));
            setSelectedDocuments([]);
        } catch {
            dispatch(addToast({ type: 'error', message: 'Failed to fetch documents' }));
        } finally {
            setLoadingDocuments(false);
        }
    };

    const loadSavedResults = async () => {
        setLoadingResults(true);
        try {
            const res = await fetchResults();
            setSavedResults(res.data);
        } catch {
            dispatch(addToast({ type: 'error', message: 'Failed to load saved results' }));
        } finally {
            setLoadingResults(false);
        }
    };

    const loadClinicians = async () => {
        try {
            const res = await fetchClinicians();
            setClinicians(res.data);
        } catch {
            // non-critical – don't toast
        }
    };

    /* ── handlers ── */
    const handleOpenAssign = (result) => {
        setAssignTarget(result);
        setSelectedClinician('');
        setShowAssignDropdown(true);
        setShowConfirmAssign(false);
    };

    const handleConfirmAssign = async () => {
        if (!assignTarget || !selectedClinician) return;
        setAssigning(true);
        try {
            await assignReport({
                analysis_result_id: assignTarget.id,
                clinician_id: selectedClinician,
            });
            dispatch(addToast({ type: 'success', message: 'Report assigned successfully!' }));

            // Update local state to mark this result as assigned
            setSavedResults(prev => prev.map(result =>
                result.id === assignTarget.id ? { ...result, is_assigned: true } : result
            ));

            setShowConfirmAssign(false);
            setShowAssignDropdown(false);
            setAssignTarget(null);
        } catch (err) {
            dispatch(addToast({ type: 'error', message: err?.response?.data?.error || 'Failed to assign report' }));
        } finally {
            setAssigning(false);
        }
    };

    const handleCancelAssign = () => {
        setShowAssignDropdown(false);
        setShowConfirmAssign(false);
        setAssignTarget(null);
        setSelectedClinician('');
    };

    /* ── handlers ── */
    const handleAnalyzePatientChange = (id) => {
        setSelectedPatient(id);
        fetchDocuments(id);
    };

    const handleSelectAll = (e) =>
        setSelectedDocuments(e.target.checked ? documents.map((d) => d.id) : []);

    const handleDocumentSelect = (id) =>
        setSelectedDocuments((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );

    const handleAnalyze = async () => {
        if (!selectedPatient) return dispatch(addToast({ type: 'error', message: 'Select a patient first' }));
        if (selectedDocuments.length === 0) return dispatch(addToast({ type: 'error', message: 'Select at least one document' }));
        setAnalyzing(true);
        try {
            const res = await analyzeDocuments(selectedPatient, selectedDocuments);
            const { report_markdown, patient_info, document_names } = res.data;

            // ── Determine Pass/Fail status ──────────────────────────────
            // Strategy: parse actual numbers from the AI report rather than
            // keyword-matching (headings like "Red Flags" always appear even
            // when there are 0 findings, making keyword matching unreliable).

            let status = 'Fail'; // default

            // 1. Parse "Total Findings: N" from the Executive Summary line
            //    Matches: "Total Findings: 0 | Critical: 0 | ..." (and ignores asterisks)
            const findingsMatch = report_markdown.match(
                /Total\s+Findings\D*(\d+)/i
            );
            if (findingsMatch) {
                const totalFindings = parseInt(findingsMatch[1], 10);
                status = totalFindings === 0 ? 'Pass' : 'Fail';
            } else {
                // 2. Parse Compliance Score: X/100 — ≥ 85 = Pass
                const scoreMatch = report_markdown.match(
                    /Compliance\s+Score\s*:\s*(\d+)\s*\/\s*100/i
                );
                if (scoreMatch) {
                    const score = parseInt(scoreMatch[1], 10);
                    status = score >= 85 ? 'Pass' : 'Fail';
                } else {
                    // 3. Parse Overall Risk Level
                    const riskMatch = report_markdown.match(
                        /Overall\s+Risk\s+Level\s*:.*?(CRITICAL|HIGH|MEDIUM|LOW|NONE)/i
                    );
                    if (riskMatch) {
                        const riskLevel = riskMatch[1].toUpperCase();
                        status = (riskLevel === 'LOW' || riskLevel === 'NONE') ? 'Pass' : 'Fail';
                    } else {
                        // 4. Last resort: check only actual finding lines for FAIL/❌
                        //    (not section headings which always contain "Red Flags")
                        const failLinePattern = /^[-*]\s.*?(?:❌\s*FAIL|status:\s*❌)/im;
                        status = failLinePattern.test(report_markdown) ? 'Fail' : 'Pass';
                    }
                }
            }

            // Auto save result
            await saveResult({
                patient_id: patient_info.patient_id,
                report_markdown: report_markdown,
                document_names: document_names,
                ai_model_used: 'open-mistral-nemo',
                status: status,
            });

            setPendingResult({
                report_markdown,
                ai_model: 'open-mistral-nemo',
                patient_id: patient_info.patient_id,
                document_names,
                status,
            });
            dispatch(addToast({ type: 'success', message: 'Analysis completed and saved successfully!' }));
        } catch (err) {
            dispatch(addToast({ type: 'error', message: err?.response?.data?.error || 'AI analysis failed. Please try again.' }));
        } finally {
            setAnalyzing(false);
        }
    };

    const handleResultPatientChange = (id) => {
        setResultPatient(id);
        setExpandedResultPatient(id ? true : false);
    };

    /* ────────────────────────────────────────────────────── */
    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] dark:bg-gray-900 dark:text-gray-100">
            {analyzing && <AnalyzingOverlay />}

            {pendingResult && (
                <ResultModal
                    result={pendingResult}
                    onClose={() => setPendingResult(null)}
                />
            )}

            <Sidebar
                onToggle={setSidebarCollapsed}
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />

            <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-0 lg:ml-64'}`}>
                <Navbar variant="app" onMenuToggle={() => setIsMobileMenuOpen((p) => !p)} />

                <div className="mx-auto px-4 py-8 sm:px-6 lg:px-8">
                    <Card className="bg-white dark:bg-gray-900 border-none shadow-xl
            ring-1 ring-gray-200 dark:ring-gray-800 p-6 sm:p-8">
                        <CardContent className="p-0 space-y-6">

                            {/* Header */}
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white
                  sm:text-3xl flex items-center gap-3">
                                    <Brain className="h-8 w-8 text-teal-600 dark:text-teal-400" />
                                    AI Analyzer
                                </h1>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    Analyze patient documents using Mistral AI to detect hospice compliance violations and red flags.
                                </p>
                            </div>

                            {/* Tabs */}
                            <div className="border-b border-gray-200 dark:border-gray-800">
                                <nav className="-mb-px flex space-x-8">
                                    {[
                                        { key: 'analyze', label: 'Analyze' },
                                        { key: 'result', label: 'Results' },
                                        { key: 'passed', label: 'Passed' },
                                    ].map(({ key, label }) => (
                                        <button
                                            key={key}
                                            onClick={() => setActiveTab(key)}
                                            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors
                        ${activeTab === key
                                                    ? 'border-teal-500 text-teal-600 dark:border-teal-400 dark:text-teal-400'
                                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                                }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </nav>
                            </div>

                            {/* ── ANALYZE TAB ── */}
                            {activeTab === 'analyze' && (
                                <div className="space-y-6">
                                    {/* Searchable patient picker */}
                                    <div className="max-w-md">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Select Patient
                                        </label>
                                        <SearchablePatientSelect
                                            patients={patients}
                                            value={selectedPatient}
                                            onChange={handleAnalyzePatientChange}
                                            placeholder="Select a patient to analyze…"
                                            disabled={loadingPatients}
                                        />
                                    </div>

                                    {/* Documents table */}
                                    {selectedPatient && (
                                        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm">
                                            <CardHeader className="bg-gray-50 dark:bg-gray-800/50 border-b
                        border-gray-200 dark:border-gray-800 py-3 px-5">
                                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white
                          flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-gray-400" />
                                                    Available Documents
                                                    {selectedDocuments.length > 0 && (
                                                        <span className="ml-auto text-xs font-medium text-teal-600 dark:text-teal-400">
                                                            {selectedDocuments.length} selected
                                                        </span>
                                                    )}
                                                </h3>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                                {loadingDocuments ? (
                                                    <div className="flex justify-center items-center h-28">
                                                        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-teal-500" />
                                                    </div>
                                                ) : documents.length > 0 ? (
                                                    <div className="overflow-x-auto">
                                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
                                                            <thead className="bg-gray-50 dark:bg-gray-800/20">
                                                                <tr>
                                                                    <th className="px-5 py-3 w-10">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedDocuments.length === documents.length && documents.length > 0}
                                                                            onChange={handleSelectAll}
                                                                            className="h-4 w-4 rounded border-gray-300 text-teal-600
                                        focus:ring-teal-500 dark:border-gray-600"
                                                                        />
                                                                    </th>
                                                                    <th className="px-5 py-3 text-left text-xs font-semibold
                                    text-gray-500 uppercase tracking-wider">Document</th>
                                                                    <th className="px-5 py-3 text-left text-xs font-semibold
                                    text-gray-500 uppercase tracking-wider">Type</th>
                                                                    <th className="px-5 py-3 text-left text-xs font-semibold
                                    text-gray-500 uppercase tracking-wider">Uploaded</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-gray-800">
                                                                {documents.map((doc) => (
                                                                    <tr
                                                                        key={doc.id}
                                                                        onClick={() => handleDocumentSelect(doc.id)}
                                                                        className="hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer transition-colors"
                                                                    >
                                                                        <td className="px-5 py-3">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={selectedDocuments.includes(doc.id)}
                                                                                onChange={() => handleDocumentSelect(doc.id)}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                                className="h-4 w-4 rounded border-gray-300 text-teal-600
                                          focus:ring-teal-500 dark:border-gray-600"
                                                                            />
                                                                        </td>
                                                                        <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">
                                                                            {doc.filename}
                                                                        </td>
                                                                        <td className="px-5 py-3 text-gray-500 dark:text-gray-400 uppercase text-xs">
                                                                            {doc.document_type_display || doc.document_type}
                                                                        </td>
                                                                        <td className="px-5 py-3 text-gray-500 dark:text-gray-400">
                                                                            {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'N/A'}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    <div className="py-10 text-center text-gray-500 dark:text-gray-400 text-sm">
                                                        No documents found for this patient.
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Analyze button */}
                                    {selectedPatient && documents.length > 0 && (
                                        <div className="flex justify-end">
                                            <Button
                                                onClick={handleAnalyze}
                                                disabled={selectedDocuments.length === 0}
                                                variant="primary"
                                                className="px-8 flex items-center gap-2 shadow-md"
                                            >
                                                <Brain className="h-4 w-4" />
                                                Analyze{selectedDocuments.length > 0 ? ` (${selectedDocuments.length} docs)` : ''}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── RESULTS & PASSED TAB ── */}
                            {(activeTab === 'result' || activeTab === 'passed') && (() => {
                                const filteredResults = savedResults.filter(r =>
                                    (!resultPatient || r.patient_id === resultPatient) &&
                                    (activeTab === 'passed' ? r.status === 'Pass' : r.status !== 'Pass')
                                );

                                const groupedData = filteredResults.reduce((acc, r) => {
                                    if (!acc[r.patient_id]) {
                                        acc[r.patient_id] = { patient_id: r.patient_id, patient_name: r.patient_name, count: 0, latest: r.created_at, results: [] };
                                    }
                                    acc[r.patient_id].count++;
                                    acc[r.patient_id].results.push(r);
                                    if (new Date(r.created_at) > new Date(acc[r.patient_id].latest)) acc[r.patient_id].latest = r.created_at;
                                    return acc;
                                }, {});

                                const groupedList = Object.values(groupedData).sort((a, b) => new Date(b.latest) - new Date(a.latest));

                                return (
                                    <div className="space-y-6">
                                        {!expandedResultPatient && (
                                            <div className="max-w-md">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Filter by Patient
                                                </label>
                                                <SearchablePatientSelect
                                                    patients={patients}
                                                    value={resultPatient}
                                                    onChange={(id) => { setResultPatient(id); setExpandedResultPatient(id ? true : false); }}
                                                    placeholder="Filter by patient…"
                                                    disabled={loadingPatients}
                                                    allOption="All Patients"
                                                />
                                            </div>
                                        )}

                                        {loadingResults ? (
                                            <div className="flex justify-center items-center h-40">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
                                            </div>
                                        ) : expandedResultPatient ? (
                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <button onClick={() => { setExpandedResultPatient(false); setExpandedResult(null); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                                                            <ChevronLeft className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                                                        </button>
                                                        <div>
                                                            <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                                                                <Users className="h-6 w-6 text-teal-500" />
                                                                {groupedData[resultPatient]?.patient_name || 'Patient'}
                                                            </h2>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">Analysis History ({groupedData[resultPatient]?.count || 0} reports)</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    {(groupedData[resultPatient]?.results || []).map((result) => (
                                                        <Card key={result.id} className="border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                                                            <div className="px-5 py-4 flex items-start justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors cursor-pointer" onClick={() => navigate(`/ai-analyzer/report/${result.id}`, { state: { patientId: result.patient_id } })}>
                                                                <div className="flex-1 text-left flex items-start gap-4 min-w-0">
                                                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${result.status === 'Pass' ? 'bg-green-50 dark:bg-green-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
                                                                        {result.status === 'Pass' ? <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" /> : <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />}
                                                                    </div>
                                                                    <div className="min-w-0 flex-1 space-y-1">
                                                                        <p className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                                                                            {result.patient_name}
                                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${result.status === 'Pass' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                                {result.status}
                                                                            </span>
                                                                        </p>
                                                                        <div className="flex flex-wrap gap-3 mt-1">
                                                                            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                                                                <Calendar className="h-3.5 w-3.5" />
                                                                                {new Date(result.created_at).toLocaleString()}
                                                                            </span>
                                                                            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                                                                <FileStack className="h-3.5 w-3.5" />
                                                                                {result.analyzed_document_names?.length ?? 0} document(s)
                                                                            </span>
                                                                            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                                                                <Cpu className="h-3.5 w-3.5" />
                                                                                {result.ai_model_used}
                                                                            </span>
                                                                        </div>
                                                                        {result.analyzed_document_names?.length > 0 && (
                                                                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                                                                {result.analyzed_document_names.join(' · ')}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2 flex-shrink-0 mt-1" onClick={e => e.stopPropagation()}>
                                                                    {/* Document Pending/Submitted status */}
                                                                    {result.status !== 'Pass' && (
                                                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border
                                                                            ${result.clinician_document_status === 'submitted'
                                                                                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                                                                : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                                                            }`}>
                                                                            {result.clinician_document_status === 'submitted'
                                                                                ? <><FileCheck className="h-3 w-3" /> Doc Submitted</>
                                                                                : <><Clock className="h-3 w-3" /> Doc Pending</>
                                                                            }
                                                                        </span>
                                                                    )}
                                                                    {result.status !== 'Pass' && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (!result.is_assigned) handleOpenAssign(result);
                                                                            }}
                                                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${result.is_assigned
                                                                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 cursor-default cursor-not-allowed'
                                                                                : 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 border-teal-200 dark:border-teal-800 cursor-pointer'
                                                                                }`}
                                                                            title={result.is_assigned ? "This report is already assigned" : "Assign this report to a clinician"}
                                                                            disabled={result.is_assigned}
                                                                        >
                                                                            {result.is_assigned ? <CheckCircle className="h-3.5 w-3.5 text-gray-400" /> : <UserCheck className="h-3.5 w-3.5" />}
                                                                            {result.is_assigned ? "Assigned" : "Assign"}
                                                                        </button>
                                                                    )}
                                                                    <ExternalLink
                                                                        className="h-4 w-4 text-gray-400 flex-shrink-0"
                                                                        title="Open full report"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </Card>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : groupedList.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                                <div className="h-16 w-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                    <AlertTriangle className="h-8 w-8 text-gray-400" />
                                                </div>
                                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                                                    No saved {activeTab} results
                                                </h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                                                    Run an analysis in the Analyze tab and save the result to see it here.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {groupedList.map((p) => (
                                                    <Card key={p.patient_id} className="cursor-pointer hover:border-teal-400 transition-colors" onClick={() => { setResultPatient(p.patient_id); setExpandedResultPatient(true); }}>
                                                        <CardContent className="p-5 flex items-center gap-4">
                                                            <div className="h-12 w-12 rounded-full bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
                                                                <Users className="h-6 w-6 text-teal-600" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate">{p.patient_name}</h3>
                                                                <p className="text-sm text-gray-500">{p.count} Report{p.count > 1 ? 's' : ''}</p>
                                                            </div>
                                                            <ChevronRight className="h-5 w-5 text-gray-400" />
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* ── Assign Clinician Dropdown Modal ─────────────────────────────── */}
            {showAssignDropdown && !showConfirmAssign && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={handleCancelAssign} />
                    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                                <UserCheck className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white">Assign Report to Clinician</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    {assignTarget?.patient_name} &bull; {assignTarget ? new Date(assignTarget.created_at).toLocaleDateString() : ''}
                                </p>
                            </div>
                            <button onClick={handleCancelAssign} className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
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
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Clinician</label>
                                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                    {clinicians.map((c) => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => setSelectedClinician(c.id)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${selectedClinician === c.id
                                                ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-teal-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                                }`}
                                        >
                                            <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm flex-shrink-0">
                                                {c.full_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{c.full_name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{c.email}</p>
                                            </div>
                                            {selectedClinician === c.id && <CheckCircle className="h-4 w-4 text-teal-600 flex-shrink-0" />}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-3 mt-5">
                                    <Button variant="outline" onClick={handleCancelAssign} className="flex-1">Cancel</Button>
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

            {/* ── Confirm Assignment Modal ─────────────────────────────────────── */}
            {showConfirmAssign && (
                <div className="fixed inset-0 z-[310] flex items-center justify-center">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowConfirmAssign(false)} />
                    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 text-center">
                        <div className="h-14 w-14 rounded-full bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center mx-auto mb-4">
                            <ClipboardList className="h-7 w-7 text-teal-600 dark:text-teal-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Confirm Assignment</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                            Assign this report for <span className="font-semibold text-gray-800 dark:text-white">{assignTarget?.patient_name}</span> to:
                        </p>
                        <p className="text-base font-bold text-teal-600 dark:text-teal-400 mb-5">
                            {clinicians.find(c => c.id === selectedClinician)?.full_name}
                        </p>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setShowConfirmAssign(false)} disabled={assigning} className="flex-1">Cancel</Button>
                            <Button variant="primary" onClick={handleConfirmAssign} disabled={assigning} className="flex-1">
                                {assigning ? 'Assigning…' : 'OK, Assign'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AiAnalyzerPage;
