import { ChatMessage } from './types.ts';

const INTRO = 'You are a programmer. You write typescript code.';

const CODING_RULES = `## Rules

- You should pass the test code given by the user
- No comments or explanations other than the code you are outputting are required. Instead, please leave a comment in the code whenever possible to indicate what the intent of the code was output.
- Please describe any changes you have made in the comments so that the intent is easy to read
- Write your comments in the same language as the instructions given
- Do not omit the existing code in output. Your generated code will be used as a part of the user's code directly.`;

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
  // let history: ChatMessage[] = [];
  return {
    reset() {
      // history = [];
    },
    generate(opts: {
      filename: string,
      request: string,
    }): ChatMessage[] {
      // WIP
      const { filename, request } = opts;
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

${request}

Please write a new code for ${filename}!`,
            }
          ]
        }]
    },
    fix(opts: {
      code: string,
      test?: string,
      request: string,
      oldPrompt?: string,
    }): ChatMessage[] {
      const { code, test, request, oldPrompt } = opts;
      const fixingContent = buildFixRequest(code, request, test, oldPrompt);
      return [
        {
          role: 'system',
          content: CODER_FIX_PROMPT,
        },
        {
          role: 'user',
          content: fixingContent,
        },
      ]
    },
    retryWith(opts: {
      code: string,
      request: string,
      failedReason: string,
      testCommand: string[],
      test?: string,
      lastPrompt?: string,
      imageUrl?: string,
    }) {
      const retryContent = buildRetryRequest(
        opts.code,
        opts.request,
        opts.test,
        opts.testCommand,
        opts.failedReason,
        opts.lastPrompt
      );
      return [{
        role: 'system',
        content: CODER_FIX_PROMPT,
      },
      {
        role: 'user',
        content: retryContent
      }]
      // return messages;
    }
  }
}

function buildFixRequest(
  code: string,
  request: string,
  test?: string,
  oldPrompt?: string
) {
  return `## Code

\`\`\`tsx
${code}
\`\`\`

${test ? `## Test\n\n${test}\n` : ''}
${oldPrompt ? `## Old prompt\n${oldPrompt}` : ''}

## Request

${request}

Let's fix the code!
`;
}

function buildRetryRequest(
  code: string,
  request: string,
  test: string | undefined,
  testCommand: string[],
  failReason: string,
  oldPrompt?: string
) {
  return `## Code (Test Failed)

\`\`\`tsx
${code}
\`\`\`

${test ? `## Test\n\n${test}\n` : ''}
${oldPrompt ? `## Old prompt\n\n${oldPrompt}` : ''}

## Request

${request}

## Failed Reason

test command: ${testCommand.join(" ")}

${failReason}

You should modify the code to pass the test.

Let's try again!
`;
}
