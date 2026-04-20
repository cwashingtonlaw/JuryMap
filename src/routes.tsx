import { createBrowserRouter, Navigate } from 'react-router-dom';
import CaseList from './screens/CaseList';
import CaseSetup from './screens/CaseSetup';
import Questioning from './screens/Questioning';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/cases" replace /> },
  { path: '/cases', element: <CaseList /> },
  { path: '/cases/new', element: <CaseSetup /> },
  { path: '/cases/:caseId/questioning', element: <Questioning /> },
]);
