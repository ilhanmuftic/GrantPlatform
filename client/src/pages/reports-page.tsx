import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Application, Program, BudgetTracking, User } from "@shared/schema";
import { BarChart, LineChart, PieChart } from "recharts";
import { BarChart2, LineChart as LineChartIcon, PieChart as PieChartIcon, Download, Table as TableIcon, FileText } from "lucide-react";
import { Bar, Line, Pie } from "react-chartjs-2";
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement,
} from "chart.js";

// Register Chart.js components
Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement
);

export default function ReportsPage() {
  const [reportType, setReportType] = useState("applications");
  const [timeframe, setTimeframe] = useState("monthly");
  const [year, setYear] = useState("2025");
  const [viewMode, setViewMode] = useState("chart");

  // Fetch applications
  const { data: applications, isLoading: applicationsLoading } = useQuery<Application[]>({
    queryKey: ["/api/applications"],
  });

  // Fetch programs
  const { data: programs, isLoading: programsLoading } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
  });

  // Fetch budget data
  const { data: budgetResponse, isLoading: budgetLoading } = useQuery<{program: Program, budget: BudgetTracking}[]>({
    queryKey: ["/api/budget"],
  });

  // Fetch users
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const isLoading = applicationsLoading || programsLoading || budgetLoading || usersLoading;

  // Generate application status report data
  const getApplicationStatusData = () => {
    if (!applications) return null;
    
    const statuses = {
      draft: 0,
      submitted: 0,
      "u obradi": 0,
      "preporučeno": 0,
      "odbijeno": 0,
      "odobreno": 0,
      "completed": 0,
    };
    
    applications.forEach(app => {
      if (app.status in statuses) {
        statuses[app.status as keyof typeof statuses]++;
      }
    });
    
    return {
      labels: Object.keys(statuses).map(status => 
        status.charAt(0).toUpperCase() + status.slice(1)
      ),
      datasets: [
        {
          label: 'Applications',
          data: Object.values(statuses),
          backgroundColor: [
            'rgba(63, 81, 181, 0.8)', // primary
            'rgba(255, 152, 0, 0.8)', // warning
            'rgba(33, 150, 243, 0.8)', // info
            'rgba(0, 200, 83, 0.8)', // success
            'rgba(244, 67, 54, 0.8)', // error
            'rgba(0, 229, 255, 0.8)', // teal
            'rgba(156, 39, 176, 0.8)', // purple
          ],
          borderColor: [
            'rgba(63, 81, 181, 1)',
            'rgba(255, 152, 0, 1)',
            'rgba(33, 150, 243, 1)',
            'rgba(0, 200, 83, 1)',
            'rgba(244, 67, 54, 1)',
            'rgba(0, 229, 255, 1)',
            'rgba(156, 39, 176, 1)',
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  // Generate budget usage report data
  const getBudgetUsageData = () => {
    if (!budgetResponse) return null;
    
    return {
      labels: budgetResponse.map(item => item.program.name),
      datasets: [
        {
          label: 'Total Budget',
          data: budgetResponse.map(item => item.program.budgetTotal),
          backgroundColor: 'rgba(63, 81, 181, 0.8)',
        },
        {
          label: 'Reserved',
          data: budgetResponse.map(item => item.budget.reserved || 0),
          backgroundColor: 'rgba(255, 152, 0, 0.8)',
        },
        {
          label: 'Approved',
          data: budgetResponse.map(item => item.budget.approved || 0),
          backgroundColor: 'rgba(0, 200, 83, 0.8)',
        },
        {
          label: 'Spent',
          data: budgetResponse.map(item => item.budget.spent || 0),
          backgroundColor: 'rgba(244, 67, 54, 0.8)',
        },
      ]
    };
  };

  // Generate application trend data
  const getApplicationTrendData = () => {
    if (!applications) return null;
    
    // Group applications by month
    const monthlyData: { [key: string]: number } = {
      "Jan": 0, "Feb": 0, "Mar": 0, "Apr": 0, "May": 0, "Jun": 0, 
      "Jul": 0, "Aug": 0, "Sep": 0, "Oct": 0, "Nov": 0, "Dec": 0
    };
    
    applications.forEach(app => {
      if (app.submittedAt) {
        const date = new Date(app.submittedAt);
        const month = date.toLocaleString('en-US', { month: 'short' });
        monthlyData[month]++;
      }
    });
    
    return {
      labels: Object.keys(monthlyData),
      datasets: [
        {
          label: 'Applications',
          data: Object.values(monthlyData),
          borderColor: 'rgba(63, 81, 181, 1)',
          backgroundColor: 'rgba(63, 81, 181, 0.2)',
          tension: 0.4,
          fill: true,
        },
      ],
    };
  };

  // Choose report data based on type
  const getReportData = () => {
    switch (reportType) {
      case "applications":
        return getApplicationStatusData();
      case "budget":
        return getBudgetUsageData();
      case "trend":
        return getApplicationTrendData();
      default:
        return null;
    }
  };

  // Get chart component based on report type
  const getChartComponent = () => {
    const data = getReportData();
    if (!data) return null;
    
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: false,
        },
      },
    };
    
    switch (reportType) {
      case "applications":
        return <Pie data={data} options={options} />;
      case "budget":
        return <Bar data={data} options={options} />;
      case "trend":
        return <Line data={data} options={options} />;
      default:
        return null;
    }
  };

  // Get table data based on report type
  const getTableData = () => {
    switch (reportType) {
      case "applications":
        if (!applications) return [];
        
        const statusCounts: Record<string, number> = {};
        applications.forEach(app => {
          statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
        });
        
        return Object.entries(statusCounts).map(([status, count]) => ({
          status: status.charAt(0).toUpperCase() + status.slice(1),
          count,
          percentage: Math.round((count / applications.length) * 100),
        }));
        
      case "budget":
        if (!budgetResponse) return [];
        
        return budgetResponse.map(item => ({
          program: item.program.name,
          total: item.program.budgetTotal,
          reserved: item.budget.reserved || 0,
          approved: item.budget.approved || 0,
          spent: item.budget.spent || 0,
          available: item.budget.available || 0,
          usage: Math.round(((item.program.budgetTotal - (item.budget.available || 0)) / item.program.budgetTotal) * 100),
        }));
        
      case "trend":
        if (!applications) return [];
        
        const monthlyData: Record<string, number> = {
          "Jan": 0, "Feb": 0, "Mar": 0, "Apr": 0, "May": 0, "Jun": 0, 
          "Jul": 0, "Aug": 0, "Sep": 0, "Oct": 0, "Nov": 0, "Dec": 0
        };
        
        applications.forEach(app => {
          if (app.submittedAt) {
            const date = new Date(app.submittedAt);
            const month = date.toLocaleString('en-US', { month: 'short' });
            monthlyData[month]++;
          }
        });
        
        return Object.entries(monthlyData).map(([month, count]) => ({
          month,
          count,
        }));
        
      default:
        return [];
    }
  };

  return (
    <MainLayout title="Reports">
      <div className="container mx-auto">
        {/* Report Controls */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Report Type</label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="applications">Application Status</SelectItem>
                    <SelectItem value="budget">Budget Usage</SelectItem>
                    <SelectItem value="trend">Application Trend</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">View Mode</label>
                <div className="flex space-x-2">
                  <Button
                    variant={viewMode === "chart" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setViewMode("chart")}
                  >
                    <BarChart2 className="h-4 w-4 mr-2" />
                    Chart
                  </Button>
                  <Button
                    variant={viewMode === "table" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setViewMode("table")}
                  >
                    <TableIcon className="h-4 w-4 mr-2" />
                    Table
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Time Frame</label>
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time frame" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Year</label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Report Display */}
        <Card>
          <CardHeader className="px-6 py-5 border-b border-neutral-200">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg font-semibold text-neutral-900">
                  {reportType === "applications" && "Application Status Report"}
                  {reportType === "budget" && "Budget Usage Report"}
                  {reportType === "trend" && "Application Trend Report"}
                </CardTitle>
                <CardDescription>
                  {timeframe === "monthly" && `Monthly data for ${year}`}
                  {timeframe === "quarterly" && `Quarterly data for ${year}`}
                  {timeframe === "yearly" && `Yearly data for ${year}`}
                </CardDescription>
              </div>
              
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <div className="loader"></div>
              </div>
            ) : (
              viewMode === "chart" ? (
                <div className="h-96">
                  {getChartComponent()}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-200">
                        {reportType === "applications" && (
                          <>
                            <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Count</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Percentage</th>
                          </>
                        )}
                        
                        {reportType === "budget" && (
                          <>
                            <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Program</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Total Budget</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Reserved</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Approved</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Spent</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Available</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">% Used</th>
                          </>
                        )}
                        
                        {reportType === "trend" && (
                          <>
                            <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Month</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Applications</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {getTableData().map((item, index) => (
                        <tr key={index} className="hover:bg-neutral-50">
                          {reportType === "applications" && (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">{item.status}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{item.count}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{item.percentage}%</td>
                            </>
                          )}
                          
                          {reportType === "budget" && (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">{item.program}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">${item.total.toLocaleString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-amber-600">${item.reserved.toLocaleString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">${item.approved.toLocaleString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">${item.spent.toLocaleString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">${item.available.toLocaleString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{item.usage}%</td>
                            </>
                          )}
                          
                          {reportType === "trend" && (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">{item.month}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{item.count}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
