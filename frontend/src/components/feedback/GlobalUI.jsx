import LoadingOverlay from './LoadingOverlay';
import ConfirmationDialog from './ConfirmationDialog';
import ToastContainer from './ToastContainer';

const GlobalUI = () => {
  return (
    <>
      <LoadingOverlay />
      <ConfirmationDialog />
      <ToastContainer />
    </>
  );
};

export default GlobalUI;

