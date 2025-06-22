import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="container mx-auto py-10">
      <div className="flex flex-col items-center justify-center space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tighter">Options Trading System</h1>
          <p className="text-xl text-muted-foreground">
            Professional options trading platform with real-time monitoring
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 w-full max-w-5xl">
          <Card>
            <CardHeader>
              <CardTitle>Instruction Input</CardTitle>
              <CardDescription>Parse and execute trading instructions</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/instructions">
                <Button className="w-full">Open Instructions</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Monitoring</CardTitle>
              <CardDescription>Real-time account status and positions</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/accounts">
                <Button className="w-full" variant="secondary">View Accounts</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Algorithm Monitoring</CardTitle>
              <CardDescription>Track algorithm execution progress</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/algorithms">
                <Button className="w-full" variant="secondary">View Algorithms</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}