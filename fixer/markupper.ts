import { dedent, getExportSymbolForFilepath } from "../utils.ts";
import { ChatContent, ChatMessage, ComponentFlag } from './types.ts';

const SHARED_INTRO = dedent(`
You are CSS specialist. 
You write typescript-jsx(tsx) code.
You are requested to write a code for a component.
`);

const RULES = [
  'You should pass the test code given by the user',
  'No comments or explanations other than the code you are outputting are required. Instead, please leave a comment in the code whenever possible to indicate what the intent of the code was output.',
  'Please describe any changes you have made in the comments so that the intent is easy to read',
  'Write your comments in the same language as the instructions given',
  'Do not omit the existing code in output. Your generated code will be used as a part of the user\'s code directly.',
  'Keep user request as comment in the code for future reference',
];

const EXPORTED_PREVIEW_RULE = 'Exported \`__PREVIEW__\` is previewable component for check without props. If the component has a prop, you should use the prop in __PREVIEW__.'
const USING_TAILWIND_RULE = 'You can use tailwindcss classes in your code';
const DO_NOT_USE_TAILWIND_RULE = 'You should not use tailwindcss classes in your code';

const GENERATE_PREVIEW_RULE = 'Generate __PREVIEW__ component without props if file main component has props.'
const GENERATE_IN_SOURCE_TEST_RULE = 'Generate in-source test if user request does not have test code.'

type MarkupperOptions = {
  filename: string,
  tailwind: boolean,
  library: string // 'react' | 'vue' | 'svelte',
}

const GENERATE_INTO = (library: string) => `Please generate a new component of ${library} by user request.`;
const FIX_INTRO = 'Please fix code for user request.';

function buildSystemPrompt(intro: string, options: MarkupperOptions, flags: ComponentFlag[]) {
  const rules = [...RULES, EXPORTED_PREVIEW_RULE];
  if (options.tailwind) {
    rules.push(USING_TAILWIND_RULE);
  } else {
    rules.push(DO_NOT_USE_TAILWIND_RULE);
  }

  if (flags.includes('preview-component')) {
    rules.push(GENERATE_PREVIEW_RULE);
  }

  if (flags.includes('in-source-test')) {
    rules.push(GENERATE_IN_SOURCE_TEST_RULE);
  }
  return `${SHARED_INTRO}
${intro}

## Rules

${rules.map(s => `- ${s}`).join('\n')}

## Output Example

${buildOutputExample(options, flags)}
`;
}

export function buildMarkupper(options: MarkupperOptions, flags: ComponentFlag[]) {
  return {
    fix(opts: {
      code: string,
      request: string,
      imageUrl?: string,
    }): ChatMessage[] {
      const { code, request, imageUrl } = opts;
      const fixingContent = buildFixRequest(code, request);
      return [
        {
          role: 'system',
          content: buildSystemPrompt(FIX_INTRO, options, flags),
        },
        {
          role: 'user',
          content: imageUrl ? withImage(fixingContent, imageUrl) : fixingContent,
        },
      ]
    },
    new(opts: {
      filename: string,
      request: string,
    }): ChatMessage[] {
      // WIP
      const { filename, request } = opts;
      return [
        {
          role: 'system',
          content: buildSystemPrompt(GENERATE_INTO(options.library), options, flags),
        },
        {
          role: 'user',
          content: [
            {
              type: "text",
              text: dedent(`## Request

${request}

---

Please write a new code for ${filename}.`,
              )
            }
          ]
        }]
    },
  }
}

function buildFixRequest(
  code: string,
  request: string,
) {
  let result = `## Code\n\n`;

  result += `\`\`\`tsx
${code}
\`\`\`\n`;
  result += `## Request

${request}
`;
  result += `---\n\nLet's fix given code.`;
  return result;
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

function buildOutputExample(options: MarkupperOptions, flags: ComponentFlag[]) {
  const hasPreviewComponent = flags.includes('preview-component');
  const exportProps = hasPreviewComponent ? 'props: { text: string }' : '';
  const jsxText = hasPreviewComponent ? '{props.text}' : 'Hello';

  const componentName = getExportSymbolForFilepath(options.filename, true);

  let style;
  if (options.tailwind) {
    style = 'className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"';
  } else {
    style = 'style={{ color: "white", backgroundColor: "indigo", borderRadius: "4px"}}';
  }

  let code = '';
  code += '```tsx\n';

  code += dedent(`
  // Generated Prompts:
  // - Create a button component that accepts an \`onClick\` prop and renders a button with the text "Click me".
  // - Add a preview component that renders the button with an \`onClick\` prop.
  \n`);

  code += `\n`;

  if (flags.includes('export-default')) {
    code += dedent(`
      export default function ${componentName}(${exportProps}) {
        return <span>${jsxText}</span>
      }\n`
    );
  } else {
    code += dedent(`
    export function ${componentName}(${exportProps}) {
      return <button
        type="button"
        ${style}
      >
        ${jsxText}
      </button>
    }\n`);
  }
  code += `\n`;
  if (flags.includes('preview-component')) {
    code += dedent(`
    export function __PREVIEW__() {
      return <${componentName} onClick={() => {}} />
    }\n`);
  }
  code += `\n`;

  if (flags.includes('in-source-test')) {
    code += dedent(`
    /**
     * @vitest-environment jsdom
     */
    if (import.meta.vitest) {
      const { test, expect } = import.meta.vitest;
      const { render, screen } = await import("@testing-library/react");
      test("${componentName}", () => {
        render(<${componentName} onClick={() => { }} />);
      });
    }\n`);
  }

  code += '\n```';
  return code;
}

