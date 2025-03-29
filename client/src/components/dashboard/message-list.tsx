import { Message, Application } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { formatDistanceToNow } from 'date-fns';

interface MessageListProps {
  messages?: Message[];
}

export default function MessageList({ messages = [] }: MessageListProps) {
  if (!messages || messages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-neutral-500">No recent messages</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Messages</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="flex items-start space-x-4">
              <div className="flex-1 space-y-1">
                <Link href={`/messages/${message.applicationId}`}>
                  <div className="text-sm font-medium cursor-pointer">
                    {message.content}
                  </div>
                  <p className="text-xs text-neutral-500">
                    {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                  </p>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}