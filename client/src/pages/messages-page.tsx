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
import { useAuth } from "@/hooks/use-auth";
import { Message, User, Application } from "@shared/schema";
import { Send, Search } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Link } from 'wouter'; // Import Link component


export default function MessagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeConversation, setActiveConversation] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [selectedApplication, setSelectedApplication] = useState<string>("");
  const [selectedReceiver, setSelectedReceiver] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch messages
  const { data: messagesData, isLoading: messagesLoading } = useQuery<{received: Message[], sent: Message[]}>({
    queryKey: ["/api/messages"],
  });

  // Fetch users
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Fetch applications
  const { data: applications, isLoading: applicationsLoading } = useQuery<Application[]>({
    queryKey: ["/api/applications"],
  });

  // Fetch messages by application
  const { data: conversationMessages, isLoading: conversationLoading } = useQuery<Message[]>({
    queryKey: ["/api/applications", activeConversation, "messages"],
    enabled: !!activeConversation,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: { applicationId: number; receiverId: number; content: string }) => {
      return apiRequest("POST", `/api/applications/${message.applicationId}/messages`, message);
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      if (activeConversation) {
        queryClient.invalidateQueries({ queryKey: ["/api/applications", activeConversation, "messages"] });
      }
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mark message as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return apiRequest("PATCH", `/api/messages/${messageId}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
  });

  // Get user by ID
  const getUserById = (userId: number) => {
    return users?.find(u => u.id === userId);
  };

  // Get application by ID
  const getApplicationById = (appId: number | null) => {
    if (!appId || !applications) return null;
    return applications.find(a => a.id === appId);
  };

  // Get user initials
  const getUserInitials = (fullName: string) => {
    return fullName
      .split(" ")
      .map(name => name[0])
      .join("")
      .toUpperCase();
  };

  // Handle sending a message
  const handleSendMessage = () => {
    if (!newMessage.trim() || !activeConversation || !selectedReceiver) return;

    sendMessageMutation.mutate({
      applicationId: activeConversation,
      receiverId: parseInt(selectedReceiver),
      content: newMessage,
    });
  };

  // Get filtered messages
  const getFilteredMessages = (messages: Message[] | undefined) => {
    if (!messages) return [];

    return messages.filter(msg => {
      if (!searchQuery) return true;

      const query = searchQuery.toLowerCase();
      const sender = getUserById(msg.senderId);
      const app = getApplicationById(msg.applicationId);

      return (
        sender?.fullName.toLowerCase().includes(query) ||
        msg.content.toLowerCase().includes(query) ||
        app?.summary.toLowerCase().includes(query)
      );
    });
  };

  // Open conversation
  const openConversation = (applicationId: number) => {
    setActiveConversation(applicationId);

    // Mark unread messages as read
    if (messagesData?.received) {
      const unreadMessages = messagesData.received.filter(
        msg => msg.applicationId === applicationId && !msg.read
      );

      unreadMessages.forEach(msg => {
        markAsReadMutation.mutate(msg.id);
      });
    }

    // Set default receiver based on application
    const application = getApplicationById(applicationId);
    if (!application) return;

    // If current user is applicant, set receiver to a reviewer
    if (user?.role === 'applicant') {
      const reviewer = users?.find(u => u.role === 'reviewer');
      if (reviewer) {
        setSelectedReceiver(reviewer.id.toString());
      }
    } 
    // If current user is reviewer or admin, set receiver to applicant
    else if (['reviewer', 'administrator'].includes(user?.role || '')) {
      setSelectedReceiver(application.applicantId.toString());
    }
  };

  // New conversation
  const startNewConversation = () => {
    if (!selectedApplication) return;

    const applicationId = parseInt(selectedApplication);
    if (isNaN(applicationId)) return;

    setActiveConversation(applicationId);

    // Set default receiver based on application
    const application = getApplicationById(applicationId);
    if (application) {
      // If current user is applicant, set receiver to a reviewer
      if (user?.role === 'applicant') {
        const reviewer = users?.find(u => u.role === 'reviewer');
        if (reviewer) {
          setSelectedReceiver(reviewer.id.toString());
        }
      } 
      // If current user is reviewer or admin, set receiver to applicant
      else if (['reviewer', 'administrator'].includes(user?.role || '')) {
        setSelectedReceiver(application.applicantId.toString());
      }
    }
  };

  // Get potential applications for conversation
  const getAvailableApplications = () => {
    if (!applications) return [];

    if (user?.role === 'applicant') {
      return applications.filter(app => app.applicantId === user.id);
    } else {
      return applications;
    }
  };

  // Get potential receivers for messages
  const getPotentialReceivers = () => {
    if (!users || !activeConversation) return [];

    const application = getApplicationById(activeConversation);
    if (!application) return [];

    if (user?.role === 'applicant') {
      return users.filter(u => ['reviewer', 'administrator'].includes(u.role));
    } else {
      // For reviewers and admins, set the applicant as receiver
      return users.filter(u => u.id === application.applicantId);
    }
  };

  const isLoading = messagesLoading || usersLoading || applicationsLoading;

  return (
    <MainLayout title="Messages">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-9rem)]">
          {/* Messages List */}
          <Card className="lg:col-span-1 flex flex-col overflow-hidden">
            <CardHeader className="px-6 py-4 border-b border-neutral-200 flex-shrink-0">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold text-neutral-900">Messages</CardTitle>
                <Select
                  value={selectedApplication}
                  onValueChange={setSelectedApplication}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="New message" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableApplications().map(app => (
                      <SelectItem key={app.id} value={app.id.toString()}>
                        {app.summary}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={16} />
                <Input
                  placeholder="Search messages..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>

            <CardContent className="p-0 flex-1 overflow-y-auto">
              <Tabs defaultValue="inbox">
                <TabsList className="w-full rounded-none border-b grid grid-cols-2">
                  <TabsTrigger value="inbox">Inbox</TabsTrigger>
                  <TabsTrigger value="sent">Sent</TabsTrigger>
                </TabsList>

                <TabsContent value="inbox" className="m-0">
                  {isLoading ? (
                    <div className="flex justify-center items-center h-40">
                      <div className="loader"></div>
                    </div>
                  ) : getFilteredMessages(messagesData?.received).length === 0 ? (
                    <div className="py-8 text-center text-neutral-500">
                      <span className="material-icons text-3xl mb-2">inbox</span>
                      <p>No messages in your inbox</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-neutral-200">
                      {getFilteredMessages(messagesData?.received).map((message) => {
                        const sender = getUserById(message.senderId);
                        const application = getApplicationById(message.applicationId);

                        return (
                          <li 
                            key={message.id} 
                            className={`py-4 px-6 cursor-pointer hover:bg-neutral-50 ${
                              !message.read ? 'bg-blue-50' : ''
                            } ${
                              activeConversation === message.applicationId ? 'bg-neutral-100' : ''
                            }`}
                            onClick={() => openConversation(message.applicationId)}
                          >
                            <div className="flex space-x-3">
                              <div className="flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-neutral-200 flex items-center justify-center">
                                  <span className="text-sm font-medium text-neutral-700">
                                    {sender ? getUserInitials(sender.fullName) : '??'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-neutral-900 truncate">
                                    {sender?.fullName || 'Unknown User'}
                                  </p>
                                  <p className="text-xs text-neutral-500">
                                    {message.createdAt 
                                      ? formatDistanceToNow(new Date(message.createdAt), { addSuffix: true }) 
                                      : 'Unknown date'}
                                  </p>
                                </div>
                                <p className="text-xs text-neutral-500 mb-1">
                                  {application?.summary || 'Unknown Application'}
                                </p>
                                <p className={`text-sm line-clamp-1 ${
                                  !message.read ? 'font-medium text-neutral-900' : 'text-neutral-600'
                                }`}>
                                  {message.content}
                                </p>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </TabsContent>

                <TabsContent value="sent" className="m-0">
                  {isLoading ? (
                    <div className="flex justify-center items-center h-40">
                      <div className="loader"></div>
                    </div>
                  ) : getFilteredMessages(messagesData?.sent).length === 0 ? (
                    <div className="py-8 text-center text-neutral-500">
                      <span className="material-icons text-3xl mb-2">send</span>
                      <p>No sent messages</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-neutral-200">
                      {getFilteredMessages(messagesData?.sent).map((message) => {
                        const receiver = getUserById(message.receiverId);
                        const application = getApplicationById(message.applicationId);

                        return (
                          <li 
                            key={message.id} 
                            className={`py-4 px-6 cursor-pointer hover:bg-neutral-50 ${
                              activeConversation === message.applicationId ? 'bg-neutral-100' : ''
                            }`}
                            onClick={() => openConversation(message.applicationId)}
                          >
                            <div className="flex space-x-3">
                              <div className="flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                                  <span className="text-sm font-medium text-white">
                                    {user ? getUserInitials(user.fullName) : '??'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-neutral-900 truncate">
                                    To: {receiver?.fullName || 'Unknown User'}
                                  </p>
                                  <p className="text-xs text-neutral-500">
                                    {message.createdAt 
                                      ? formatDistanceToNow(new Date(message.createdAt), { addSuffix: true }) 
                                      : 'Unknown date'}
                                  </p>
                                </div>
                                <p className="text-xs text-neutral-500 mb-1">
                                  {application?.summary || 'Unknown Application'}
                                </p>
                                <p className="text-sm text-neutral-600 line-clamp-1">
                                  {message.content}
                                </p>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>

            {selectedApplication && (
              <div className="p-4 border-t border-neutral-200 mt-auto">
                <Button 
                  onClick={startNewConversation} 
                  className="w-full"
                >
                  Start New Conversation
                </Button>
              </div>
            )}
          </Card>

          {/* Chat Window */}
          <Card className="lg:col-span-2 flex flex-col overflow-hidden">
            {activeConversation ? (
              <>
                <CardHeader className="px-6 py-4 border-b border-neutral-200 flex-shrink-0">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-lg font-semibold text-neutral-900">
                        {getApplicationById(activeConversation)?.summary || 'New Conversation'}
                      </CardTitle>
                      <p className="text-sm text-neutral-500">
                        {getApplicationById(activeConversation)?.autoCode ? 
                          `Application ID: ${getApplicationById(activeConversation)?.autoCode}` : 
                          'Select an application'}
                      </p>
                    </div>
                    <Select
                      value={selectedReceiver}
                      onValueChange={setSelectedReceiver}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select recipient" />
                      </SelectTrigger>
                      <SelectContent>
                        {getPotentialReceivers().map(receiver => (
                          <SelectItem key={receiver.id} value={receiver.id.toString()}>
                            {receiver.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-6">
                  {conversationLoading ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="loader"></div>
                    </div>
                  ) : !conversationMessages || conversationMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-neutral-500">
                      <span className="material-icons text-5xl mb-4">chat</span>
                      <p className="text-lg">No messages yet</p>
                      <p className="text-sm">Start the conversation by sending a message below</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {conversationMessages.map((message) => {
                        const isOwn = message.senderId === user?.id;
                        const sender = getUserById(message.senderId);

                        return (
                          <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex max-w-[80%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                              <div className="flex-shrink-0 mt-1">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                  isOwn ? 'bg-primary text-white' : 'bg-neutral-200 text-neutral-700'
                                }`}>
                                  <span className="text-xs font-medium">
                                    {sender ? getUserInitials(sender.fullName) : '??'}
                                  </span>
                                </div>
                              </div>
                              <div 
                                className={`mx-2 px-4 py-2 rounded-lg ${
                                  isOwn 
                                    ? 'bg-primary text-white rounded-tr-none' 
                                    : 'bg-neutral-100 text-neutral-900 rounded-tl-none'
                                }`}
                              >
                                <div className="text-xs mb-1">
                                  {sender?.fullName || 'Unknown User'} • {
                                    message.createdAt 
                                      ? formatDistanceToNow(new Date(message.createdAt), { addSuffix: true }) 
                                      : 'Unknown date'
                                  }
                                </div>
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>

                <div className="p-4 border-t border-neutral-200">
                  <div className="flex space-x-2">
                    <Textarea
                      placeholder="Type your message here..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || !selectedReceiver || sendMessageMutation.isPending}
                    >
                      {sendMessageMutation.isPending ? (
                        <span className="material-icons animate-spin">autorenew</span>
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-neutral-500 p-6">
                <span className="material-icons text-6xl mb-4">chat</span>
                <p className="text-xl font-medium mb-2">No conversation selected</p>
                <p className="text-center max-w-md">
                  Select a message from the list or start a new conversation to begin messaging
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}