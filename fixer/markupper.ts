import { dedent } from "../utils.ts";
import { PromptAction, buildTemplateToAction, NewInput, FixInput } from "./prompter.ts";

export type MarkupFlag = 'tailwind' | 'in-source-test' | 'export-default' | 'preview-component';

const flags = ['tailwind', 'in-source-test', 'export-default', 'preview-component'] as MarkupFlag[];
// export type MarkupFlag = (typeof flags)[number];

export type MarkupContext = {
  tailwind: boolean,
  library: string,
  vision: boolean,
}

const SHARED_INTRO = `
You are CSS specialist. 
You write typescript-jsx(tsx) code.
You are requested to write a code for a component.
`.trim();

export function createNewAction(context: MarkupContext): PromptAction<NewInput, MarkupFlag> {
  return buildTemplateToAction(context, {
    flags,
    flagSelectors: (input, ctx, flags) => {
      return flags.map(flag => {
        return {
          text: flag,
          selected: false,
          value: flag,
        }
      });
    },
    intro: `${SHARED_INTRO}Please generate a new component of react by user request.`,
    rules(_input, context, _flags) {
      const rules = [
        'You should pass the test code given by the user',
        'No comments or explanations other than the code you are outputting are required. Instead, please leave a comment in the code whenever possible to indicate what the intent of the code was output.',
        'Please describe any changes you have made in the comments so that the intent is easy to read',
        'Write your comments in the same language as the instructions given',
        'Do not omit the existing code in output. Your generated code will be used as a part of the user\'s code directly.',
        'Keep user request as comment in the code for future reference',
      ];
      if (context.tailwind) {
        rules.push('You can use tailwindcss classes in your code');
      } else {
        rules.push('You should not use tailwindcss classes in your code');
      }
      if (flags.includes('preview-component')) {
        rules.push('Generate __PREVIEW__ component without props if file main component has props.');
      }
      if (flags.includes('in-source-test')) {
        rules.push('Generate in-source test if user request does not have test code');
      }
      return rules
    },
    example: (_input, context, flags) => {
      return buildExample(context, flags as MarkupFlag[]);
    },
    request(input) {
      return `Request: ${input.request}`;
    },
    outro: (input) => `Let's create a new code for ${input.filename}`
    // outro: `Let's fix given code`,
  });
}

export function createFixAction(context: MarkupContext): PromptAction<FixInput, MarkupFlag> {
  return buildTemplateToAction(context, {
    flags,
    flagSelectors: (input, ctx, flags) => {
      // TODO: Build flag selector by input contents
      return [];
      // return flags.map(flag => {
      //   return {
      //     text: flag,
      //     selected: false,
      //     value: flag,
      //   }
      // });
    },
    intro: `${SHARED_INTRO}\nPlease generate a new component of react by user request.`,
    rules(_input, context, _flags) {
      const rules = [
        'You should pass the test code given by the user',
        'No comments or explanations other than the code you are outputting are required. Instead, please leave a comment in the code whenever possible to indicate what the intent of the code was output.',
        'Please describe any changes you have made in the comments so that the intent is easy to read',
        'Write your comments in the same language as the instructions given',
        'Do not omit the existing code in output. Your generated code will be used as a part of the user\'s code directly.',
        'Keep user request as comment in the code for future reference',
      ];
      if (context.tailwind) {
        rules.push('You can use tailwindcss classes in your code');
      } else {
        rules.push('You should not use tailwindcss classes in your code');
      }
      // if (flags.includes('preview-component')) {
      //   rules.push('Generate __PREVIEW__ component without props if file main component has props.');
      // }
      // if (flags.includes('in-source-test')) {
      //   rules.push('Generate in-source test if user request does not have test code');
      // }
      return rules
    },
    example: (_input, context, flags) => {
      return buildExample(context, flags as MarkupFlag[]);
    },
    request(input) {
      return `
Code

\`\`\`tsx
${input.code}
\`\`\`

Request: ${input.request}\n\nFix the given code.`.trim();
    },
    outro: `Let's fix given code`,
  });
}

// export const markup = (context: MarkupContext) => buildPrompter<MarkupContext>(context, {
//   new: {
//     // @ts-ignore kxxx
//     flags: flags,
//     intro: 'Please generate a new component of react by user request.',
//     rules(_input, context, _flags) {
//       const rules = [
//         'You should pass the test code given by the user',
//         'No comments or explanations other than the code you are outputting are required. Instead, please leave a comment in the code whenever possible to indicate what the intent of the code was output.',
//         'Please describe any changes you have made in the comments so that the intent is easy to read',
//         'Write your comments in the same language as the instructions given',
//         'Do not omit the existing code in output. Your generated code will be used as a part of the user\'s code directly.',
//         'Keep user request as comment in the code for future reference',
//       ];
//       if (context.tailwind) {
//         rules.push('You can use tailwindcss classes in your code');
//       } else {
//         rules.push('You should not use tailwindcss classes in your code');
//       }
//       if (flags.includes('preview-component')) {
//         rules.push('Generate __PREVIEW__ component without props if file main component has props.');
//       }
//       if (flags.includes('in-source-test')) {
//         rules.push('Generate in-source test if user request does not have test code');
//       }


