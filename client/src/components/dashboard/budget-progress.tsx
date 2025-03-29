import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ProgramBudget {
  id: number;
  name: string;
  budgetTotal: number;
  available: number;
  allocated: number;
  allocatedPercentage: number;
}

interface BudgetProgressProps {
  budgetData: ProgramBudget[];
}

export default function BudgetProgress({ budgetData }: BudgetProgressProps) {
  return (
    <Card>
      <CardHeader className="px-6 py-5 border-b border-neutral-200">
        <CardTitle className="text-lg font-semibold text-neutral-900">Program Budget Status</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {budgetData.map((program) => (
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
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
