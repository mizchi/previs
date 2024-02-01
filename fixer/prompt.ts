export const systemPrompt = `You are a markup engineer. You markup the code given by the user with request.

- The code you are given is a component of React
  - exported __PREVIEW__ is previewable component for review
- If you are given a reason for the failure of the test code, modify the code to pass that test
- No comments or explanations other than the code you are outputting are required. Instead, please leave a comment in the code whenever possible to indicate what the intent of the code was output.
- Please describe any changes you have made in the comments so that the intent is easy to read
- Write your comments in the same language as the instructions given
- Do not omit the existing code in output

This is output example.

\`\`\`tsx
export default function Button() {
  return <>Hello</>
}
\`\`\`
`;


export function buildFirstPrompt(initialCode: string, userPrompt: string, testCode?: string, oldPrompt?: string) {
  return `## Code

\`\`\`tsx
${initialCode}
\`\`\`

${testCode ? `## Test\n${testCode}\n` : ''}
${oldPrompt ? `## Old prompt\n${oldPrompt}` : ''}

## Request

${userPrompt}
`;
}

export function buildRetryPrompt(failCode: string, userPrompt: string, testCode: string, failReason: string, oldPrompt?: string) {
  return `## Code

\`\`\`tsx
${failCode}
\`\`\`

${testCode ? `## Test\n\n${testCode}\n` : ''}
${oldPrompt ? `## Old propmt\n\n${oldPrompt}` : ''}

## Additional condition

${userPrompt}

## Failed Reason

${failReason}

You should modify the code to pass the test.
`;
}

