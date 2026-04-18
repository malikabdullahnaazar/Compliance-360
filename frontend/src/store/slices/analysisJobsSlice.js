import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  jobs: [],
};

const analysisJobsSlice = createSlice({
  name: 'analysisJobs',
  initialState,
  reducers: {
    registerJob(state, action) {
      const { jobId, patientId, patientName, model } = action.payload;
      if (!jobId || state.jobs.some((j) => j.jobId === jobId)) {
        return;
      }
      state.jobs.push({
        jobId,
        patientId: patientId || '',
        patientName: patientName || '',
        model: model || '',
        state: 'pending',
        progress: 0,
        resultId: null,
        reportStatus: null,
        error: null,
      });
    },
    patchJob(state, action) {
      const { jobId, ...rest } = action.payload;
      const j = state.jobs.find((x) => x.jobId === jobId);
      if (j) {
        Object.assign(j, rest);
      }
    },
    removeJob(state, action) {
      const jobId = action.payload;
      state.jobs = state.jobs.filter((j) => j.jobId !== jobId);
    },
  },
});

export const { registerJob, patchJob, removeJob } = analysisJobsSlice.actions;

export const selectAnalysisJobs = (state) => state.analysisJobs.jobs;

export default analysisJobsSlice.reducer;
