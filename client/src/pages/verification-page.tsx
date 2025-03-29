import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

// Define the verification schema
const verificationSchema = z.object({
  verificationCode: z.string().min(6, "Verification code must be at least 6 characters"),
});

type VerificationFormValues = z.infer<typeof verificationSchema>;

export default function VerificationPage() {
  const { encodedEmail, applicantTypeId } = useParams();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState<string>("");
  
  // Decode the email
  useEffect(() => {
    if (encodedEmail) {
      try {
        const decodedEmail = atob(encodedEmail);
        setEmail(decodedEmail);
      } catch (error) {
        console.error("Failed to decode email", error);
        toast({
          variant: "destructive",
          title: "Invalid verification link",
          description: "Please check your email link or contact support",
        });
      }
    }
  }, [encodedEmail, toast]);
  
  // Form setup for verification code
  const form = useForm<VerificationFormValues>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      verificationCode: "",
    },
  });

  // Mutation for verifying the code
  const verifyMutation = useMutation({
    mutationFn: async (values: VerificationFormValues) => {
      // Combine the verification code with the email and applicant type
      const payload = {
        ...values,
        email,
        applicantTypeId: Number(applicantTypeId),
      };
      
      const response = await apiRequest("POST", "/api/mock-verification", payload);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Verification successful!",
        description: "You can now complete your profile",
      });
      
      // Redirect to onboarding
      setLocation(`/onboarding/${applicantTypeId}`);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: error.message || "Please try again or contact support",
      });
    },
  });

  function onSubmit(values: VerificationFormValues) {
    verifyMutation.mutate(values);
  }

  // Display a message if no email is found
  if (!email) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Verification Link</CardTitle>
            <CardDescription>
              The verification link appears to be invalid. Please check your email and try again.
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
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Verify Your Email</CardTitle>
          <CardDescription>
            We've sent a verification code to {email}. Please enter it below to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4 bg-muted">
            <AlertDescription>
              <span className="font-medium">For this demo:</span> The verification code is <span className="font-bold">123456</span>
            </AlertDescription>
          </Alert>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="verificationCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your 6-digit code"
                        {...field}
                        autoComplete="one-time-code"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button
                type="submit"
                className="w-full"
                disabled={verifyMutation.isPending}
              >
                {verifyMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Email"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-muted-foreground">
            Didn't receive a code? Check your spam folder or request a new code.
          </div>
          <Button variant="outline" className="w-full" onClick={() => setLocation("/auth")}>
            Return to Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}