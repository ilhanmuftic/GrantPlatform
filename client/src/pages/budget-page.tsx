import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PieController,
  ArcElement,
  DoughnutController,
  PointElement,
  LineElement,
  RadialLinearScale,
  Filler
} from "chart.js";
import { Bar, Pie, Doughnut } from "react-chartjs-2";
import { Program, BudgetTracking } from "@shared/schema";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger
} from "@/components/ui/tabs";

// Register Chart.js components
Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PieController,
  ArcElement,
  DoughnutController,
  PointElement,
  LineElement,
  RadialLinearScale,
  Filler
);

export default function BudgetPage() {
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch budget data
  const { data: budgetResponse, isLoading } = useQuery<{program: Program, budget: BudgetTracking}[]>({
    queryKey: ["/api/budget"],
  });

  // Process data for budget overview
  const getBudgetOverviewData = () => {
    if (!budgetResponse) return [];
    
    return budgetResponse.map(item => {
      const allocated = item.program.budgetTotal - (item.budget.available || 0);
      const allocatedPercentage = Math.round((allocated / item.program.budgetTotal) * 100);
      
      return {
        id: item.program.id,
        name: item.program.name,
        budgetTotal: item.program.budgetTotal,
        reserved: item.budget.reserved || 0,
        approved: item.budget.approved || 0,
        spent: item.budget.spent || 0,
        available: item.budget.available || 0,
        allocated,
        allocatedPercentage,
      };
    });
  };

  const budgetData = getBudgetOverviewData();

  // Chart data
  const barChartData = {
    labels: budgetData.map(program => program.name),
    datasets: [
      {
        label: 'Total Budget',
        data: budgetData.map(program => program.budgetTotal),
        backgroundColor: 'rgba(63, 81, 181, 0.8)',
      },
      {
        label: 'Reserved',
        data: budgetData.map(program => program.reserved),
        backgroundColor: 'rgba(255, 193, 7, 0.8)',
      },
      {
        label: 'Approved',
        data: budgetData.map(program => program.approved),
        backgroundColor: 'rgba(0, 200, 83, 0.8)',
      },
      {
        label: 'Spent',
        data: budgetData.map(program => program.spent),
        backgroundColor: 'rgba(244, 67, 54, 0.8)',
      },
    ]
  };

  const pieChartData = {
    labels: ['Reserved', 'Approved', 'Spent', 'Available'],
    datasets: [
      {
        data: [
          budgetData.reduce((sum, program) => sum + program.reserved, 0),
          budgetData.reduce((sum, program) => sum + program.approved, 0),
          budgetData.reduce((sum, program) => sum + program.spent, 0),
          budgetData.reduce((sum, program) => sum + program.available, 0),
        ],
        backgroundColor: [
          'rgba(255, 193, 7, 0.8)',
          'rgba(0, 200, 83, 0.8)',
          'rgba(244, 67, 54, 0.8)',
          'rgba(63, 81, 181, 0.8)',
        ],
        borderColor: [
          'rgba(255, 193, 7, 1)',
          'rgba(0, 200, 83, 1)',
          'rgba(244, 67, 54, 1)',
          'rgba(63, 81, 181, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const doughnutChartData = {
    labels: budgetData.map(program => program.name),
    datasets: [
      {
        data: budgetData.map(program => program.budgetTotal),
        backgroundColor: [
          'rgba(63, 81, 181, 0.8)',
          'rgba(0, 200, 83, 0.8)',
          'rgba(255, 193, 7, 0.8)',
        ],
        borderColor: [
          'rgba(63, 81, 181, 1)',
          'rgba(0, 200, 83, 1)',
          'rgba(255, 193, 7, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  return (
    <MainLayout title="Budget Management">
      <div className="container mx-auto">
        {/* Budget Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-neutral-500">Total Budget</span>
                <span className="text-2xl font-semibold text-neutral-900">
                  ${budgetData.reduce((sum, program) => sum + program.budgetTotal, 0).toLocaleString()}
                </span>
                <span className="text-xs text-neutral-500 mt-1">
                  Across {budgetData.length} active programs
                </span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-neutral-500">Reserved</span>
                <span className="text-2xl font-semibold text-neutral-900">
                  ${budgetData.reduce((sum, program) => sum + program.reserved, 0).toLocaleString()}
                </span>
                <span className="text-xs text-neutral-500 mt-1">
                  {Math.round((budgetData.reduce((sum, program) => sum + program.reserved, 0) / 
                   budgetData.reduce((sum, program) => sum + program.budgetTotal, 0)) * 100)}% of total budget
                </span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-neutral-500">Spent</span>
                <span className="text-2xl font-semibold text-neutral-900">
                  ${budgetData.reduce((sum, program) => sum + program.spent, 0).toLocaleString()}
                </span>
                <span className="text-xs text-neutral-500 mt-1">
                  {Math.round((budgetData.reduce((sum, program) => sum + program.spent, 0) / 
                   budgetData.reduce((sum, program) => sum + program.budgetTotal, 0)) * 100)}% of total budget
                </span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-neutral-500">Available</span>
                <span className="text-2xl font-semibold text-neutral-900">
                  ${budgetData.reduce((sum, program) => sum + program.available, 0).toLocaleString()}
                </span>
                <span className="text-xs text-neutral-500 mt-1">
                  {Math.round((budgetData.reduce((sum, program) => sum + program.available, 0) / 
                   budgetData.reduce((sum, program) => sum + program.budgetTotal, 0)) * 100)}% of total budget
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Budget Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
            <TabsTrigger value="details">Program Details</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview">
            <Card>
              <CardHeader className="px-6 py-5 border-b border-neutral-200">
                <CardTitle className="text-lg font-semibold text-neutral-900">Program Budget Status</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="loader"></div>
                    </div>
                  ) : budgetData.length === 0 ? (
                    <div className="py-8 text-center text-neutral-500">
                      <p>No budget data available</p>
                    </div>
                  ) : (
                    budgetData.map((program) => (
                      <div key={program.id} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium text-neutral-900">{program.name}</h4>
                            <div className="text-sm text-neutral-500">Budget: ${program.budgetTotal.toLocaleString()}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-neutral-800">
                              ${program.available.toLocaleString()} available
                            </div>
                            <div className="text-sm text-neutral-500">
                              {program.allocatedPercentage}% allocated
                            </div>
                          </div>
                        </div>
                        <Progress value={program.allocatedPercentage} className="h-2.5 bg-neutral-200" />
                        
                        <div className="grid grid-cols-4 gap-4 mt-2 pt-2">
                          <div>
                            <div className="text-xs text-neutral-500">Reserved</div>
                            <div className="font-medium">${program.reserved.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-xs text-neutral-500">Approved</div>
                            <div className="font-medium">${program.approved.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-xs text-neutral-500">Spent</div>
                            <div className="font-medium">${program.spent.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-xs text-neutral-500">Available</div>
                            <div className="font-medium">${program.available.toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Charts Tab */}
          <TabsContent value="charts">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="px-6 py-5 border-b border-neutral-200">
                  <CardTitle className="text-lg font-semibold text-neutral-900">Budget Distribution</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-96">
                    {isLoading ? (
                      <div className="flex justify-center items-center h-full">
                        <div className="loader"></div>
                      </div>
                    ) : (
                      <Bar data={barChartData} options={chartOptions} />
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="px-6 py-5 border-b border-neutral-200">
                  <CardTitle className="text-lg font-semibold text-neutral-900">Allocation Status</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-96">
                    {isLoading ? (
                      <div className="flex justify-center items-center h-full">
                        <div className="loader"></div>
                      </div>
                    ) : (
                      <Pie data={pieChartData} options={chartOptions} />
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="lg:col-span-2">
                <CardHeader className="px-6 py-5 border-b border-neutral-200">
                  <CardTitle className="text-lg font-semibold text-neutral-900">Program Budget Distribution</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-96">
                    {isLoading ? (
                      <div className="flex justify-center items-center h-full">
                        <div className="loader"></div>
                      </div>
                    ) : (
                      <Doughnut data={doughnutChartData} options={chartOptions} />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Details Tab */}
          <TabsContent value="details">
            <Card>
              <CardHeader className="px-6 py-5 border-b border-neutral-200">
                <CardTitle className="text-lg font-semibold text-neutral-900">Program Budget Details</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-200">
                        <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Program</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Total Budget</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Reserved</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Approved</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Spent</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Available</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Usage %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {isLoading ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-10 text-center text-sm text-neutral-500">
                            <div className="flex justify-center">
                              <div className="loader"></div>
                            </div>
                            <p className="mt-2">Loading budget data...</p>
                          </td>
                        </tr>
                      ) : budgetData.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-10 text-center text-sm text-neutral-500">
                            No budget data available
                          </td>
                        </tr>
                      ) : (
                        budgetData.map((program) => (
                          <tr key={program.id} className="hover:bg-neutral-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">{program.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                              {budgetResponse?.find(item => item.program.id === program.id)?.program.type || 'Unknown'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">${program.budgetTotal.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-amber-600">${program.reserved.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">${program.approved.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">${program.spent.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">${program.available.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex items-center">
                                <span className="mr-2">{program.allocatedPercentage}%</span>
                                <div className="w-24 bg-neutral-200 rounded-full h-2">
                                  <div 
                                    className="bg-primary h-2 rounded-full" 
                                    style={{ width: `${program.allocatedPercentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                      
                      {/* Summary Row */}
                      {budgetData.length > 0 && (
                        <tr className="bg-neutral-50 font-medium">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">TOTAL</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500"></td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                            ${budgetData.reduce((sum, program) => sum + program.budgetTotal, 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-amber-600">
                            ${budgetData.reduce((sum, program) => sum + program.reserved, 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                            ${budgetData.reduce((sum, program) => sum + program.approved, 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                            ${budgetData.reduce((sum, program) => sum + program.spent, 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                            ${budgetData.reduce((sum, program) => sum + program.available, 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {Math.round((budgetData.reduce((sum, program) => sum + (program.budgetTotal - program.available), 0) / 
                             budgetData.reduce((sum, program) => sum + program.budgetTotal, 0)) * 100)}%
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
