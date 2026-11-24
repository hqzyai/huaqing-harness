/** Test-only cloud HTTP fixture. Local control-plane and worker traffic remains real. */
import { appendFileSync, writeFileSync } from 'node:fs'

/** Report the OS-assigned listener to the owning acceptance fixture. */
export const inject = ['webServer']
/** Publish readiness after the real profile binds its ephemeral port. */
export function apply(ctx) {
  writeFileSync(process.env.TEAM_TEST_READY, ctx.webServer.getOrigin(), { mode: 0o600 })
}

const transport = globalThis.fetch
globalThis.fetch = async (input, options) => {
  const url = new URL(input instanceof Request ? input.url : String(input))
  if (url.origin !== 'https://api.deepseek.com') return transport(input, options)
  if (url.pathname !== '/v1/chat/completions' || options?.method !== 'POST') throw new Error('Unexpected cloud fixture request')
  const headers = new Headers(options.headers)
  if (headers.get('authorization') !== 'Bearer fixture-provider-key') throw new Error('The inference gateway did not supply its stored key')
  const body = JSON.parse(options.body)
  appendFileSync(process.env.TEAM_TEST_REQUESTS, JSON.stringify({ model: body.model, maxTokens: body.max_tokens, keyResolved: true }) + '\n')
  const chunks = [
    { id: 'fixture', object: 'chat.completion.chunk', model: body.model, choices: [{ index: 0, delta: { role: 'assistant', content: `Reply from ${body.model}` }, finish_reason: null }] },
    { id: 'fixture', object: 'chat.completion.chunk', model: body.model, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } },
  ]
  return new Response(chunks.map(chunk => `data: ${JSON.stringify(chunk)}\n\n`).join('') + 'data: [DONE]\n\n', {
    headers: { 'content-type': 'text/event-stream' },
  })
}
