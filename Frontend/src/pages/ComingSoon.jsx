import { Construction } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export function ComingSoon({ title }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="items-center">
          <Construction className="size-10 text-muted-foreground" />
          <CardTitle>{title}</CardTitle>
          <CardDescription>Coming soon</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This page is on the roadmap and will be implemented in an upcoming iteration.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
