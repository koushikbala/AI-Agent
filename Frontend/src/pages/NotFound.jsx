import { Link } from 'react-router-dom'
import { Ghost } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function NotFound() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="items-center">
          <Ghost className="size-10 text-muted-foreground" />
          <CardTitle className="text-2xl">404</CardTitle>
          <CardDescription>This page drifted off the order book.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/">Back to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
