import { Message } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { formatDistanceToNow } from 'date-fns';

interface Message {
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

interface MessageListProps {
  messages: Message[];
}

export default function MessageList({ messages }: MessageListProps) {
  return (
    <Card>
      <CardHeader className="px-6 py-5 border-b border-neutral-200 flex justify-between items-center">
        <CardTitle className="text-lg font-semibold text-neutral-900">Recent Messages</CardTitle>
        <Link href="/messages" className="text-sm text-primary hover:text-primary-dark font-medium">
          View all
        </Link>
      </CardHeader>
      <CardContent className="p-6">
        <ul className="divide-y divide-neutral-200">
          {messages.map((message) => (
            <li key={message.id} className="py-4 cursor-pointer hover:bg-neutral-50 -mx-6 px-6 first:pt-0 last:pb-0">
              <Link href={`/messages/${message.id}`} className="flex space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-neutral-200 flex items-center justify-center">
                    <span className="text-sm font-medium text-neutral-700">
                      {message.sender.initials}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-neutral-900 truncate">
                      {message.sender.fullName}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {formatDistanceToNow(message.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                  <p className={`text-sm line-clamp-2 ${message.isRead ? 'text-neutral-600' : 'text-neutral-900 font-medium'}`}>
                    {message.content}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}