//       return rules
//     },
//     example: (_input, context, flags) => {
//       return buildExample(context, flags as MarkupFlag[]);
//     },
//     request(input) {
//       return `Request: ${input.request}`;
//     },
//   },
//   fix: {
//     // @ts-ignore kxxx
//     flags: flags,
//     intro: 'Please fix code for user request.',
//     rules: [
//       'You should pass the test code given by the user',
//       'No comments or explanations other than the code you are outputting are required. Instead, please leave a comment in the code whenever possible to indicate what the intent of the code was output.',
//       'Please describe any changes you have made in the comments so that the intent is easy to read',
//       'Write your comments in the same language as the instructions given',
//       'Do not omit the existing code in output. Your generated code will be used as a part of the user\'s code directly.',
//       'Keep user request as comment in the code for future reference',
//       'Exported `__PREVIEW__` is previewable component for check without props. If the component has a prop, you should use the prop in __PREVIEW__.',
//       'Generate __PREVIEW__ component without props if file main component has props.',
//       'Generate in-source test if user request does not have test code.',
//     ],
//     example: `// Generated Prompts:` + '\n',
//     request(input) {
//       return `
// Code

// \`\`\`tsx
// ${input.code}
// \`\`\`

// Request: ${input.request}`.trim();
//     },
//   }
// });


// const RULES = [
//   'You should pass the test code given by the user',
//   'No comments or explanations other than the code you are outputting are required. Instead, please leave a comment in the code whenever possible to indicate what the intent of the code was output.',
//   'Please describe any changes you have made in the comments so that the intent is easy to read',
//   'Write your comments in the same language as the instructions given',
//   'Do not omit the existing code in output. Your generated code will be used as a part of the user\'s code directly.',
//   'Keep user request as comment in the code for future reference',
// ];

// const EXPORTED_PREVIEW_RULE = 'Exported \`__PREVIEW__\` is previewable component for check without props. If the component has a prop, you should use the prop in __PREVIEW__.'
// const USING_TAILWIND_RULE = 'You can use tailwindcss classes in your code';
// const DO_NOT_USE_TAILWIND_RULE = 'You should not use tailwindcss classes in your code';

// const GENERATE_PREVIEW_RULE = 'Generate __PREVIEW__ component without props if file main component has props.'
// const GENERATE_IN_SOURCE_TEST_RULE = 'Generate in-source test if user request does not have test code.'

// type MarkupOptions = {
//   tailwind: boolean,
//   library: string // 'react' | 'vue' | 'svelte',
// }

const NEW_INTO = (library: string) => `Please generate a new component of ${library} by user request.`;
const FIX_INTRO = 'Please fix code for user request.';

// function buildSystemPrompt(intro: string, options: MarkupContext, flags: ComponentFlag[]) {
//   const rules = [...RULES, EXPORTED_PREVIEW_RULE];
//   if (options.tailwind) {
//     rules.push(USING_TAILWIND_RULE);
//   } else {
//     rules.push(DO_NOT_USE_TAILWIND_RULE);
//   }

//   if (flags.includes('preview-component')) {
//     rules.push(GENERATE_PREVIEW_RULE);
//   }

//   if (flags.includes('in-source-test')) {
//     rules.push(GENERATE_IN_SOURCE_TEST_RULE);
//   }
//   return `${SHARED_INTRO}
// ${intro}

// ## Rules

// ${rules.map(s => `- ${s}`).join('\n')}

// ## Output Example

// ${buildExample(options, flags)}
// `;
// }

// export function fixComponentPrompt(
//   input: {
//     code: string,
//     request: string,
//     imageUrl?: string,
//   },
//   options: MarkupContext,
//   flags: ComponentFlag[]): ChatMessage[] {
//   const { code, request, imageUrl } = input;
//   // const fixingContent = buildFixRequest(code, request);
//   let result = `## Code\n\n`;
//   result += `\`\`\`tsx
// ${code}
// \`\`\`\n`;
//   result += `## Request

// ${request}
// `;
//   result += `---\n\nLet's fix given code.`;

//   return [
//     {
//       role: 'system',
//       content: buildSystemPrompt(FIX_INTRO, options, flags),
//     },
//     {
//       role: 'user',
//       content: result,
//       // content: imageUrl ? withImage(result, imageUrl) : result,
//     },
//   ]
// }

// export function newComponentPrompt(
//   input: {
//     request: string,
//     filename: string,
//   },
//   options: MarkupContext,
//   flags: ComponentFlag[]
// ): ChatMessage[] {
//   // WIP
//   return [
//     {
//       role: 'system',
//       content: buildSystemPrompt(NEW_INTO(options.library), options, flags),
//     },
//     {
//       role: 'user',
//       content: [
//         {
//           type: "text",
//           text: `
// ## Request

// ${input.request}

// ---

// Please write a new code for ${input.filename}.`.trim(),
//         }
//       ]
//     }]
// }

// // consider image request
// function withImage(message: string, b64image: string): Array<ChatContent> {
//   return [
//     {
//       type: "image",
//       image_url: {
//         url: `data:image/jpeg;base64,${b64image}`
//       }
//     },
//     {
//       type: "text" as const,
//       text: `Given image is preview result.\n${message}`
//     },
//   ]
// }

function buildExample(options: MarkupContext, flags: MarkupFlag[]) {
  const hasPreviewComponent = flags.includes('preview-component');
  const exportProps = hasPreviewComponent ? 'props: { text: string }' : '';
  const jsxText = hasPreviewComponent ? '{props.text}' : 'Hello';

  const componentName = "Button";

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

