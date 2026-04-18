import LoadingOverlay from './LoadingOverlay';
import ConfirmationDialog from './ConfirmationDialog';
import ToastContainer from './ToastContainer';
import AnalysisProgressDock from './AnalysisProgressDock';

const GlobalUI = () => {
  return (
    <>
      <LoadingOverlay />
      <ConfirmationDialog />
      <ToastContainer />
      <AnalysisProgressDock />
    </>
  );
};

export default GlobalUI;

