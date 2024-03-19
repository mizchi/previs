import AntrophicAI from "npm:@anthropic-ai/sdk@0.18.0";

const client = new AntrophicAI({
  apiKey: Deno.env.get("CLAUDE3_API_KEY")!,
});

const _encoder = new TextEncoder();
async function write(input: string) {
  await Deno.stdout.write(_encoder.encode(input));
}

const stream = client.messages.stream({
  messages: [{ role: 'user', content: "こんにちは" }],
  model: 'claude-3-opus-20240229',
  max_tokens: 1024,
}).on('text', (text) => {
  write(text);
});

write('\n');
const message = await stream.finalMessage()
console.log(message)

