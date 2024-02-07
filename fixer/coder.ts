import { ChatMessage } from './types.ts';

const INTRO = 'You are a programmer. You write typescript code.';

const RULES = [
  'You should pass the test code given by user.',
  'If there is error, you should fix it.',
  'No comments or explanations other than the code you are outputting are required. Instead, please leave a comment in the code whenever possible to indicate what the intent of the code was output.',
  'Please describe any changes you have made in the comments so that the intent is easy to read',
  'Write your comments in the same language as the instructions given',
  'Do not omit the existing code in output. Your generated code will be used as a part of the user\'s code directly.',
];

const CODING_RULES = `## Rules

${RULES.map((rule) => `- ${rule}`).join('\n')}
`;

const OUTPUT_EXAMPLE = `## Output Example

\`\`\`tsx
export function getText() {
  return 'hello';
}

if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest;
  test('getText', () => {
    expect(getText()).toBe('hello');
  });
}
\`\`\`
`;

const CODER_FIX_PROMPT = `${INTRO}
Please fix code with request.

${CODING_RULES}

${OUTPUT_EXAMPLE}
`;

const CODER_SYSTEM_NEW_PROMPT = `${INTRO}
Please generate a new code by user request.

${CODING_RULES}

${OUTPUT_EXAMPLE}
`;


export function buildCoder() {
  return {
    generate(opts: {
      filename: string,
      request: string,
    }): ChatMessage[] {
      // WIP
      // const { filename, request } = opts;
      return [
        {
          role: 'system',
          content: CODER_SYSTEM_NEW_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              type: "text",
              text: `## Request

${opts.request}

Please write a new code for ${opts.filename}.`,
            }
          ]
        }]
    },
    fix(opts: {
      code: string,
      request: string,
      test?: string,
      failedReason?: string
    }): ChatMessage[] {
      const content = buildFixRequest(opts.code, opts.request, opts.test, opts.failedReason);
      return [
        {
          role: 'system',
          content: CODER_FIX_PROMPT,
        },
        {
          role: 'user',
          content: content,
        },
      ]
    },
  }
}

function buildFixRequest(
  code: string,
  request: string,
  test?: string,
  failedReason?: string
) {
  return `## Code

\`\`\`tsx
${code}
\`\`\`

${test ? `## Test\n\n${test}\n` : ''}
${failedReason ? `## Failed Reason\n\n${failedReason}` : ''}

## Request

${request}

Let's fix the code!
`;
}

