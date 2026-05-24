import { runResearchAgent } from '@/lib/agent'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: Request) {
  const { apiKey } = await req.json()
  if (!apiKey) return new Response('Missing apiKey', { status: 400 })

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }
      try {
        for await (const event of runResearchAgent(apiKey)) {
          send(event)
          if (event.type === 'done' || event.type === 'error') break
        }
      } catch (e: any) {
        send({ type: 'error', message: e.message })
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}
