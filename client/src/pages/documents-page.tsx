import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Document, Application, User } from "@shared/schema";
import { Search, FileText, FilePlus, FileUp, Download, Eye, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

export default function DocumentsPage() {
  const { toast } = useToast();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState("all");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);

  // Fetch documents
  const { data: documents, isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  // Fetch applications
  const { data: applications, isLoading: applicationsLoading } = useQuery<Application[]>({
    queryKey: ["/api/applications"],
  });

  // Fetch users
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const isLoading = documentsLoading || applicationsLoading || usersLoading;

  // Get application by ID with safer fallbacks
  const getApplicationById = (id: number | undefined) => {
    if (!id || !applications) return null;
    
    try {
      const app = applications.find(app => app && app.id === id);
      
      if (!app) return null;
      
      // Create a sanitized application object with fallbacks for all properties
      return {
        ...app,
        id: app.id,
        applicantId: app.applicantId,
        programId: app.programId,
        status: app.status || 'unknown',
        summary: app.summary || `Application ${app.autoCode || app.id}`,
        autoCode: app.autoCode || `APP-${app.id}`,
      };
    } catch (error) {
      console.error("Error getting application by ID:", error);
      return null;
    }
  };

  // Get user by ID with safer fallbacks
  const getUserById = (id: number | undefined) => {
    if (!id || !users) return null;
    
    try {
      const user = users.find(user => user && user.id === id);
      
      if (!user) return null;
      
      // Create a sanitized user object with fallbacks for missing properties
      return {
        ...user,
        id: user.id,
        username: user.username || `user-${user.id}`,
        fullName: user.fullName || user.username || `User ${user.id}`,
        email: user.email || '',
        role: user.role || 'user',
      };
    } catch (error) {
      console.error("Error getting user by ID:", error);
      return null;
    }
  };

  // Handle file upload
  const handleFileUpload = async () => {
    if (!selectedFile || !selectedApplication) {
      toast({
        title: "Missing information",
        description: "Please select both an application and a file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // In a real app, we would use FormData to upload the file
      // Since we're using in-memory storage, we'll simulate the file upload
      const documentData = {
        applicationId: parseInt(selectedApplication),
        fileName: fileName || selectedFile.name,
        fileType: selectedFile.name.split('.').pop() || "",
        filePath: `/uploads/${fileName || selectedFile.name}`,
      };

      await apiRequest("POST", `/api/applications/${selectedApplication}/documents`, documentData);

      toast({
        title: "File uploaded",
        description: "Document has been uploaded successfully",
        variant: "default",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications", parseInt(selectedApplication), "documents"] });

      setShowUploadDialog(false);
      setSelectedFile(null);
      setFileName("");
    } catch (error) {
      toast({
        title: "Upload failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // Get file icon based on type
  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return <FileText className="text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="text-blue-500" />;
      case 'xls':
      case 'xlsx':
        return <FileText className="text-green-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
        return <FileText className="text-purple-500" />;
      default:
        return <FileText className="text-gray-500" />;
    }
  };

  // Filter documents
  const filteredDocuments = documents?.filter(doc => {
    // Filter by file type
    if (fileTypeFilter !== "all" && doc.fileType !== fileTypeFilter) {
      return false;
    }
    
    // Search by file name or application summary
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const application = getApplicationById(doc.applicationId);
      
      return (
        doc.fileName.toLowerCase().includes(query) ||
        (application && application.summary.toLowerCase().includes(query))
      );
    }
    
    return true;
  });

  return (
    <MainLayout title="Documents">
      <div className="container mx-auto">
        {/* Action Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
          <div className="flex flex-col sm:flex-row w-full md:w-auto space-y-4 sm:space-y-0 sm:space-x-4">
            {/* Search Documents */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={18} />
              <Input
                placeholder="Search documents..."
                className="pl-10 w-full sm:w-[250px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Filter by File Type */}
            <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="File Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="doc">DOC</SelectItem>
                <SelectItem value="docx">DOCX</SelectItem>
                <SelectItem value="xls">XLS</SelectItem>
                <SelectItem value="xlsx">XLSX</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button onClick={() => setShowUploadDialog(true)}>
            <FilePlus className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        </div>
        
        {/* Documents Table */}
        <Card>
          <CardHeader className="px-6 py-5 border-b border-neutral-200">
            <CardTitle className="text-lg font-semibold text-neutral-900">Documents</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">File Name</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Application</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Uploaded By</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-sm text-neutral-500">
                        <div className="flex justify-center">
                          <div className="loader"></div>
                        </div>
                        <p className="mt-2">Loading documents...</p>
                      </td>
                    </tr>
                  ) : !filteredDocuments || filteredDocuments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-sm text-neutral-500">
                        <div className="flex flex-col items-center">
                          <FileText className="h-16 w-16 text-neutral-300 mb-4" />
                          <p>No documents found</p>
                          <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => setShowUploadDialog(true)}
                          >
                            <FilePlus className="mr-2 h-4 w-4" />
                            Upload New Document
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredDocuments.map((doc) => {
                      const application = getApplicationById(doc.applicationId);
                      const uploader = getUserById(doc.uploadedBy);
                      
                      return (
                        <tr key={doc.id} className="hover:bg-neutral-50">
                          <td className="px-6 py-4 text-sm">
                            <div className="flex items-center">
                              {getFileIcon(doc.fileType)}
                              <span className="ml-2 font-medium text-neutral-900">{doc.fileName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                            {application ? (
                              <div>
                                <div>{application.summary}</div>
                                <div className="text-xs text-neutral-500">{application.autoCode}</div>
                              </div>
                            ) : (
                              'Unknown Application'
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 uppercase">
                            {doc.fileType}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                            {uploader?.fullName || 'Unknown User'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                            {doc.uploadedAt ? (
                              <div title={new Date(doc.uploadedAt).toLocaleString()}>
                                {formatDistanceToNow(new Date(doc.uploadedAt), { addSuffix: true })}
                              </div>
                            ) : (
                              'Unknown date'
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="sm" title="View document">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" title="Download document">
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" title="Delete document">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        
        {/* Upload Document Dialog */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Select Application */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Application</label>
                <Select
                  value={selectedApplication}
                  onValueChange={setSelectedApplication}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an application" />
                  </SelectTrigger>
                  <SelectContent>
                    {!applications || applications.length === 0 ? (
                      <SelectItem value="" disabled>No applications available</SelectItem>
                    ) : (
                      applications.map(app => app && (
                        <SelectItem key={app.id} value={String(app.id)}>
                          {(app.summary || `Application ${app.autoCode || app.id}`)}
                          {app.autoCode && ` (${app.autoCode})`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              {/* File Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Upload File</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-md border-neutral-300 cursor-pointer hover:bg-neutral-50">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {selectedFile ? (
                        <>
                          <FileText className="h-8 w-8 text-primary mb-2" />
                          <p className="text-sm text-neutral-900 font-medium">{selectedFile.name}</p>
                          <p className="text-xs text-neutral-500">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </p>
                        </>
                      ) : (
                        <>
                          <FileUp className="h-8 w-8 text-neutral-400 mb-2" />
                          <p className="text-sm text-neutral-500">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-neutral-400">
                            PDF, DOC, DOCX, XLS, XLSX (Max 10MB)
                          </p>
                        </>
                      )}
                    </div>
                    <input
                      id="dropzone-file"
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedFile(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
              
              {/* Document Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Document Name (Optional)</label>
                <Input
                  placeholder="Enter a name for this document"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                />
                <p className="text-xs text-neutral-500">
                  If left blank, the original file name will be used
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowUploadDialog(false)}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleFileUpload}
                disabled={!selectedFile || !selectedApplication || uploading}
              >
                {uploading ? (
                  <>
                    <div className="loader mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <FileUp className="mr-2 h-4 w-4" />
                    Upload
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
