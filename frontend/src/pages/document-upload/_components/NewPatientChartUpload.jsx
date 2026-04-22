import { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, Loader2, AlertCircle, Paperclip, X } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import { addToast } from '../../../store/slices/uiSlice';
import { documentService } from '../../../services/document.service';
import PatientReviewModal from './PatientReviewModal';
import Modal from '../../../components/common/Modal';

const SERVER_LIMIT_MB = 100;

const NewPatientChartUpload = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const pollTimerRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [jobId, setJobId] = useState('');
  const [jobStatus, setJobStatus] = useState({ status: '', progress: 0, error_message: '' });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [extractedPatient, setExtractedPatient] = useState(null);
  const [ambiguousCandidates, setAmbiguousCandidates] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [duplicateModal, setDuplicateModal] = useState({ open: false, patient: null });
  const [nameConflictModal, setNameConflictModal] = useState({ open: false, patients: [] });

  const canUpload = useMemo(() => !!selectedFile && !fileError && !isAnalyzing, [selectedFile, fileError, isAnalyzing]);

  const clearPoll = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearPoll();
    };
  }, []);

  const validateFile = (file) => {
    if (!file) return 'Please select a PDF file';
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > SERVER_LIMIT_MB) return `File (${sizeMB.toFixed(1)} MB) exceeds the ${SERVER_LIMIT_MB} MB server limit.`;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) return 'Only PDF files are allowed';
    return '';
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    const err = validateFile(file);
    setFileError(err);
    setSelectedFile(err ? null : file);
    setJobId('');
    setJobStatus({ status: '', progress: 0, error_message: '' });
    setExtractedPatient(null);
    setAmbiguousCandidates([]);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFileError('');
    setJobId('');
    setJobStatus({ status: '', progress: 0, error_message: '' });
    setExtractedPatient(null);
    setAmbiguousCandidates([]);
  };

  const pollStatus = async (id) => {
    try {
      const res = await documentService.getChartIntakeStatus(id);
      const data = res.data;
      setJobStatus({ status: data.status, progress: data.progress, error_message: data.error_message || '' });

      if (data.status === 'completed') {
        clearPoll();
        setIsAnalyzing(false);
        setExtractedPatient(data.extracted_patient || {});
        setAmbiguousCandidates(data.ambiguous_candidates || []);
        setReviewOpen(true);
      }
      if (data.status === 'failed') {
        clearPoll();
        setIsAnalyzing(false);
        dispatch(addToast({ type: 'error', message: data.error_message || 'Failed to analyze chart' }));
      }
      if (data.status === 'cancelled') {
        clearPoll();
        setIsAnalyzing(false);
      }
    } catch (err) {
      clearPoll();
      setIsAnalyzing(false);
      dispatch(addToast({ type: 'error', message: 'Failed to fetch analysis status' }));
    }
  };

  const startAnalysis = async () => {
    if (!canUpload) return;

    setIsAnalyzing(true);
    setJobStatus({ status: 'pending', progress: 0, error_message: '' });

    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      const res = await documentService.startChartIntake(fd);
      const id = res.data?.job_id;
      setJobId(id);
      dispatch(addToast({ type: 'info', message: 'Analyzing chart… this may take 10–30 seconds.' }));

      clearPoll();
      pollTimerRef.current = setInterval(() => {
        pollStatus(id);
      }, 1500);
      await pollStatus(id);
    } catch (error) {
      setIsAnalyzing(false);
      dispatch(addToast({ type: 'error', message: 'Failed to start chart analysis' }));
    }
  };

  const cancelIntake = async () => {
    try {
      if (jobId) {
        await documentService.cancelChartIntake(jobId);
      }
    } catch (e) {
      // best-effort
    } finally {
      clearPoll();
      setIsAnalyzing(false);
      setReviewOpen(false);
      setJobId('');
      setJobStatus({ status: '', progress: 0, error_message: '' });
      setExtractedPatient(null);
      setAmbiguousCandidates([]);
    }
  };

  const handleConfirm = async (payload) => {
    if (!jobId) return;
    setIsSubmitting(true);
    try {
      const res = await documentService.createPatientAndAttachFromIntake(jobId, payload);
      dispatch(addToast({ type: 'success', message: 'New patient created and document attached successfully.' }));
      setReviewOpen(false);
      navigate('/documents');
      return res;
    } catch (error) {
      const status = error?.response?.status;
      const data = error?.response?.data;

      if (status === 409 && data?.error === 'duplicate_exact') {
        setDuplicateModal({ open: true, patient: data.existing_patient });
      } else if (status === 409 && data?.error === 'name_conflict') {
        setNameConflictModal({ open: true, patients: data.existing_patients || [] });
      } else {
        dispatch(addToast({ type: 'error', message: data?.error || 'Failed to create patient and attach document' }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const attachToExisting = async () => {
    const p = duplicateModal.patient;
    if (!jobId || !p?.id) return;
    setIsSubmitting(true);
    try {
      await documentService.attachExistingPatientFromIntake(jobId, p.id);
      dispatch(addToast({ type: 'success', message: 'Document attached successfully.' }));
      setDuplicateModal({ open: false, patient: null });
      setReviewOpen(false);
      navigate('/documents');
    } catch (error) {
      dispatch(addToast({ type: 'error', message: 'Failed to attach document to existing patient' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const retryUpload = () => {
    cancelIntake();
    removeFile();
  };

  const switchToManual = () => {
    cancelIntake();
    navigate('/patients/new');
  };

  const showMissingIdentityError =
    (jobStatus.status === 'completed' && extractedPatient && !extractedPatient.first_name && !extractedPatient.date_of_birth) ||
    (jobStatus.status === 'completed' && extractedPatient && !extractedPatient.last_name && !extractedPatient.date_of_birth);

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Upload Chart (PDF) <span className="text-red-500">*</span>
        </label>
        <div
          onClick={() => document.getElementById('chart-upload')?.click()}
          className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-gray-300 rounded-md dark:border-gray-700 cursor-pointer hover:border-teal-400 transition-colors"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.dataTransfer.files?.length) {
              handleFileChange({ target: { files: e.dataTransfer.files } });
            }
          }}
        >
          <div className="space-y-1 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-teal-600 hover:text-teal-500">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">PDF – up to 100 MB.</p>
            <input
              id="chart-upload"
              type="file"
              className="sr-only"
              accept=".pdf"
              onChange={handleFileChange}
            />
          </div>
        </div>
        {fileError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fileError}</p>}
      </div>

      {selectedFile && (
        <div className="flex items-center justify-between rounded-md border border-gray-200 p-3 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Paperclip className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium truncate max-w-xs">{selectedFile.name}</span>
          </div>
          <button type="button" onClick={removeFile} className="text-red-500 hover:text-red-700 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {isAnalyzing && (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/20">
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <Loader2 className="h-4 w-4 animate-spin text-teal-500" />
            <span>Analyzing chart… this may take 10–30 seconds.</span>
          </div>
          <div className="mt-3">
            <div className="h-2 w-full rounded bg-gray-200 dark:bg-gray-800">
              <div
                className="h-2 rounded bg-teal-500 transition-all"
                style={{ width: `${Math.min(100, Math.max(0, jobStatus.progress || 0))}%` }}
              />
            </div>
            <div className="mt-1 text-xs text-gray-500">Progress: {jobStatus.progress || 0}%</div>
          </div>
        </div>
      )}

      {!isAnalyzing && jobStatus.status === 'failed' && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div>{jobStatus.error_message || 'Failed to analyze chart. Please retry.'}</div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={switchToManual} disabled={isAnalyzing || isSubmitting}>
          Switch to Manual Patient Creation
        </Button>
        <Button type="button" variant="outline" onClick={retryUpload} disabled={isAnalyzing || isSubmitting}>
          Retry Upload
        </Button>
        <Button type="button" variant="primary" onClick={startAnalysis} disabled={!canUpload}>
          {isAnalyzing ? 'Analyzing…' : 'Analyze Chart'}
        </Button>
      </div>

      <PatientReviewModal
        isOpen={reviewOpen}
        onClose={cancelIntake}
        extractedPatient={extractedPatient || {}}
        ambiguousCandidates={ambiguousCandidates}
        onConfirm={handleConfirm}
        isSubmitting={isSubmitting}
        forceMissingIdentityError={showMissingIdentityError}
      />

      <Modal
        isOpen={duplicateModal.open}
        onClose={() => setDuplicateModal({ open: false, patient: null })}
        title="Duplicate patient detected"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDuplicateModal({ open: false, patient: null })}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={attachToExisting} disabled={isSubmitting}>
              Attach this document to the existing patient
            </Button>
          </>
        }
        size="lg"
      >
        <p className="text-sm text-gray-700 dark:text-gray-200">
          A patient named &apos;{duplicateModal.patient?.first_name} {duplicateModal.patient?.last_name}&apos; with DOB &apos;
          {duplicateModal.patient?.date_of_birth}&apos; already exists.
        </p>
      </Modal>

      <Modal
        isOpen={nameConflictModal.open}
        onClose={() => setNameConflictModal({ open: false, patients: [] })}
        title="Patient name already exists"
        footer={
          <Button
            type="button"
            variant="outline"
            onClick={() => setNameConflictModal({ open: false, patients: [] })}
          >
            Close
          </Button>
        }
        size="xl"
      >
        <p className="text-sm text-gray-700 dark:text-gray-200">
          A patient with the same first and last name already exists. Please provide an additional identifier in the review modal (e.g.,
          MRN, middle initial, or a note like &quot;- Chart 04/21/2026&quot;) so it can be appended to the last name.
        </p>
        {nameConflictModal.patients.length > 0 && (
          <div className="mt-4 rounded-md border border-gray-200 p-3 text-sm dark:border-gray-800">
            <div className="font-medium mb-2">Existing patients with that name</div>
            <ul className="space-y-1">
              {nameConflictModal.patients.map(p => (
                <li key={p.id} className="text-gray-600 dark:text-gray-300">
                  {p.first_name} {p.last_name} - DOB {p.date_of_birth}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default NewPatientChartUpload;

