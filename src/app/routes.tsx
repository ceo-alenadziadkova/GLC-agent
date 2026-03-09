import { createBrowserRouter, Navigate } from "react-router";
import { AuditLayout } from "./pages/AuditLayout";
import { DomainReport } from "./pages/DomainReport";
import { StrategyReport } from "./pages/StrategyReport";
import { OverviewReport } from "./pages/OverviewReport";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/audit/overview" replace />,
  },
  {
    path: "/audit",
    element: <AuditLayout />,
    children: [
      {
        path: "overview",
        element: <OverviewReport />,
      },
      {
        path: ":domainId",
        element: <DomainReport />,
      },
      {
        path: "strategy",
        element: <StrategyReport />,
      },
    ],
  },
]);