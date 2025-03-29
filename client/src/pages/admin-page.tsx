import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User, Program } from "@shared/schema";
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
import { Switch } from "@/components/ui/switch";
import { 
  UserPlus, 
  Plus, 
  Search, 
  Settings, 
  Edit, 
  Trash2, 
  Users, 
  FileText,
  AlertTriangle,
  CheckCircle,
  LogOut,
  UserCog,
  UserCheck
} from "lucide-react";

const programSchema = z.object({
  name: z.string().min(3, "Program name must be at least 3 characters"),
  type: z.enum(["sponzorstvo", "donacija"], {
    message: "Please select a valid type",
  }),
  budgetTotal: z.string().min(1, "Budget is required"),
  year: z.string().min(4, "Year must be 4 digits"),
  description: z.string().optional(),
  active: z.boolean().default(true),
});

type ProgramFormValues = z.infer<typeof programSchema>;

export default function AdminPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("users");
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showProgramDialog, setShowProgramDialog] = useState(false);
  const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);
  const [showDeleteProgramDialog, setShowDeleteProgramDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [programSearchQuery, setProgramSearchQuery] = useState("");

  // Fetch users
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Fetch programs
  const { data: programs, isLoading: programsLoading } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
  });

  // Program form
  const programForm = useForm<ProgramFormValues>({
    resolver: zodResolver(programSchema),
    defaultValues: {
      name: "",
      type: "sponzorstvo",
      budgetTotal: "",
      year: new Date().getFullYear().toString(),
      description: "",
      active: true,
    },
  });

  // Create program mutation
  const createProgramMutation = useMutation({
    mutationFn: async (values: ProgramFormValues) => {
      return apiRequest("POST", "/api/programs", {
        ...values,
        budgetTotal: parseInt(values.budgetTotal),
        year: parseInt(values.year),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      toast({
        title: "Program created",
        description: "The program has been created successfully",
        variant: "default",
      });
      setShowProgramDialog(false);
      programForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error creating program",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update program mutation
  const updateProgramMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: ProgramFormValues }) => {
      return apiRequest("PATCH", `/api/programs/${id}`, {
        ...values,
        budgetTotal: parseInt(values.budgetTotal),
        year: parseInt(values.year),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      toast({
        title: "Program updated",
        description: "The program has been updated successfully",
        variant: "default",
      });
      setShowProgramDialog(false);
      setSelectedProgramId(null);
      programForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error updating program",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete program mutation
  const deleteProgramMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/programs/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      toast({
        title: "Program deleted",
        description: "The program has been deleted successfully",
        variant: "default",
      });
      setShowDeleteProgramDialog(false);
      setSelectedProgramId(null);
    },
    onError: (error) => {
      toast({
        title: "Error deleting program",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize program form with selected program data
  const editProgram = (program: Program) => {
    setSelectedProgramId(program.id);
    programForm.reset({
      name: program.name,
      type: program.type as "sponzorstvo" | "donacija",
      budgetTotal: program.budgetTotal.toString(),
      year: program.year.toString(),
      description: program.description || "",
      active: program.active,
    });
    setShowProgramDialog(true);
  };

  // Handle program form submission
  const onProgramSubmit = (values: ProgramFormValues) => {
    if (selectedProgramId) {
      updateProgramMutation.mutate({ id: selectedProgramId, values });
    } else {
      createProgramMutation.mutate(values);
    }
  };

  // Filter users by search query
  const filteredUsers = users?.filter(user => {
    if (!userSearchQuery) return true;
    
    const query = userSearchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(query) ||
      user.fullName.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    );
  });

  // Filter programs by search query
  const filteredPrograms = programs?.filter(program => {
    if (!programSearchQuery) return true;
    
    const query = programSearchQuery.toLowerCase();
    return (
      program.name.toLowerCase().includes(query) ||
      program.type.toLowerCase().includes(query) ||
      program.description?.toLowerCase().includes(query) ||
      program.year.toString().includes(query)
    );
  });

  return (
    <MainLayout title="Admin">
      <div className="container mx-auto">
        {/* Admin Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="programs">
              <FileText className="h-4 w-4 mr-2" />
              Program Management
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              System Settings
            </TabsTrigger>
          </TabsList>
          
          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader className="px-6 py-5 border-b border-neutral-200 flex justify-between items-center">
                <CardTitle className="text-lg font-semibold text-neutral-900">User Management</CardTitle>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={16} />
                    <Input
                      placeholder="Search users..."
                      className="pl-9 w-64"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button onClick={() => setShowUserDialog(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-200">
                        <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Username</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {usersLoading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-10 text-center text-sm text-neutral-500">
                            <div className="flex justify-center">
                              <div className="loader"></div>
                            </div>
                            <p className="mt-2">Loading users...</p>
                          </td>
                        </tr>
                      ) : !filteredUsers || filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-10 text-center text-sm text-neutral-500">
                            No users found
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-neutral-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white">
                                  <span className="text-xs font-medium">
                                    {user.fullName
                                      .split(" ")
                                      .map(name => name[0])
                                      .join("")
                                      .toUpperCase()}
                                  </span>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-neutral-900">{user.fullName}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{user.username}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">{user.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                user.role === 'administrator' ? 'bg-red-100 text-red-800' :
                                user.role === 'reviewer' ? 'bg-blue-100 text-blue-800' :
                                user.role === 'donor' ? 'bg-green-100 text-green-800' :
                                'bg-amber-100 text-amber-800'
                              }`}>
                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex space-x-2">
                                <Button variant="ghost" size="sm" title="Edit user">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Delete user"
                                  onClick={() => {
                                    setSelectedUserId(user.id);
                                    setShowDeleteUserDialog(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Programs Tab */}
          <TabsContent value="programs">
            <Card>
              <CardHeader className="px-6 py-5 border-b border-neutral-200 flex justify-between items-center">
                <CardTitle className="text-lg font-semibold text-neutral-900">Program Management</CardTitle>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={16} />
                    <Input
                      placeholder="Search programs..."
                      className="pl-9 w-64"
                      value={programSearchQuery}
                      onChange={(e) => setProgramSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button onClick={() => {
                    setSelectedProgramId(null);
                    programForm.reset({
                      name: "",
                      type: "sponzorstvo",
                      budgetTotal: "",
                      year: new Date().getFullYear().toString(),
                      description: "",
                      active: true,
                    });
                    setShowProgramDialog(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Program
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-200">
                        <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Budget</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Year</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {programsLoading ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-10 text-center text-sm text-neutral-500">
                            <div className="flex justify-center">
                              <div className="loader"></div>
                            </div>
                            <p className="mt-2">Loading programs...</p>
                          </td>
                        </tr>
                      ) : !filteredPrograms || filteredPrograms.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-10 text-center text-sm text-neutral-500">
                            No programs found
                          </td>
                        </tr>
                      ) : (
                        filteredPrograms.map((program) => (
                          <tr key={program.id} className="hover:bg-neutral-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">{program.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 capitalize">{program.type}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">${program.budgetTotal.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">{program.year}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                program.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {program.active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Edit program"
                                  onClick={() => editProgram(program)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Delete program"
                                  onClick={() => {
                                    setSelectedProgramId(program.id);
                                    setShowDeleteProgramDialog(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="px-6 py-5 border-b border-neutral-200">
                  <CardTitle className="text-lg font-semibold text-neutral-900">System Settings</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-neutral-900">Enable Email Notifications</h4>
                        <p className="text-xs text-neutral-500">Send email notifications for application updates</p>
                      </div>
                      <Switch checked={true} />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-neutral-900">Enable Application Submissions</h4>
                        <p className="text-xs text-neutral-500">Allow users to submit new applications</p>
                      </div>
                      <Switch checked={true} />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-neutral-900">Debug Mode</h4>
                        <p className="text-xs text-neutral-500">Enable detailed error logging</p>
                      </div>
                      <Switch checked={false} />
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-neutral-900">Default Pagination Limit</h4>
                      <Select defaultValue="25">
                        <SelectTrigger>
                          <SelectValue placeholder="Select pagination limit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-neutral-900">Session Timeout (minutes)</h4>
                      <Input type="number" defaultValue="60" />
                    </div>
                    
                    <Button>Save Settings</Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="px-6 py-5 border-b border-neutral-200">
                  <CardTitle className="text-lg font-semibold text-neutral-900">System Information</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-neutral-500">Application Version</h4>
                      <p className="text-sm text-neutral-900">1.0.0</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-neutral-500">Server Environment</h4>
                      <p className="text-sm text-neutral-900">Production</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-neutral-500">Last Database Backup</h4>
                      <p className="text-sm text-neutral-900">June 15, 2025 03:00 AM</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-neutral-500">Total Users</h4>
                      <p className="text-sm text-neutral-900">{users?.length || 0}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-neutral-500">Active Programs</h4>
                      <p className="text-sm text-neutral-900">
                        {programs?.filter(p => p.active).length || 0} / {programs?.length || 0}
                      </p>
                    </div>
                    
                    <div className="pt-4">
                      <h4 className="text-sm font-medium text-neutral-900 mb-2">System Status</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                            <span className="text-sm">Database</span>
                          </div>
                          <span className="text-sm text-green-500">Online</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                            <span className="text-sm">API Services</span>
                          </div>
                          <span className="text-sm text-green-500">Online</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                            <span className="text-sm">Email Service</span>
                          </div>
                          <span className="text-sm text-green-500">Online</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <Button variant="outline" className="w-full">
                        Run System Diagnostics
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Add/Edit Program Dialog */}
        <Dialog open={showProgramDialog} onOpenChange={setShowProgramDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedProgramId ? "Edit Program" : "Add New Program"}
              </DialogTitle>
            </DialogHeader>
            <Form {...programForm}>
              <form onSubmit={programForm.handleSubmit(onProgramSubmit)} className="space-y-4">
                <FormField
                  control={programForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Program Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Program name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={programForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="sponzorstvo">Sponzorstvo</SelectItem>
                            <SelectItem value="donacija">Donacija</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={programForm.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="YYYY" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={programForm.control}
                  name="budgetTotal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget Total</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-neutral-500">$</span>
                          </div>
                          <Input
                            type="number"
                            className="pl-8"
                            placeholder="0"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={programForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Program description"
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={programForm.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between space-y-0">
                      <FormLabel>Active</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowProgramDialog(false)}
                    disabled={createProgramMutation.isPending || updateProgramMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createProgramMutation.isPending || updateProgramMutation.isPending}
                  >
                    {createProgramMutation.isPending || updateProgramMutation.isPending ? (
                      <>
                        <div className="loader mr-2" />
                        {selectedProgramId ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      selectedProgramId ? "Update Program" : "Create Program"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Delete Program Confirmation Dialog */}
        <Dialog open={showDeleteProgramDialog} onOpenChange={setShowDeleteProgramDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                Confirm Delete
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-neutral-700">
                Are you sure you want to delete this program? This action cannot be undone.
              </p>
              <p className="text-sm text-neutral-500 mt-2">
                All associated applications and data will remain in the system.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteProgramDialog(false)}
                disabled={deleteProgramMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (selectedProgramId) {
                    deleteProgramMutation.mutate(selectedProgramId);
                  }
                }}
                disabled={deleteProgramMutation.isPending}
              >
                {deleteProgramMutation.isPending ? (
                  <>
                    <div className="loader mr-2" />
                    Deleting...
                  </>
                ) : (
                  "Delete Program"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
