import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Upload, Check, X } from "lucide-react";

// Document upload type for state management
type DocumentUpload = {
  id: string;
  file: File | null;
  status: "pending" | "uploaded" | "verified" | "rejected";
  message?: string;
};

// Define the onboarding schema
const FormSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2, "City must be at least 2 characters"),
  country: z.string().min(2, "Country must be at least 2 characters"),
  phoneNumber: z.string().min(9, "Phone number must be at least 9 characters"),
  bio: z.string().min(10, "Bio must be at least 10 characters").max(500, "Bio must be at most 500 characters"),
  
  // Optional fields based on applicant type
  companyName: z.string().optional(),
  companyRegistrationNumber: z.string().optional(),
  companyAddress: z.string().optional(),
  website: z.string().url("Please enter a valid URL").optional(),
  representativePosition: z.string().optional(),
  organizationName: z.string().optional(),
  organizationType: z.string().optional(),
  organizationRegistrationNumber: z.string().optional(),
  organizationDescription: z.string().optional(),
  organizationEstablished: z.string().optional(),
  organizationPosition: z.string().optional(),
});

export default function OnboardingPage() {
  const { applicantTypeId } = useParams();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");
  const [documents, setDocuments] = useState<DocumentUpload[]>([]);
  const [applicantType, setApplicantType] = useState<any>(null);
  const [isComplete, setIsComplete] = useState(false);
  
  // Query to get applicant type details
  const { data: applicantTypeData, isLoading: isApplicantTypeLoading } = useQuery({
    queryKey: ["/api/applicant-types"],
    select: (data) => data.find((type: any) => type.id === Number(applicantTypeId)),
    enabled: !!applicantTypeId,
  });
  
  // Update applicant type state when data is loaded
  useEffect(() => {
    if (applicantTypeData) {
      setApplicantType(applicantTypeData);
      
      // Initialize document uploads based on required documents
      if (applicantTypeData.requiredDocuments) {
        const initialDocuments = applicantTypeData.requiredDocuments.map((doc: string) => ({
          id: doc,
          file: null,
          status: "pending"
        }));
        setDocuments(initialDocuments);
      }
    }
  }, [applicantTypeData]);
  
  // Form setup for profile info
  type FormValues = z.infer<typeof FormSchema>;
  
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      fullName: "",
      address: "",
      city: "",
      country: "",
      phoneNumber: "",
      bio: "",
      companyName: "",
      companyRegistrationNumber: "",
      companyAddress: "",
      website: "",
      representativePosition: "",
      organizationName: "",
      organizationType: "",
      organizationRegistrationNumber: "",
      organizationDescription: "",
      organizationEstablished: "",
      organizationPosition: "",
    },
  });

  // Mutation for saving profile
  const profileMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        applicantTypeId: Number(applicantTypeId),
      };
      
      const response = await apiRequest("POST", "/api/onboarding/profile", payload);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile saved successfully!",
        description: "You can now upload your documents",
      });
      
      // Switch to documents tab
      setActiveTab("documents");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to save profile",
        description: error.message || "Please try again",
      });
    },
  });

  // Mutation for document upload
  const uploadMutation = useMutation({
    mutationFn: async ({ docId, file }: { docId: string, file: File }) => {
      // In a real app, we would upload the file to a server
      // For this mockup, we'll just simulate a successful upload
      
      // Create form data for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentId', docId);
      formData.append('applicantTypeId', applicantTypeId || '');
      
      console.log(`Uploading document ${docId}`);
      
      // Simulate API call with delay
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true, message: "Document uploaded successfully" });
        }, 1500);
      });
    },
    onSuccess: (_, variables) => {
      const { docId } = variables;
      
      // Update document status
      setDocuments(prev => prev.map(doc => 
        doc.id === docId ? { ...doc, status: "verified" } : doc
      ));
      
      toast({
        title: "Document uploaded",
        description: "Your document has been uploaded and verified",
      });
      
      // Check if all documents are uploaded
      const allUploaded = documents.every(doc => doc.status === "verified");
      if (allUploaded) {
        setIsComplete(true);
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "Please try again",
      });
    },
  });
  
  // Mutation for completing onboarding
  const completeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/onboarding/complete", { 
        applicantTypeId: Number(applicantTypeId)
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Onboarding completed!",
        description: "Your account is now fully set up. You can start using the platform.",
      });
      
      // Redirect to dashboard
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to complete onboarding",
        description: error.message || "Please try again",
      });
    },
  });

  const onSubmitProfile = (values: FormValues) => {
    profileMutation.mutate(values);
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, docId: string) => {
    const file = event.target.files?.[0];
    if (file) {
      // Update document status and file
      setDocuments(prev => prev.map(doc => 
        doc.id === docId ? { ...doc, file, status: "uploaded" } : doc
      ));
      
      // Upload the file
      uploadMutation.mutate({ docId, file });
    }
  };
  
  const handleCompleteOnboarding = () => {
    completeMutation.mutate();
  };

  // Loading state
  if (isApplicantTypeLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state if applicant type not found
  if (!applicantType && !isApplicantTypeLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Onboarding Process</CardTitle>
            <CardDescription>
              We couldn't find the onboarding process you're looking for.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" onClick={() => setLocation("/auth")}>
              Return to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-10 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Complete Your Profile</CardTitle>
          <CardDescription>
            Welcome to the onboarding process for {applicantType?.name || "applicant"}. 
            Please complete your profile and upload required documents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="profile" className="flex-1">Profile Information</TabsTrigger>
              <TabsTrigger value="documents" className="flex-1" disabled={!form.formState.isSubmitSuccessful}>
                Document Upload
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile" className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitProfile)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your city" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your country" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {applicantType?.name === "CORPORATION" && (
                      <>
                        <FormField
                          control={form.control}
                          name="companyName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter company name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="companyRegistrationNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Registration Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter registration number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="companyAddress"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Address</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter company address" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="website"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Website</FormLabel>
                              <FormControl>
                                <Input placeholder="https://example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="representativePosition"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Your Position in the Company</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. CEO, CFO, Director" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                    
                    {applicantType?.name === "ORGANIZATION" && (
                      <>
                        <FormField
                          control={form.control}
                          name="organizationName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Organization Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter organization name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="organizationType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Organization Type</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. NGO, Foundation, Association" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="organizationRegistrationNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Organization Registration Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter registration number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="organizationEstablished"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Year Established</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. 2010" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="organizationPosition"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Your Position in the Organization</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Director, Coordinator, Manager" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="website"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Website</FormLabel>
                              <FormControl>
                                <Input placeholder="https://example.org" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Tell us about yourself or your organization..." 
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          This information will be visible on your profile.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={profileMutation.isPending}
                  >
                    {profileMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Profile & Continue"
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="documents" className="pt-6">
              {documents.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No documents are required for your applicant type.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-6">
                  <Alert>
                    <AlertDescription>
                      <span className="font-medium">For this demo:</span> All document uploads will be automatically verified.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-4">
                    {documents.map((doc) => (
                      <Card key={doc.id} className="overflow-hidden">
                        <div className="flex items-center p-4 border-b">
                          <div className="flex-1">
                            <h3 className="font-medium">{doc.id}</h3>
                            <p className="text-sm text-muted-foreground">
                              {doc.status === "pending" && "Please upload this document"}
                              {doc.status === "uploaded" && "Processing your document..."}
                              {doc.status === "verified" && "Document verified successfully"}
                              {doc.status === "rejected" && doc.message}
                            </p>
                          </div>
                          <div className="ml-4">
                            {doc.status === "pending" && (
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                                <Upload className="h-4 w-4" />
                              </div>
                            )}
                            {doc.status === "uploaded" && (
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
                                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                              </div>
                            )}
                            {doc.status === "verified" && (
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100">
                                <Check className="h-4 w-4 text-green-500" />
                              </div>
                            )}
                            {doc.status === "rejected" && (
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100">
                                <X className="h-4 w-4 text-red-500" />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="flex items-center">
                            <input
                              type="file"
                              id={`file-${doc.id}`}
                              className="hidden"
                              onChange={(e) => handleFileChange(e, doc.id)}
                              disabled={doc.status === "verified" || doc.status === "uploaded"}
                            />
                            <label
                              htmlFor={`file-${doc.id}`}
                              className={`flex items-center justify-center px-4 py-2 rounded text-sm font-medium cursor-pointer ${
                                doc.status === "verified"
                                  ? "bg-muted text-muted-foreground"
                                  : "bg-primary text-primary-foreground hover:bg-primary/90"
                              }`}
                            >
                              {doc.status === "verified" ? "Uploaded" : "Choose File"}
                            </label>
                            {doc.file && (
                              <span className="ml-3 text-sm text-muted-foreground">
                                {doc.file.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                  
                  <Button
                    onClick={handleCompleteOnboarding}
                    className="w-full"
                    disabled={!isComplete || completeMutation.isPending}
                  >
                    {completeMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Completing...
                      </>
                    ) : (
                      "Complete Onboarding"
                    )}
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setLocation("/auth")}>
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}