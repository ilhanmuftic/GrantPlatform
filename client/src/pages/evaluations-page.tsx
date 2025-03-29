import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import MainLayout from "@/components/layout/main-layout";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogClose 
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertEvaluationSchema } from "@shared/schema";
import { Evaluation, Application, Program, User } from "@shared/schema";
import { Loader2 } from "lucide-react";

// Define the evaluation form schema
const evaluationFormSchema = z.object({
  applicationId: z.number(),
  score: z.number().min(1).max(100).optional(),
  decision: z.enum(["preporučeno", "odbijeno", "revisit"]),
  comment: z.string().min(10, {
    message: "Comment must be at least 10 characters.",
  }),
});

type EvaluationFormValues = z.infer<typeof evaluationFormSchema>;

// Type for applications with additional details
interface ApplicationWithDetails extends Application {
  program?: Program;
  applicant?: User;
}

// Type for evaluations with additional details
interface EvaluationWithDetails extends Evaluation {
  application?: Application;
  evaluator?: User;
}

export default function EvaluationsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithDetails | null>(null);
  const [openEvaluationDialog, setOpenEvaluationDialog] = useState(false);

  // Query to fetch applications
  const { data: applications, isLoading: applicationsLoading } = useQuery<ApplicationWithDetails[]>({
    queryKey: ["/api/applications"],
    select: (data) => {
      // Filter applications based on status
      return data.filter(application => 
        application.status === "submitted" || 
        application.status === "u obradi"
      );
    },
  });

  // Query to fetch programs
  const { data: programs } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
  });

  // Query to fetch users
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Query to fetch evaluations
  const { data: allEvaluations, isLoading: evaluationsLoading } = useQuery<Evaluation[]>({
    queryKey: ["/api/evaluations"],
    queryFn: async () => {
      // Fetch all evaluations for each application
      if (!applications) return [];
      
      let evaluations: Evaluation[] = [];
      for (const app of applications) {
        try {
          const response = await apiRequest("GET", `/api/applications/${app.id}/evaluations`);
          const appEvaluations = await response.json();
          evaluations = [...evaluations, ...appEvaluations];
        } catch (error) {
          console.error(`Error fetching evaluations for application ${app.id}:`, error);
        }
      }
      return evaluations;
    },
    enabled: !!applications,
  });

  // Form for creating evaluations
  const form = useForm<EvaluationFormValues>({
    resolver: zodResolver(evaluationFormSchema),
    defaultValues: {
      applicationId: 0,
      score: 50,
      decision: "revisit",
      comment: "",
    },
  });

  // Mutation for creating a new evaluation
  const createEvaluationMutation = useMutation({
    mutationFn: async (values: EvaluationFormValues) => {
      const res = await apiRequest(
        "POST", 
        `/api/applications/${values.applicationId}/evaluations`, 
        values
      );
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Evaluation submitted",
        description: "Your evaluation has been successfully recorded.",
      });
      
      // Reset form and close dialog
      form.reset();
      setOpenEvaluationDialog(false);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/evaluations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle evaluation form submission
  function onSubmit(values: EvaluationFormValues) {
    createEvaluationMutation.mutate(values);
  }

  // Open evaluation form for a specific application
  function startEvaluation(application: ApplicationWithDetails) {
    setSelectedApplication(application);
    form.setValue("applicationId", application.id);
    setOpenEvaluationDialog(true);
  }

  // Enhance applications with program and applicant data
  const enhancedApplications = applications?.map(application => {
    const program = programs?.find(p => p.id === application.programId);
    const applicant = users?.find(u => u.id === application.applicantId);
    
    return {
      ...application,
      program,
      applicant,
    };
  });

  // Enhance evaluations with application and evaluator data
  const enhancedEvaluations = allEvaluations?.map(evaluation => {
    const application = applications?.find(a => a.id === evaluation.applicationId);
    const evaluator = users?.find(u => u.id === evaluation.evaluatedBy);
    
    return {
      ...evaluation,
      application,
      evaluator,
    };
  });

  // Group evaluations by the evaluator (current user vs. others)
  const myEvaluations = enhancedEvaluations?.filter(
    evaluation => evaluation.evaluatedBy === user?.id
  );
  
  const otherEvaluations = enhancedEvaluations?.filter(
    evaluation => evaluation.evaluatedBy !== user?.id
  );

  // Helper function to get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-200 text-gray-800";
      case "submitted": return "bg-blue-100 text-blue-800";
      case "u obradi": return "bg-indigo-100 text-indigo-800";
      case "preporučeno": return "bg-green-100 text-green-800";
      case "odbijeno": return "bg-red-100 text-red-800";
      case "odobreno": return "bg-emerald-100 text-emerald-800";
      case "completed": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Helper function to format date
  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString('hr-HR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <MainLayout title="Evaluations">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Application Evaluations</h1>
        </div>

        <Tabs defaultValue="pending">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="my-evaluations">My Evaluations</TabsTrigger>
            <TabsTrigger value="team-evaluations">Team Evaluations</TabsTrigger>
          </TabsList>
          
          {/* Pending Applications Tab */}
          <TabsContent value="pending" className="space-y-4 pt-4">
            {applicationsLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : enhancedApplications && enhancedApplications.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {enhancedApplications.map((application) => (
                  <Card key={application.id} className="border border-border">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{application.autoCode}</CardTitle>
                          <CardDescription>{application.summary}</CardDescription>
                        </div>
                        <Badge className={getStatusColor(application.status)}>
                          {application.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2 space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="block text-muted-foreground">Applicant</span>
                          <span>{application.applicant?.fullName || "Unknown"}</span>
                        </div>
                        <div>
                          <span className="block text-muted-foreground">Program</span>
                          <span>{application.program?.name || "Unknown"}</span>
                        </div>
                        <div>
                          <span className="block text-muted-foreground">Requested</span>
                          <span>{application.requestedAmount?.toLocaleString() || "N/A"} €</span>
                        </div>
                        <div>
                          <span className="block text-muted-foreground">Submitted</span>
                          <span>
                            {application.submittedAt ? formatDate(application.submittedAt) : "Not submitted"}
                          </span>
                        </div>
                      </div>
                      
                      {application.description && (
                        <div>
                          <span className="block text-muted-foreground">Description</span>
                          <p className="line-clamp-2">{application.description}</p>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter>
                      <Button
                        onClick={() => startEvaluation(application)}
                        className="w-full"
                      >
                        Evaluate Application
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No applications pending evaluation.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* My Evaluations Tab */}
          <TabsContent value="my-evaluations" className="space-y-4 pt-4">
            {evaluationsLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : myEvaluations && myEvaluations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myEvaluations.map((evaluation) => (
                  <Card key={evaluation.id} className="border border-border">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            {evaluation.application?.autoCode || "Unknown Application"}
                          </CardTitle>
                          <CardDescription>
                            {evaluation.application?.summary || "No summary available"}
                          </CardDescription>
                        </div>
                        <Badge className={
                          evaluation.decision === "preporučeno" 
                            ? "bg-green-100 text-green-800" 
                            : evaluation.decision === "odbijeno"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                        }>
                          {evaluation.decision}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2 space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="block text-muted-foreground">Score</span>
                          <span>{evaluation.score || "N/A"}</span>
                        </div>
                        <div>
                          <span className="block text-muted-foreground">Date</span>
                          <span>{formatDate(evaluation.createdAt)}</span>
                        </div>
                      </div>
                      
                      <div>
                        <span className="block text-muted-foreground">Comment</span>
                        <p>{evaluation.comment}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">You haven't created any evaluations yet.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* Team Evaluations Tab */}
          <TabsContent value="team-evaluations" className="space-y-4 pt-4">
            {evaluationsLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : otherEvaluations && otherEvaluations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {otherEvaluations.map((evaluation) => (
                  <Card key={evaluation.id} className="border border-border">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            {evaluation.application?.autoCode || "Unknown Application"}
                          </CardTitle>
                          <CardDescription>
                            Evaluated by {evaluation.evaluator?.fullName || "Unknown"}
                          </CardDescription>
                        </div>
                        <Badge className={
                          evaluation.decision === "preporučeno" 
                            ? "bg-green-100 text-green-800" 
                            : evaluation.decision === "odbijeno"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                        }>
                          {evaluation.decision}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2 space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="block text-muted-foreground">Score</span>
                          <span>{evaluation.score || "N/A"}</span>
                        </div>
                        <div>
                          <span className="block text-muted-foreground">Date</span>
                          <span>{formatDate(evaluation.createdAt)}</span>
                        </div>
                      </div>
                      
                      <div>
                        <span className="block text-muted-foreground">Comment</span>
                        <p>{evaluation.comment}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No team evaluations available.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Evaluation Dialog */}
      <Dialog open={openEvaluationDialog} onOpenChange={setOpenEvaluationDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Evaluate Application</DialogTitle>
            <DialogDescription>
              {selectedApplication && (
                <span>
                  {selectedApplication.autoCode} - {selectedApplication.summary}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="score"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Score (1-100)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1} 
                        max={100} 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="decision"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Decision</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select decision" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="preporučeno">Recommended</SelectItem>
                        <SelectItem value="odbijeno">Rejected</SelectItem>
                        <SelectItem value="revisit">Needs Discussion</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comment</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Provide your evaluation comments..." 
                        rows={4}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button 
                  type="submit" 
                  disabled={createEvaluationMutation.isPending}
                >
                  {createEvaluationMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Submit Evaluation
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}