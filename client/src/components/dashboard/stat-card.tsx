import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: string;
  iconBackgroundColor: string;
  iconColor: string;
  trend?: {
    value: number;
    label: string;
    isPositive: boolean;
  };
}

export default function StatCard({
  title,
  value,
  icon,
  iconBackgroundColor,
  iconColor,
  trend,
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center">
          <div className={`p-3 rounded-full ${iconBackgroundColor} ${iconColor}`}>
            <span className="material-icons">{icon}</span>
          </div>
          <div className="ml-4">
            <h2 className="text-sm font-medium text-neutral-500">{title}</h2>
            <p className="text-2xl font-semibold text-neutral-900">{value}</p>
          </div>
        </div>
        {trend && (
          <div className="mt-3">
            <div className="flex items-center text-sm">
              <span className={`${trend.isPositive ? 'text-success' : 'text-error'} flex items-center`}>
                <span className="material-icons text-sm">
                  {trend.isPositive ? 'arrow_upward' : 'arrow_downward'}
                </span>
                {trend.value}
              </span>
              <span className="ml-2 text-neutral-600">{trend.label}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
