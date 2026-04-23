import { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  Brain, Upload, X, ChevronDown, AlertTriangle, Cpu, FileText,
  CheckCircle, XCircle, Calendar, Loader2, RefreshCw, FlaskConical,
  FileUp, Zap
} from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { addToast } from '../store/slices/uiSlice';
import { promptService } from '../services/prompt.service';
import api from '../services/api';

/* ─── API helpers ─────────────────────────────────────────────────────── */
const startTestJob = (formData) =>
  api.post('/ai/superadmin-test/start/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
const pollTestJob = (jobId) => api.get(`/ai/superadmin-test/${jobId}/status/`);
const fetchTestResults = () => api.get('/ai/superadmin-test/results/');
const fetchTestResultDetail = (id) => api.get(`/ai/superadmin-test/results/${id}/`);

/* ─── AI Models ───────────────────────────────────────────────────────── */
const AI_MODELS = [
  { value: 'gpt-5.4', label: 'GPT-5.4' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
];

/* ─── Report Viewer ───────────────────────────────────────────────────── */
const ReportViewer = ({ result, onClose }) => {
  if (!result) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <div className="flex items-center gap-3">
            {result.status === 'Pass' ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{result.filename}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {result.ai_model_used} · {result.prompt_name || 'Default Prompt'} · {new Date(result.created_at).toLocaleString()}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-[#1e1e1e] text-[#d4d4d4] p-5 rounded-xl font-mono text-sm whitespace-pre-wrap leading-relaxed border border-gray-800">
            {result.report_markdown}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Result Card ─────────────────────────────────────────────────────── */
const ResultCard = ({ result, onView }) => {
  const isPass = result.status === 'Pass';
  return (
    <Card className="border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden hover:border-teal-400 dark:hover:border-teal-600 transition-colors cursor-pointer" onClick={() => onView(result.id)}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 ${isPass ? 'bg-green-50 dark:bg-green-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
            {isPass ? <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" /> : <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />}
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">{result.filename}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${isPass ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400'}`}>
                {result.status}
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Cpu className="h-3.5 w-3.5" /> {result.ai_model_used}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Brain className="h-3.5 w-3.5" /> {result.prompt_name || 'Default Prompt'}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Calendar className="h-3.5 w-3.5" /> {new Date(result.created_at).toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2 mt-1">
              {result.report_markdown_snippet}
            </p>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline">
            <FileText className="h-3.5 w-3.5" /> View Full Report
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

/* ─── Main Page ───────────────────────────────────────────────────────── */
const SuperAdminTestAnalyzerPage = () => {
  const dispatch = useDispatch();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('analyze');

  /* Analyze tab */
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-5.4');
  const [prompts, setPrompts] = useState([]);
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [selectedPromptName, setSelectedPromptName] = useState('');
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentJobId, setCurrentJobId] = useState(null);
  const [jobProgress, setJobProgress] = useState(0);
  const pollRef = useRef(null);
  const fileInputRef = useRef(null);

  /* Results / Passed tab */
  const [results, setResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [viewingResult, setViewingResult] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  /* Load prompts on mount */
  useEffect(() => {
    const load = async () => {
      setLoadingPrompts(true);
      try {
        const res = await promptService.getPrompts();
        const raw = res.data.results || res.data || [];
        setPrompts(raw);
        // Pre-select the active prompt
        const active = raw.find(p => p.is_active);
        if (active) {
          setSelectedPromptId(active.id);
          setSelectedPromptName(active.name);
        }
      } catch {
        // non-critical
      } finally {
        setLoadingPrompts(false);
      }
    };
    load();
  }, []);

  /* Load results when switching tabs */
  useEffect(() => {
    if (activeTab === 'result' || activeTab === 'passed') {
      loadResults();
    }
  }, [activeTab]);

  const loadResults = async () => {
    setLoadingResults(true);
    try {
      const res = await fetchTestResults();
      setResults(res.data || []);
    } catch {
      dispatch(addToast({ type: 'error', message: 'Failed to load test results' }));
    } finally {
      setLoadingResults(false);
    }
  };

  /* Polling logic */
  const startPolling = useCallback((jobId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await pollTestJob(jobId);
        const { state, progress, report_status, error } = res.data;
        setJobProgress(progress || 0);
        if (state === 'completed') {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setAnalyzing(false);
          setCurrentJobId(null);
          setJobProgress(0);
          const statusLabel = report_status === 'Pass' ? 'Passed ✅' : 'Failed ❌';
          dispatch(addToast({ type: 'success', message: `Analysis complete — ${statusLabel}. Check Results or Passed tab.` }));
          loadResults();
          setActiveTab(report_status === 'Pass' ? 'passed' : 'result');
        } else if (state === 'failed') {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setAnalyzing(false);
          setCurrentJobId(null);
          setJobProgress(0);
          dispatch(addToast({ type: 'error', message: error || 'Analysis failed. Please try again.' }));
        }
      } catch {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setAnalyzing(false);
      }
    }, 2500);
  }, [dispatch]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  /* File handlers */
  const handleFileSelect = (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'doc', 'docx', 'txt'].includes(ext)) {
      dispatch(addToast({ type: 'error', message: 'Only PDF, DOC, DOCX, and TXT files are supported.' }));
      return;
    }
    setUploadedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  /* Submit analysis */
  const handleAnalyze = async () => {
    if (!uploadedFile) return dispatch(addToast({ type: 'error', message: 'Please upload a chart/PDF first.' }));
    if (!selectedPromptId) return dispatch(addToast({ type: 'error', message: 'Please select a prompt.' }));

    const fd = new FormData();
    fd.append('file', uploadedFile);
    fd.append('ai_model', selectedModel);
    fd.append('prompt_id', selectedPromptId);
    fd.append('prompt_name', selectedPromptName);

    setAnalyzing(true);
    setJobProgress(0);
    try {
      const res = await startTestJob(fd);
      const { job_id } = res.data;
      setCurrentJobId(job_id);
      startPolling(job_id);
      dispatch(addToast({ type: 'success', message: 'Analysis started. Polling for results…' }));
    } catch (err) {
      setAnalyzing(false);
      dispatch(addToast({ type: 'error', message: err?.response?.data?.error || 'Failed to start analysis.' }));
    }
  };

  /* View full report */
  const handleViewReport = async (id) => {
    setLoadingDetail(true);
    try {
      const res = await fetchTestResultDetail(id);
      setViewingResult(res.data);
    } catch {
      dispatch(addToast({ type: 'error', message: 'Failed to load report.' }));
    } finally {
      setLoadingDetail(false);
    }
  };

  /* Filter results by tab */
  const tabResults = results.filter(r => activeTab === 'passed' ? r.status === 'Pass' : r.status === 'Fail');

  return (
    <div className="min-h-screen bg-[var(--background)] dark:bg-gray-900 text-[var(--foreground)] dark:text-gray-100">
      <Sidebar onToggle={setSidebarCollapsed} isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-0 lg:ml-64'}`}>
        <Navbar variant="app" onMenuToggle={() => setIsMobileMenuOpen(p => !p)} />

        <div className="mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <Card className="bg-white dark:bg-gray-900 border-none shadow-xl ring-1 ring-gray-200 dark:ring-gray-800 p-6 sm:p-8">
            <CardContent className="p-0 space-y-6">

              {/* Header */}
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl flex items-center gap-3">
                    <FlaskConical className="h-8 w-8 text-teal-600 dark:text-teal-400" />
                    Test AI Analyzer
                  </h1>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Upload a patient chart and test compliance analysis with any AI model and prompt. Results are stored only for you.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  <Zap className="h-3.5 w-3.5" /> Super Admin Only
                </span>
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
                <div className="space-y-6 max-w-2xl">

                  {/* File Upload Drop Zone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Upload Chart / PDF <span className="text-red-500">*</span>
                    </label>
                    <div
                      className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
                        ${isDragging ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' : 'border-gray-300 dark:border-gray-700 hover:border-teal-400 dark:hover:border-teal-600 bg-gray-50 dark:bg-gray-800/30'}`}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        className="hidden"
                        onChange={(e) => handleFileSelect(e.target.files[0])}
                      />
                      {uploadedFile ? (
                        <div className="flex items-center justify-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{uploadedFile.name}</p>
                            <p className="text-xs text-gray-500">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setUploadedFile(null); }}
                            className="ml-2 p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <FileUp className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Drop your chart here, or <span className="text-teal-600 dark:text-teal-400">browse</span></p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">PDF, DOC, DOCX, TXT — up to 50MB</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* AI Model */}
                  <div>
                    <label htmlFor="test-model-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      AI Model <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="test-model-select"
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    >
                      {AI_MODELS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Prompt Selector */}
                  <div>
                    <label htmlFor="test-prompt-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Prompt <span className="text-red-500">*</span>
                    </label>
                    {loadingPrompts ? (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading prompts…
                      </div>
                    ) : (
                      <select
                        id="test-prompt-select"
                        value={selectedPromptId}
                        onChange={(e) => {
                          setSelectedPromptId(e.target.value);
                          const p = prompts.find(x => x.id === e.target.value);
                          setSelectedPromptName(p ? p.name : '');
                        }}
                        className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      >
                        <option value="">— Select a prompt —</option>
                        {prompts.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name}{p.is_active ? ' (Active)' : ''}{p.is_main ? ' [Main]' : ''}
                          </option>
                        ))}
                      </select>
                    )}
                    {selectedPromptId && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {prompts.find(p => p.id === selectedPromptId)?.description || ''}
                      </p>
                    )}
                  </div>

                  {/* Progress bar when analyzing */}
                  {analyzing && (
                    <div className="rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/20 p-4 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-teal-700 dark:text-teal-300 flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> Analyzing chart…
                        </span>
                        <span className="text-teal-600 dark:text-teal-400 font-semibold">{jobProgress}%</span>
                      </div>
                      <div className="w-full bg-teal-200 dark:bg-teal-800 rounded-full h-2">
                        <div
                          className="bg-teal-500 h-2 rounded-full transition-all duration-700"
                          style={{ width: `${jobProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-teal-600 dark:text-teal-400">
                        Analysis is running in the background. Results will appear automatically when complete.
                      </p>
                    </div>
                  )}

                  {/* Analyze Button */}
                  {!analyzing && (
                    <Button
                      onClick={handleAnalyze}
                      disabled={!uploadedFile || !selectedPromptId}
                      variant="primary"
                      className="w-full sm:w-auto px-8 flex items-center gap-2 shadow-md justify-center"
                    >
                      <Brain className="h-4 w-4" />
                      Start Analysis
                    </Button>
                  )}
                </div>
              )}

              {/* ── RESULTS / PASSED TAB ── */}
              {(activeTab === 'result' || activeTab === 'passed') && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {activeTab === 'result'
                        ? 'The latest failed test report. Replaced each time a new Fail result is generated.'
                        : 'The latest passed test report. Replaced each time a new Pass result is generated.'}
                    </p>
                    <button
                      onClick={loadResults}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Refresh
                    </button>
                  </div>

                  {loadingResults ? (
                    <div className="flex justify-center items-center h-40">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
                    </div>
                  ) : tabResults.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="h-16 w-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <AlertTriangle className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        No {activeTab === 'passed' ? 'Passed' : 'Failed'} Test Results Yet
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                        Run an analysis in the Analyze tab to generate a report.
                      </p>
                      <Button className="mt-6" onClick={() => setActiveTab('analyze')}>
                        <Brain className="h-4 w-4 mr-2" /> Go to Analyze
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {tabResults.map(r => (
                        <ResultCard key={r.id} result={r} onView={handleViewReport} />
                      ))}
                    </div>
                  )}
                </div>
              )}

            </CardContent>
          </Card>
        </div>
      </div>

      {/* Full Report Modal */}
      {loadingDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-8 shadow-xl">
            <Loader2 className="h-8 w-8 animate-spin text-teal-500 mx-auto" />
            <p className="text-sm text-gray-500 mt-3">Loading report…</p>
          </div>
        </div>
      )}
      {viewingResult && (
        <ReportViewer result={viewingResult} onClose={() => setViewingResult(null)} />
      )}
    </div>
  );
};

export default SuperAdminTestAnalyzerPage;
