import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import Dashboard from "@/pages/dashboard";
import AuthPage from "@/pages/auth-page";
import ApplicationsPage from "@/pages/applications-page";
import MessagesPage from "@/pages/messages-page";
import BudgetPage from "@/pages/budget-page";
import DocumentsPage from "@/pages/documents-page";
import ReportsPage from "@/pages/reports-page";
import AdminPage from "@/pages/admin-page";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/applications" component={ApplicationsPage} />
      <ProtectedRoute path="/messages" component={MessagesPage} />
      <ProtectedRoute 
        path="/budget" 
        component={BudgetPage} 
        allowedRoles={["administrator", "reviewer", "donor"]}
      />
      <ProtectedRoute path="/documents" component={DocumentsPage} />
      <ProtectedRoute 
        path="/reports" 
        component={ReportsPage} 
        allowedRoles={["administrator", "reviewer", "donor"]}
      />
      <ProtectedRoute 
        path="/admin" 
        component={AdminPage} 
        allowedRoles={["administrator"]}
      />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
