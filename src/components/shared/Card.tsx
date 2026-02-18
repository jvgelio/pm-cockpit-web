import type { ReactNode } from 'react'
import {
  Card as ShCard,
  CardContent,
  CardHeader as ShCardHeader,
  CardFooter as ShCardFooter
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  hover?: boolean
}

/**
 * Shared Card component that wraps shadcn/ui Card.
 * Maintains compatibility with existing design tokens.
 */
export function Card({ children, className = '', onClick, hover = false }: CardProps) {
  return (
    <ShCard
      onClick={onClick}
      className={cn(
        "bg-card text-card-foreground border-border/8 shadow-linear-sm transition-all duration-150 overflow-hidden",
        hover && "hover:shadow-linear-md hover:border-border/12 cursor-pointer",
        className
      )}
    >
      {children}
    </ShCard>
  )
}

interface CardHeaderProps {
  children: ReactNode
  className?: string
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <ShCardHeader className={cn("px-4 py-3 border-b border-border/8", className)}>
      {children}
    </ShCardHeader>
  )
}

interface CardBodyProps {
  children: ReactNode
  className?: string
}

export function CardBody({ children, className = '' }: CardBodyProps) {
  return (
    <CardContent className={cn("p-4", className)}>
      {children}
    </CardContent>
  )
}

interface CardFooterProps {
  children: ReactNode
  className?: string
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <ShCardFooter className={cn(
      "px-4 py-3 border-t border-border/8 bg-muted/30",
      className
    )}>
      {children}
    </ShCardFooter>
  )
}

export default Card
