import { z } from 'zod'

import { env } from '../../config/env.js'
import { AppError } from '../../shared/errors/app-error.js'

export type PracticeGenerationInput = {
  subjectName: string
  gradeLevel?: string | null
  topics: Array<{ id: string; name: string; description?: string | null }>
  difficulty: number
  questionCount: number
  practiceMode: 'adaptive' | 'standard'
}

export type GeneratedPracticeQuestion = {
  topicId: string
  text: string
  options: string[]
  correctAnswer: string
  explanation: string
  difficulty: number
}

type JsonObject = Record<string, unknown>

const questionSchema = z.object({
  topicId: z.string().regex(/^[a-f\d]{24}$/i),
  text: z.string().trim().min(10).max(500),
  options: z.array(z.string().trim().min(1).max(180)).length(4),
  correctAnswer: z.string().trim().min(1).max(180),
  explanation: z.string().trim().min(10).max(1_200),
  difficulty: z.number().int().min(1).max(5),
})

const responseSchema = z.object({
  questions: z.array(questionSchema).min(1).max(20),
})

function jsonSchema(input: PracticeGenerationInput): JsonObject {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      questions: {
        type: 'array',
        minItems: input.questionCount,
        maxItems: input.questionCount,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            topicId: {
              type: 'string',
              enum: input.topics.map((topic) => topic.id),
              description: 'The exact topic ID supplied in the prompt.',
            },
            text: { type: 'string', description: 'A complete, unambiguous multiple-choice question.' },
            options: {
              type: 'array',
              minItems: 4,
              maxItems: 4,
              items: { type: 'string' },
              description: 'Four distinct answer choices with no letter prefixes.',
            },
            correctAnswer: {
              type: 'string',
              description: 'An exact copy of one value in options.',
            },
            explanation: {
              type: 'string',
              description: 'A concise explanation of why the answer is correct.',
            },
            difficulty: { type: 'integer', minimum: 1, maximum: 5 },
          },
          required: ['topicId', 'text', 'options', 'correctAnswer', 'explanation', 'difficulty'],
        },
      },
    },
    required: ['questions'],
  }
}

function buildPrompt(input: PracticeGenerationInput): string {
  const topicList = input.topics
    .map((topic) => `- ${topic.id}: ${topic.name}${topic.description ? ` — ${topic.description}` : ''}`)
    .join('\n')

  return [
    'Create a high-quality educational multiple-choice practice assessment.',
    `Subject: ${input.subjectName}`,
    `Student grade/level: ${input.gradeLevel || 'not specified; use broadly appropriate school-level language'}`,
    `Requested difficulty: ${input.difficulty}/5`,
    `Mode: ${input.practiceMode}`,
    `Question count: exactly ${input.questionCount}`,
    'Allowed topics (return the exact topic ID for every question):',
    topicList,
    '',
    'Quality requirements:',
    '- Cover the allowed topics as evenly as possible.',
    '- Every question must be original within this assessment, factually correct, self-contained, and have exactly one defensible answer.',
    '- Provide four distinct, plausible options. correctAnswer must exactly match one option.',
    '- Avoid trick wording, subjective answers, unsafe content, current-event facts, and questions that depend on an image or external source.',
    '- Explanations must teach the reasoning, not merely repeat the answer.',
    input.practiceMode === 'adaptive'
      ? '- Vary difficulty by at most one level around the requested difficulty while keeping every difficulty between 1 and 5.'
      : '- Use the requested difficulty for every question.',
    '- Return only data matching the supplied JSON schema.',
  ].join('\n')
}

function responseText(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('The AI provider returned an empty response')
  }
  return value
}

