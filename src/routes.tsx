import { createBrowserRouter, Navigate } from 'react-router-dom';
import CaseList from './screens/CaseList';
import CaseSetup from './screens/CaseSetup';
import Questioning from './screens/Questioning';
import Decision from './screens/Decision';
import SeatedJury from './screens/SeatedJury';
import PeremptoryTrackerScreen from './screens/PeremptoryTrackerScreen';
import PdfPreview from './screens/PdfPreview';
import BatsonAnalysis from './screens/BatsonAnalysis';
import InstallOnboarding from './screens/InstallOnboarding';
import Help from './screens/Help';
import AnalogyReport from './screens/AnalogyReport';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/cases" replace /> },
  { path: '/cases', element: <CaseList /> },
  { path: '/cases/new', element: <CaseSetup /> },
  { path: '/cases/:caseId/questioning', element: <Questioning /> },
  { path: '/cases/:caseId/decision', element: <Decision /> },
  { path: '/cases/:caseId/seated', element: <SeatedJury /> },
  { path: '/cases/:caseId/tracker', element: <PeremptoryTrackerScreen /> },
  { path: '/cases/:caseId/report', element: <PdfPreview /> },
  { path: '/cases/:caseId/batson', element: <BatsonAnalysis /> },
  { path: '/cases/:caseId/analogies', element: <AnalogyReport /> },
  { path: '/onboarding', element: <InstallOnboarding /> },
  { path: '/help', element: <Help /> },
]);
