import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import StatCard from "@/components/dashboard/stat-card";
import BudgetProgress from "@/components/dashboard/budget-progress";
import ApplicationTable from "@/components/dashboard/application-table";
import MessageList from "@/components/dashboard/message-list";
import { useAuth } from "@/hooks/use-auth";
import { Application, Program, Message, User, BudgetTracking } from "@shared/schema";

interface ApplicationWithDetails {
  id: number;
  autoCode: string;
  applicantName: string;
  programName: string;
  status: string;
}

interface ProgramBudget {
  id: number;
  name: string;
  budgetTotal: number;
  available: number;
  allocated: number;
  allocatedPercentage: number;
}

interface MessageWithDetails {
  id: number;
  sender: {
    id: number;
    fullName: string;
    initials: string;
  };
  content: string;
  timestamp: Date;
  isRead: boolean;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [budgetData, setBudgetData] = useState<ProgramBudget[]>([]);
  const [messages, setMessages] = useState<MessageWithDetails[]>([]);

  // Fetch applications
  const { data: applicationsData } = useQuery<Application[]>({
    queryKey: ["/api/applications"],
  });

  // Fetch programs
  const { data: programsData } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
  });

  // Fetch budget data
  const { data: budgetResponse } = useQuery<{program: Program, budget: BudgetTracking}[]>({
    queryKey: ["/api/budget"],
  });

  // Fetch messages
  const { data: messagesData } = useQuery<{received: Message[], sent: Message[]}>({
    queryKey: ["/api/messages"],
  });

  // Fetch users (for showing names)
  const { data: usersData } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Process data for display components
  useEffect(() => {
    if (applicationsData && programsData && usersData) {
      const processedApplications = applicationsData.slice(0, 3).map(app => {
        const program = programsData.find(p => p.id === app.programId);
        const applicant = usersData.find(u => u.id === app.applicantId);
        return {
          id: app.id,
          autoCode: app.autoCode,
          applicantName: applicant?.fullName || "Unknown",
          programName: program?.name || "Unknown Program",
          status: app.status,
        };
      });
      setApplications(processedApplications);
    }
  }, [applicationsData, programsData, usersData]);

  useEffect(() => {
    if (budgetResponse) {
      const processedBudget = budgetResponse.map(item => {
        const allocated = item.program.budgetTotal - (item.budget.available || 0);
        const allocatedPercentage = Math.round((allocated / item.program.budgetTotal) * 100);
        return {
          id: item.program.id,
          name: item.program.name,
          budgetTotal: item.program.budgetTotal,
          available: item.budget.available || 0,
          allocated,
          allocatedPercentage,
        };
      });
      setBudgetData(processedBudget);
    }
  }, [budgetResponse]);

  useEffect(() => {
    if (messagesData && usersData) {
      const processedMessages = messagesData.received.slice(0, 3).map(msg => {
        const sender = usersData.find(u => u.id === msg.senderId);
        const initials = sender?.fullName
          .split(" ")
          .map(name => name[0])
          .join("")
          .toUpperCase() || "??";
        
        return {
          id: msg.id,
          sender: {
            id: msg.senderId,
            fullName: sender?.fullName || "Unknown User",
            initials,
          },
          content: msg.content,
          timestamp: msg.createdAt || new Date(),
          isRead: msg.read,
        };
      });
      setMessages(processedMessages);
    }
  }, [messagesData, usersData]);

  // Count stats for the dashboard
  const activeApplicationsCount = applicationsData?.filter(
    app => ["draft", "submitted", "u obradi"].includes(app.status)
  ).length || 0;
  
  const approvedApplicationsCount = applicationsData?.filter(
    app => app.status === "odobreno"
  ).length || 0;
  
  const pendingReviewCount = applicationsData?.filter(
    app => app.status === "submitted"
  ).length || 0;

  const unreadMessagesCount = messagesData?.received.filter(
    msg => !msg.read
  ).length || 0;

  return (
    <MainLayout title="Dashboard">
      <div className="container mx-auto">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            title="Active Applications"
            value={activeApplicationsCount}
            icon="description"
            iconBackgroundColor="bg-blue-100"
            iconColor="text-primary"
            trend={{ value: 2, label: "since last week", isPositive: true }}
          />
          
          <StatCard
            title="Approved"
            value={approvedApplicationsCount}
            icon="check_circle"
            iconBackgroundColor="bg-green-100"
            iconColor="text-accent"
            trend={{ value: 3, label: "since last month", isPositive: true }}
          />
          
          <StatCard
            title="Pending Review"
            value={pendingReviewCount}
            icon="pending"
            iconBackgroundColor="bg-amber-100"
            iconColor="text-warning"
            trend={{ value: unreadMessagesCount, label: "unread messages", isPositive: false }}
          />
        </div>

        {/* Program Budget Status */}
        <div className="mb-6">
          <BudgetProgress budgetData={budgetData} />
        </div>

        {/* Recent Applications and Messages */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ApplicationTable 
            applications={applications} 
            title="Recent Applications"
          />
          
          <MessageList messages={messages} />
        </div>
      </div>
    </MainLayout>
  );
}
