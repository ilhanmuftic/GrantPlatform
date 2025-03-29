import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Program } from "@shared/schema";

const applicationFormSchema = z.object({
  programId: z.string().min(1, "Please select a program"),
  summary: z.string().min(5, "Summary must be at least 5 characters"),
  organization: z.string().min(3, "Organization name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  requestedAmount: z.string().min(1, "Amount is required"),
  projectDuration: z.string().min(1, "Duration is required"),
});

type ApplicationFormValues = z.infer<typeof applicationFormSchema>;

interface ApplicationFormProps {
  open: boolean;
  onClose: () => void;
}

export default function ApplicationForm({ open, onClose }: ApplicationFormProps) {
  const { toast } = useToast();
  const [savingAsDraft, setSavingAsDraft] = useState(false);

  // Fetch programs
  const { data: programs, isLoading: programsLoading } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
  });

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: {
      programId: "",
      summary: "",
      organization: "",
      description: "",
      requestedAmount: "",
      projectDuration: "",
    },
  });

  const createApplicationMutation = useMutation({
    mutationFn: async (values: ApplicationFormValues & { status: string }) => {
      const response = await apiRequest("POST", "/api/applications", {
        programId: parseInt(values.programId),
        summary: values.summary,
        organization: values.organization,
        description: values.description,
        requestedAmount: parseInt(values.requestedAmount),
        projectDuration: parseInt(values.projectDuration),
        status: values.status
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      toast({
        title: savingAsDraft ? "Application saved as draft" : "Application submitted",
        description: savingAsDraft 
          ? "You can continue editing it later." 
          : "Your application has been submitted successfully.",
        variant: "default",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${savingAsDraft ? 'save' : 'submit'} application: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  function onSubmit(values: ApplicationFormValues) {
    createApplicationMutation.mutate({
      ...values,
      status: savingAsDraft ? "draft" : "submitted"
    });
  }

  function handleSaveDraft() {
    setSavingAsDraft(true);
    form.handleSubmit(onSubmit)();
  }

  function handleSubmitApplication() {
    setSavingAsDraft(false);
    form.handleSubmit(onSubmit)();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-neutral-200">
          <DialogTitle className="text-xl font-poppins font-semibold text-neutral-900">New Application</DialogTitle>
        </DialogHeader>
      
        <div className="flex-1 overflow-y-auto p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Program Selection */}
              <FormField
                control={form.control}
                name="programId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Program Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={programsLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a program" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {programs?.map((program) => (
                          <SelectItem key={program.id} value={program.id.toString()}>
                            {program.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium text-neutral-900 mb-4">Basic Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="summary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Project name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="organization"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization</FormLabel>
                        <FormControl>
                          <Input placeholder="Organization name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              {/* Project Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your project"
                        className="resize-none"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Budget Information */}
              <div>
                <h3 className="text-lg font-medium text-neutral-900 mb-4">Budget Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="requestedAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Requested Amount</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-neutral-500">$</span>
                            </div>
                            <Input
                              type="number"
                              className="pl-8"
                              placeholder="0"
                              min="0"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="projectDuration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Duration (months)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            min="1"
                            max="60"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              {/* Document Upload */}
              <div>
                <h3 className="text-lg font-medium text-neutral-900 mb-4">Required Documents</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Budget Document</label>
                    <div className="flex items-center">
                      <label className="w-full flex items-center justify-center px-4 py-2 border border-neutral-300 rounded-md shadow-sm text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50 cursor-pointer">
                        <span className="material-icons mr-2 text-neutral-500">upload_file</span>
                        Upload File
                        <input type="file" className="sr-only" accept=".pdf,.doc,.docx,.xls,.xlsx" />
                      </label>
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">PDF, DOC, DOCX, XLS, XLSX (Max 5MB)</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Project Proposal</label>
                    <div className="flex items-center">
                      <label className="w-full flex items-center justify-center px-4 py-2 border border-neutral-300 rounded-md shadow-sm text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50 cursor-pointer">
                        <span className="material-icons mr-2 text-neutral-500">upload_file</span>
                        Upload File
                        <input type="file" className="sr-only" accept=".pdf,.doc,.docx" />
                      </label>
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">PDF, DOC, DOCX (Max 10MB)</p>
                  </div>
                </div>
              </div>
            </form>
          </Form>
        </div>
        
        <DialogFooter className="px-6 py-4 border-t border-neutral-200 bg-neutral-50">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={createApplicationMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={createApplicationMutation.isPending}
            className="ml-2"
          >
            {createApplicationMutation.isPending && savingAsDraft ? (
              <span className="material-icons animate-spin mr-2">autorenew</span>
            ) : null}
            Save Draft
          </Button>
          <Button
            onClick={handleSubmitApplication}
            disabled={createApplicationMutation.isPending}
            className="ml-2 bg-accent hover:bg-accent-dark"
          >
            {createApplicationMutation.isPending && !savingAsDraft ? (
              <span className="material-icons animate-spin mr-2">autorenew</span>
            ) : null}
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
