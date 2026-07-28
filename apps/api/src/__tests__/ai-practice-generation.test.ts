import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'

import { env } from '../config/env.js'
import { PracticeQuestionGenerator } from '../infrastructure/ai/practice-question-generator.js'

const originalFetch = globalThis.fetch
const originalConfiguration = {
  AI_PROVIDER: env.AI_PROVIDER,
  AI_MAX_RETRIES: env.AI_MAX_RETRIES,
  GEMINI_API_KEY: env.GEMINI_API_KEY,
  GEMINI_MODEL: env.GEMINI_MODEL,
  XAI_API_KEY: env.XAI_API_KEY,
  XAI_MODEL: env.XAI_MODEL,
}

const input = {
  subjectName: 'Mathematics',
  gradeLevel: 'Grade 8',
  topics: [{ id: '64b64c000000000000000001', name: 'Algebra', description: 'Linear equations' }],
  difficulty: 2,
  questionCount: 1,
  practiceMode: 'standard' as const,
}

const validQuestion = {
  topicId: input.topics[0]!.id,
  text: 'What value of x satisfies the equation 2x + 3 = 11?',
  options: ['2', '3', '4', '5'],
  correctAnswer: '4',
  explanation: 'Subtract 3 from both sides and divide the result by 2, giving x = 4.',
  difficulty: 2,
}

afterEach(() => {
  globalThis.fetch = originalFetch
  Object.assign(env, originalConfiguration)
})

describe('AI practice question generation', () => {
  it('requests and validates structured Gemini output', async () => {
    Object.assign(env, {
      AI_PROVIDER: 'gemini',
      AI_MAX_RETRIES: 0,
      GEMINI_API_KEY: 'AIza-test-key',
      GEMINI_MODEL: 'gemini-test',
    })

    let requestedUrl = ''
    let requestBody: Record<string, unknown> | undefined
    globalThis.fetch = (async (url, init) => {
      requestedUrl = String(url)
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: JSON.stringify({ questions: [validQuestion] }) }] } }],
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }) as typeof fetch

    const result = await new PracticeQuestionGenerator().generate(input)

    assert.equal(result.provider, 'gemini')
    assert.equal(result.model, 'gemini-test')
    assert.equal(result.questions[0]?.correctAnswer, '4')
    assert.match(requestedUrl, /gemini-test:generateContent$/)
    assert.ok(requestBody?.generationConfig)
  })

  it('requests and validates strict Grok output', async () => {
    Object.assign(env, {
      AI_PROVIDER: 'grok',
      AI_MAX_RETRIES: 0,
      XAI_API_KEY: 'xai-test-key',
      XAI_MODEL: 'grok-test',
    })

    let requestBody: {
      response_format?: { type?: string; json_schema?: { strict?: boolean } }
    } = {}
    globalThis.fetch = (async (_url, init) => {
      requestBody = JSON.parse(String(init?.body)) as typeof requestBody
      return new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({ questions: [validQuestion] }) } }],
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }) as typeof fetch

    const result = await new PracticeQuestionGenerator().generate(input)

    assert.equal(result.provider, 'grok')
    assert.equal(result.model, 'grok-test')
    assert.equal(requestBody.response_format?.type, 'json_schema')
    assert.equal(requestBody.response_format?.json_schema?.strict, true)
  })

  it('rejects semantically invalid provider output', async () => {
    Object.assign(env, {
      AI_PROVIDER: 'gemini',
      AI_MAX_RETRIES: 0,
      GEMINI_API_KEY: 'AIza-test-key',
    })
    const invalidQuestion = {
      ...validQuestion,
      options: ['4', '4', '3', '2'],
    }
    globalThis.fetch = (async () => new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ questions: [invalidQuestion] }) }] } }],
    }), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch

    await assert.rejects(
      () => new PracticeQuestionGenerator().generate(input),
      (error: unknown) => {
        assert.equal((error as { code?: string }).code, 'AI_GENERATION_FAILED')
        return true
      },
    )
  })
})
