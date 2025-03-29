import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

interface Application {
  id: number;
  autoCode: string;
  applicantName: string;
  programName: string;
  status: string;
}

interface ApplicationTableProps {
  applications: Application[];
  title: string;
}

export default function ApplicationTable({ applications, title }: ApplicationTableProps) {
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

  return (
    <Card>
      <CardHeader className="px-6 py-5 border-b border-neutral-200 flex justify-between items-center">
        <CardTitle className="text-lg font-semibold text-neutral-900">{title}</CardTitle>
        <Link href="/applications">
          <a className="text-sm text-primary hover:text-primary-dark font-medium">View all</a>
        </Link>
      </CardHeader>
      <CardContent className="p-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead>
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Code</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Applicant</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Program</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-neutral-50">
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-neutral-900 font-medium">
                    <Link href={`/applications/${app.id}`}>
                      <a className="hover:text-primary">{app.autoCode}</a>
                    </Link>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-neutral-900">{app.applicantName}</td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-neutral-500">{app.programName}</td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    {getStatusBadge(app.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
