import { ChatContent, ChatMessage } from './types.ts';

const INTRO = 'You are CSS specialist. You write typescript-jsx(tsx) code.';

const MARKUP_RULES = `## Rules

- You should pass the test code given by the user
- No comments or explanations other than the code you are outputting are required. Instead, please leave a comment in the code whenever possible to indicate what the intent of the code was output.
- Please describe any changes you have made in the comments so that the intent is easy to read
- Write your comments in the same language as the instructions given
- Do not omit the existing code in output. Your generated code will be used as a part of the user's code directly.`;

const OUTPUT_EXAMPLE = `## Output Example

\`\`\`tsx
export default function Text(props: { text: string }) {
  return <span>{props.text}</span>
}

export function __PREVIEW__() {
  return <Text text={text} />
}
\`\`\`
`;

const MARKUP_FIX_PROMPT = `${INTRO}
Please fix code with request.

${MARKUP_RULES}

${OUTPUT_EXAMPLE}
`;

const MARKUP_SYSTEM_NEW_PROMPT = `${INTRO}
Please generate a new component of React by user request.

${MARKUP_RULES}
- Exported \`__PREVIEW__\` is previewable component for check without props. If the component has a prop, you should use the prop in __PREVIEW__.

${OUTPUT_EXAMPLE}
`;


export function buildMarkupper() {
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
          content: MARKUP_SYSTEM_NEW_PROMPT,
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
      imageUrl?: string,
    }): ChatMessage[] {
      const { code, test, request, oldPrompt, imageUrl } = opts;
      const fixingContent = buildFixRequest(code, request, test, oldPrompt);
      return [
        {
          role: 'system',
          content: MARKUP_FIX_PROMPT,
        },
        {
          role: 'user',
          content: imageUrl ? withImage(fixingContent, imageUrl) : fixingContent,
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
        content: MARKUP_FIX_PROMPT,
      },
      {
        role: 'user',
        content: opts.imageUrl ? withImage(retryContent, opts.imageUrl) : retryContent,
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

// consider image request
function withImage(message: string, b64image: string): Array<ChatContent> {
  return [
    {
      type: "image",
      image_url: {
        url: `data:image/jpeg;base64,${b64image}`
      }
    },
    {
      type: "text" as const,
      text: `Given image is preview result.\n${message}`
    },
  ]
}