async function generateWithGemini(
  input: PracticeGenerationInput,
  prompt: string,
  schema: JsonObject,
): Promise<string> {
  if (!env.GEMINI_API_KEY) {
    throw new AppError(503, 'Gemini is not configured', 'AI_PROVIDER_NOT_CONFIGURED')
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.GEMINI_MODEL)}:generateContent`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: Math.max(4_096, input.questionCount * 550),
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    }),
    signal: AbortSignal.timeout(env.AI_REQUEST_TIMEOUT_MS),
  })

  const body = await response.json().catch(() => ({})) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    error?: { message?: string }
  }

  if (!response.ok) {
    throw new Error(`Gemini request failed (${response.status}): ${body.error?.message ?? 'unknown provider error'}`)
  }

  return responseText(body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join(''))
}

async function generateWithGrok(prompt: string, schema: JsonObject): Promise<string> {
  if (!env.XAI_API_KEY) {
    throw new AppError(503, 'Grok is not configured', 'AI_PROVIDER_NOT_CONFIGURED')
  }

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.XAI_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: env.XAI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert assessment designer. Produce accurate, age-appropriate educational questions.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.35,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'practice_assessment', strict: true, schema },
      },
    }),
    signal: AbortSignal.timeout(env.AI_REQUEST_TIMEOUT_MS),
  })

  const body = await response.json().catch(() => ({})) as {
    choices?: Array<{ message?: { content?: string } }>
    error?: { message?: string }
  }

  if (!response.ok) {
    throw new Error(`Grok request failed (${response.status}): ${body.error?.message ?? 'unknown provider error'}`)
  }

  return responseText(body.choices?.[0]?.message?.content)
}

function validateQuestions(raw: string, input: PracticeGenerationInput): GeneratedPracticeQuestion[] {
  const parsed = responseSchema.parse(JSON.parse(raw))
  if (parsed.questions.length !== input.questionCount) {
    throw new Error(`Expected ${input.questionCount} questions but received ${parsed.questions.length}`)
  }

  const allowedTopics = new Set(input.topics.map((topic) => topic.id))
  const seenQuestions = new Set<string>()

  for (const question of parsed.questions) {
    if (!allowedTopics.has(question.topicId)) throw new Error('A generated question used an unknown topic')
    if (new Set(question.options.map((option) => option.toLocaleLowerCase())).size !== 4) {
      throw new Error('A generated question contains duplicate options')
    }
    if (!question.options.includes(question.correctAnswer)) {
      throw new Error('A generated correct answer does not exactly match an option')
    }
    const normalized = question.text.toLocaleLowerCase().replace(/\s+/g, ' ').trim()
    if (seenQuestions.has(normalized)) throw new Error('The provider generated duplicate questions')
    seenQuestions.add(normalized)
  }

  return parsed.questions
}

export class PracticeQuestionGenerator {
  async generate(input: PracticeGenerationInput): Promise<{
    provider: 'gemini' | 'grok'
    model: string
    questions: GeneratedPracticeQuestion[]
  }> {
    const prompt = buildPrompt(input)
    const schema = jsonSchema(input)
    let lastError: unknown

    for (let attempt = 0; attempt <= env.AI_MAX_RETRIES; attempt += 1) {
      try {
        const raw = env.AI_PROVIDER === 'gemini'
          ? await generateWithGemini(input, prompt, schema)
          : await generateWithGrok(prompt, schema)

        return {
          provider: env.AI_PROVIDER,
          model: env.AI_PROVIDER === 'gemini' ? env.GEMINI_MODEL : env.XAI_MODEL,
          questions: validateQuestions(raw, input),
        }
      } catch (error) {
        if (error instanceof AppError && error.code === 'AI_PROVIDER_NOT_CONFIGURED') throw error
        lastError = error
        console.warn(JSON.stringify({
          level: 'warn',
          message: 'AI practice generation attempt failed',
          provider: env.AI_PROVIDER,
          model: env.AI_PROVIDER === 'gemini' ? env.GEMINI_MODEL : env.XAI_MODEL,
          attempt: attempt + 1,
          error: error instanceof Error ? error.message : String(error),
        }))
      }
    }

    throw new AppError(
      503,
      'Practice questions could not be generated right now. Please try again.',
      'AI_GENERATION_FAILED',
      { provider: env.AI_PROVIDER, reason: lastError instanceof Error ? lastError.name : 'ProviderError' },
    )
  }
}

export const practiceQuestionGenerator = new PracticeQuestionGenerator()
