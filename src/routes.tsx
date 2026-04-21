import { createBrowserRouter, Navigate } from 'react-router-dom';
import CaseList from './screens/CaseList';
import CaseSetup from './screens/CaseSetup';
import Questioning from './screens/Questioning';
import Decision from './screens/Decision';
import SeatedJury from './screens/SeatedJury';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/cases" replace /> },
  { path: '/cases', element: <CaseList /> },
  { path: '/cases/new', element: <CaseSetup /> },
  { path: '/cases/:caseId/questioning', element: <Questioning /> },
  { path: '/cases/:caseId/decision', element: <Decision /> },
  { path: '/cases/:caseId/seated', element: <SeatedJury /> },
]);
