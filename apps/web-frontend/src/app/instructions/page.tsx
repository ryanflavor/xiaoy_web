'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useInstructionStore } from '@/stores/instruction-store'

export default function InstructionsPage() {
  const [input, setInput] = useState('')
  const { parseInstruction, parsedInstructions, isLoading, error } = useInstructionStore()

  const handleParse = async () => {
    if (input.trim()) {
      await parseInstruction(input)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Instruction Input</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Enter Trading Instruction</CardTitle>
            <CardDescription>
              Support for Vega, Delta, and Clear position instructions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <textarea
                className="w-full min-h-[100px] p-3 border rounded-md"
                placeholder="Example: 双卖 500 当月 万1 的v"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleParse}
              disabled={isLoading || !input.trim()}
              className="w-full"
            >
              {isLoading ? 'Parsing...' : 'Parse Instruction'}
            </Button>
            {error && (
              <div className="text-sm text-destructive">{error}</div>
            )}
          </CardContent>
        </Card>

        {parsedInstructions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Parsed Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Contract</th>
                      <th className="text-left p-2">Direction</th>
                      <th className="text-left p-2">Quantity</th>
                      <th className="text-left p-2">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedInstructions.map((inst, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-2">{inst.contractName}</td>
                        <td className="p-2">{inst.direction}</td>
                        <td className="p-2">{inst.quantity}</td>
                        <td className="p-2">{inst.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}