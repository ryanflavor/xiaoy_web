'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AccountsPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Virtual Account Monitoring</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Account List</CardTitle>
            <CardDescription>
              Monitor real-time account status and positions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Account monitoring will be implemented in Story 1.2
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}