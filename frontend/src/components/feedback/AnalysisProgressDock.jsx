import { useEffect, useRef } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Loader2, X } from 'lucide-react';
import api from '../../services/api';
import { patchJob, removeJob, selectAnalysisJobs } from '../../store/slices/analysisJobsSlice';

const pollMs = Number(import.meta.env.VITE_ANALYSIS_POLL_MS) || 3000;

const AnalysisProgressDock = () => {
  const jobs = useSelector(selectAnalysisJobs);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const store = useStore();
  const intervalRef = useRef(null);

  useEffect(() => {
    if (jobs.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const poll = async () => {
      const list = selectAnalysisJobs(store.getState());
      for (const job of list) {
        if (job.state === 'completed' || job.state === 'failed') {
          continue;
        }
        try {
          const { data } = await api.get(`/ai/mistral/jobs/${job.jobId}/status/`);
          dispatch(
            patchJob({
              jobId: job.jobId,
              state: data.state,
              progress: data.progress ?? 0,
              resultId: data.result_id || null,
              reportStatus: data.report_status || null,
              error: data.error || null,
            })
          );
        } catch {
          /* next interval */
        }
      }
    };

    poll();
    intervalRef.current = setInterval(poll, pollMs);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [jobs.length, store, dispatch]);

  if (!jobs.length) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[55] flex w-full max-w-sm flex-col gap-3 sm:w-auto"
      aria-label="Background analysis jobs"
    >
      {jobs.map((job) => (
        <div
          key={job.jobId}
          className="pointer-events-auto rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-900"
          role="status"
          aria-live="polite"
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Document analysis</p>
              {job.patientName ? (
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">{job.patientName}</p>
              ) : null}
              {job.model ? (
                <p className="text-xs text-gray-400 dark:text-gray-500">Model: {job.model}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="cursor-pointer rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              onClick={() => dispatch(removeJob(job.jobId))}
              aria-label="Dismiss analysis notification"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {job.state === 'failed' ? (
            <p className="text-sm text-red-600 dark:text-red-400">{job.error || 'Analysis failed.'}</p>
          ) : (
            <>
              <div className="mb-1 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                <span className="flex items-center gap-1">
                  {job.state !== 'completed' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-500" aria-hidden="true" />
                  ) : null}
                  {job.state === 'completed' ? 'Complete' : 'In progress'}
                </span>
                <span>{Math.min(100, Math.max(0, job.progress))}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-400 to-indigo-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, job.progress))}%` }}
                />
              </div>
            </>
          )}

          {job.state === 'completed' && job.resultId ? (
            <button
              type="button"
              className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
              onClick={() => {
                const tab = job.reportStatus === 'Pass' ? 'passed' : 'result';
                navigate(`/ai-analyzer/report/${job.resultId}`, {
                  state: { tab, patientId: job.patientId },
                });
              }}
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              View report
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
};

export default AnalysisProgressDock;
