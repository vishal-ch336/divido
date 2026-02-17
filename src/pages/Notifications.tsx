import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Check, Users, Receipt, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { notificationsApi, ApiError } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Notification {
    _id: string;
    type: 'expense' | 'settlement' | 'group' | 'reminder';
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
}

const Notifications = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [markingAllRead, setMarkingAllRead] = useState(false);
    const { toast } = useToast();

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const response = await notificationsApi.getAll();
            setNotifications(response.notifications);
            setUnreadCount(response.unreadCount);
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof ApiError ? error.message : 'Failed to load notifications',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const handleMarkAllRead = async () => {
        if (unreadCount === 0) return;

        setMarkingAllRead(true);
        try {
            await notificationsApi.markAllAsRead();

            // Update local state
            setNotifications(notifications.map(n => ({ ...n, read: true })));
            setUnreadCount(0);

            toast({
                title: 'Success',
                description: 'All notifications marked as read',
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof ApiError ? error.message : 'Failed to mark all as read',
                variant: 'destructive',
            });
        } finally {
            setMarkingAllRead(false);
        }
    };

    const handleNotificationClick = async (id: string, read: boolean) => {
        if (read) return; // Already read

        try {
            await notificationsApi.markAsRead(id);

            // Update local state
            setNotifications(notifications.map(n =>
                n._id === id ? { ...n, read: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'expense':
                return Receipt;
            case 'settlement':
                return Check;
            case 'group':
                return Users;
            case 'reminder':
                return AlertCircle;
            default:
                return Bell;
        }
    };

    const getTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
        return `${Math.floor(seconds / 604800)} weeks ago`;
    };

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Notifications</h1>
                        <p className="text-muted-foreground mt-1">
                            {loading ? (
                                'Loading...'
                            ) : unreadCount > 0 ? (
                                `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                            ) : (
                                'All caught up!'
                            )}
                        </p>
                    </div>
                    {unreadCount > 0 && !loading && (
                        <Button
                            variant="outline"
                            onClick={handleMarkAllRead}
                            disabled={markingAllRead}
                        >
                            {markingAllRead ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Marking...
                                </>
                            ) : (
                                <>
                                    <Check className="mr-2 h-4 w-4" />
                                    Mark all as read
                                </>
                            )}
                        </Button>
                    )}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="h-5 w-5 text-primary" />
                            Recent Activity
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-8 text-center">
                                <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
                                <p className="text-muted-foreground">Loading notifications...</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p>No notifications yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border">
                                {notifications.map((notification) => {
                                    const Icon = getIcon(notification.type);
                                    return (
                                        <div
                                            key={notification._id}
                                            onClick={() => handleNotificationClick(notification._id, notification.read)}
                                            className={`p-4 transition-colors cursor-pointer hover:bg-accent ${!notification.read ? 'bg-primary/5' : ''
                                                }`}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div
                                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${notification.type === 'expense'
                                                            ? 'bg-primary/10 text-primary'
                                                            : notification.type === 'settlement'
                                                                ? 'bg-credit/10 text-credit'
                                                                : notification.type === 'group'
                                                                    ? 'bg-accent-blue/10 text-accent-blue'
                                                                    : 'bg-debit/10 text-debit'
                                                        }`}
                                                >
                                                    <Icon className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-sm font-medium text-foreground">
                                                            {notification.title}
                                                        </p>
                                                        {!notification.read && (
                                                            <Badge variant="default" className="ml-2">
                                                                New
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        {notification.message}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground/70">
                                                        {getTimeAgo(notification.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
};

export default Notifications;
