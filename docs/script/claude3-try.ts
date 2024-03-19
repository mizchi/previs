import AntrophicAI from "npm:@anthropic-ai/sdk@0.18.0";

const client = new AntrophicAI({
  apiKey: Deno.env.get("CLAUDE3_API_KEY")!,
});

const result = await client.messages.create({
  model: "claude-3-opus-20240229",
  max_tokens: 1000,
  temperature: 0,
  messages: [
    {
      role: "user",
      content: [
        {
          type: 'text',
          text: "What is the capital of France?",
        }
      ]
    }
  ]
});

console.log(result);