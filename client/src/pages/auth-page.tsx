import { useEffect, useState } from "react";
import { useLocation } from "wouter";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { Check, Loader2, Building2, User, BuildingIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ApplicantType } from "@shared/schema";

const loginSchema = z.object({
  username: z.string().min(1, { message: "Username is required" }),
  password: z.string().min(1, { message: "Password is required" }),
});

const registerSchema = z.object({
  username: z.string().min(3, { message: "Username must be at least 3 characters" }),
  fullName: z.string().min(3, { message: "Full name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  role: z.enum(["applicant", "donor", "administrator", "reviewer"], {
    message: "Please select a valid role",
  }),
  applicantTypeId: z.number().optional(),
  representativeEmail: z.string().email({ message: "Invalid representative email address" }).optional(),
  website: z.string().url({ message: "Invalid website URL" }).optional(),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})
.refine(data => {
  // If role is applicant, applicantTypeId is required
  return data.role !== "applicant" || (data.role === "applicant" && data.applicantTypeId !== undefined);
}, {
  message: "Applicant type is required for applicants",
  path: ["applicantTypeId"],
})
.refine(data => {
  // If applicant type is ORGANIZATION (ID: 1), representative email is required
  return data.applicantTypeId !== 1 || (data.applicantTypeId === 1 && data.representativeEmail);
}, {
  message: "Representative email is required for organizations",
  path: ["representativeEmail"],
})
.refine(data => {
  // If applicant type is CORPORATION (ID: 3), website is required
  return data.applicantTypeId !== 3 || (data.applicantTypeId === 3 && data.website);
}, {
  message: "Corporate website is required for corporations",
  path: ["website"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  // Always using applicant role
  const selectedRole = "applicant";
  
  // Fetch applicant types for the dropdown
  const { data: applicantTypes, isLoading: isLoadingApplicantTypes } = useQuery<ApplicantType[]>({
    queryKey: ["/api/applicant-types"],
    enabled: true,
  });
  
  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      fullName: "",
      email: "",
      role: "applicant",
      representativeEmail: "",
      website: "",
      password: "",
      confirmPassword: "",
    },
  });

  // No need to update form when role changes - we always use "applicant"
  const applicantTypeId = registerForm.watch("applicantTypeId");

  function onLoginSubmit(values: LoginFormValues) {
    loginMutation.mutate(values);
  }

  function onRegisterSubmit(values: RegisterFormValues) {
    // Email validation will be handled on the server side when applicant type is passed
    // This allows the server to apply business rules for email domains
    registerMutation.mutate(values);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Side - Auth Form */}
        <Card className="w-full shadow-md">
          <CardHeader>
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                <span className="material-icons text-white text-sm">volunteer_activism</span>
              </div>
              <span className="font-poppins text-lg font-semibold text-neutral-800">Grant Portal</span>
            </div>
            <CardTitle className="text-2xl font-poppins">Welcome</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one to start managing applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center">
                        <input id="remember" type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-neutral-300 rounded" />
                        <label htmlFor="remember" className="ml-2 block text-sm text-neutral-700">
                          Remember me
                        </label>
                      </div>
                      
                      <a href="#" className="text-sm font-medium text-primary hover:text-primary-dark">
                        Forgot password?
                      </a>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing in...
                        </>
                      ) : "Sign in"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Full Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="email@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                          <div className="text-xs text-muted-foreground mt-1">
                            {applicantTypeId === 1 && (
                              <span>Organizations should use official domain names ending with .org, .ngo, .ba, .net, or .com</span>
                            )}
                            {applicantTypeId === 3 && (
                              <span>Corporations must use business email addresses (non-personal domains)</span>
                            )}
                            {applicantTypeId === 2 && (
                              <span>Individuals can use any valid email address</span>
                            )}
                          </div>
                        </FormItem>
                      )}
                    />
                    {/* Fixed role as applicant */}
                    <input type="hidden" {...registerForm.register("role")} value="applicant" />
                    
                    {/* Always show applicant type dropdown */}
                    <FormField
                      control={registerForm.control}
                      name="applicantTypeId"
                      render={({ field }) => (
                        <FormItem className="mb-6">
                          <FormLabel>
                            <div className="flex items-center space-x-2">
                              <span>Applicant Type</span>
                              <span className="text-destructive">*</span>
                            </div>
                          </FormLabel>
                          <select
                            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                            disabled={isLoadingApplicantTypes}
                            value={field.value?.toString() || ""}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          >
                            <option value="" disabled>
                              {isLoadingApplicantTypes ? "Loading applicant types..." : "Select applicant type"}
                            </option>
                            {applicantTypes?.map((type) => (
                              <option key={type.id} value={type.id}>
                                {type.name} - {type.description}
                              </option>
                            ))}
                          </select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Show representative email field for organizations */}
                    {applicantTypeId === 1 && (
                      <FormField
                        control={registerForm.control}
                        name="representativeEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <div className="flex items-center space-x-2">
                                <div className="flex items-center">
                                  <Building2 className="h-4 w-4 mr-1" />
                                  <span>Representative Email Address</span>
                                </div>
                                <span className="text-destructive">*</span>
                              </div>
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="representative@organization.org" 
                                {...field} 
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                            <div className="text-xs text-muted-foreground mt-1">
                              Please provide an email for the organization's representative or contact person
                            </div>
                          </FormItem>
                        )}
                      />
                    )}
                    
                    {/* Show website field for corporations */}
                    {applicantTypeId === 3 && (
                      <FormField
                        control={registerForm.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <div className="flex items-center space-x-2">
                                <div className="flex items-center">
                                  <BuildingIcon className="h-4 w-4 mr-1" />
                                  <span>Corporate Website</span>
                                </div>
                                <span className="text-destructive">*</span>
                              </div>
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="url" 
                                placeholder="https://www.corporation.com" 
                                {...field} 
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                            <div className="text-xs text-muted-foreground mt-1">
                              Please provide your official corporate website URL
                            </div>
                          </FormItem>
                        )}
                      />
                    )}
                    
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating account...
                        </>
                      ) : "Create account"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
            
            <div className="mt-4 text-center text-sm text-neutral-600">
              <p>By signing in, you agree to our <a href="#" className="font-medium text-primary hover:text-primary-dark">Terms of Service</a> and <a href="#" className="font-medium text-primary hover:text-primary-dark">Privacy Policy</a>.</p>
            </div>
          </CardContent>
        </Card>
        
        {/* Right Side - Hero */}
        <div className="hidden lg:flex flex-col justify-center p-8 bg-primary text-white rounded-lg shadow-md">
          <h1 className="text-3xl font-poppins font-bold mb-4">Grant Management Platform</h1>
          <p className="text-lg mb-6">Streamline your sponsorship and donation management with our comprehensive platform.</p>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-1">
                <Check className="h-5 w-5" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium">Dynamic Application Forms</h3>
                <p className="text-white/80">Custom forms based on program requirements</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-1">
                <Check className="h-5 w-5" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium">Streamlined Workflows</h3>
                <p className="text-white/80">Track applications from submission to approval</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-1">
                <Check className="h-5 w-5" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium">Budget Management</h3>
                <p className="text-white/80">Real-time tracking of program budgets and allocations</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
