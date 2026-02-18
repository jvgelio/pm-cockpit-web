import { Card, CardBody } from './Card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
    return (
        <Card className={cn("w-full", className)}>
            <CardBody className="text-center py-12 text-muted-foreground">
                <div className="bg-muted/50 p-4 rounded-full inline-block mb-4">
                    <Icon className="h-8 w-8 text-muted-foreground/80" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                <p className="mt-1 text-sm">{description}</p>
                {action && (
                    <Button onClick={action.onClick} className="mt-6">
                        {action.label}
                    </Button>
                )}
            </CardBody>
        </Card>
    );
}
