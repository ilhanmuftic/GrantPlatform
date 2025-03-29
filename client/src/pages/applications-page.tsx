import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Filter, FileUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ApplicationForm from "@/components/applications/application-form";
import { Application, Program, User } from "@shared/schema";
import { Link } from "wouter";

export default function ApplicationsPage() {
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [programFilter, setProgramFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch applications
  const { data: applications, isLoading: applicationsLoading } = useQuery<Application[]>({
    queryKey: ["/api/applications"],
  });

  // Fetch programs
  const { data: programs, isLoading: programsLoading } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
  });

  // Fetch users (for showing names)
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'odobreno':
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>;
      case 'odbijeno':
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>;
      case 'u obradi':
      case 'in progress':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">In Progress</Badge>;
      case 'draft':
        return <Badge className="bg-neutral-100 text-neutral-800 hover:bg-neutral-100">Draft</Badge>;
      case 'submitted':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Submitted</Badge>;
      default:
        return <Badge className="bg-neutral-100 text-neutral-800 hover:bg-neutral-100">{status}</Badge>;
    }
  };

  // Filter applications
  const filteredApplications = applications?.filter((app) => {
    // Filter by status
    if (statusFilter !== "all" && app.status !== statusFilter) {
      return false;
    }
    
    // Filter by program
    if (programFilter !== "all" && app.programId.toString() !== programFilter) {
      return false;
    }
    
    // Search by summary or code
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        app.summary.toLowerCase().includes(query) ||
        app.autoCode.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  const isLoading = applicationsLoading || programsLoading || usersLoading;

  return (
    <MainLayout title="Applications">
      <div className="container mx-auto">
        {/* Action Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
          <div className="flex flex-col sm:flex-row w-full md:w-auto space-y-4 sm:space-y-0 sm:space-x-4">
            {/* Search Applications */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={18} />
              <Input
                placeholder="Search applications..."
                className="pl-10 w-full sm:w-[250px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Filters */}
            <div className="flex space-x-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="u obradi">In Progress</SelectItem>
                  <SelectItem value="preporučeno">Recommended</SelectItem>
                  <SelectItem value="odobreno">Approved</SelectItem>
                  <SelectItem value="odbijeno">Rejected</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={programFilter} onValueChange={setProgramFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Program" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programs</SelectItem>
                  {programs?.map((program) => (
                    <SelectItem key={program.id} value={program.id.toString()}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button onClick={() => setShowApplicationForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Application
          </Button>
        </div>
        
        {/* Applications Table */}
        <Card>
          <CardHeader className="px-6 py-5 border-b border-neutral-200">
            <CardTitle className="text-lg font-semibold text-neutral-900">Applications</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Code</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Project</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Program</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Documents</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-sm text-neutral-500">
                        <div className="flex justify-center">
                          <div className="loader"></div>
                        </div>
                        <p className="mt-2">Loading applications...</p>
                      </td>
                    </tr>
                  ) : filteredApplications?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-sm text-neutral-500">
                        No applications found with the current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredApplications?.map((app) => {
                      const program = programs?.find(p => p.id === app.programId);
                      return (
                        <tr key={app.id} className="hover:bg-neutral-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                            <Link href={`/applications/${app.id}`}>
                              <a>{app.autoCode}</a>
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                            {app.summary}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                            {program?.name || 'Unknown Program'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                            {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : 'Not submitted'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(app.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Button variant="ghost" size="sm">
                              <FileUp className="h-4 w-4 mr-1" />
                              Upload
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Application Form Dialog */}
      {showApplicationForm && (
        <ApplicationForm
          open={showApplicationForm}
          onClose={() => setShowApplicationForm(false)}
        />
      )}
    </MainLayout>
  );
}
