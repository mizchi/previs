import { useCallback, useRef, useState } from "preact/hooks";

export default function CodeRequestForm() {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [output, setOutput] = useState("");

  const onSubmit = useCallback(async (e: Event) => {
    e.preventDefault();
    const value = ref.current?.value;
    let result = "";
    for await (const data of requestToOpenAI(value ?? " ")) {
      result += data;
      setOutput(result);
    }
    console.log("result:", result);
  }, [setOutput]);
  return (
    <>
      <form className="flex flex-col items-center" onSubmit={onSubmit}>
        <div className="flex w-full">
          <textarea
            ref={ref}
            placeholder="input your request"
            className="border border-gray-300 rounded-md p-2 flex-grow min-h-[200px]"
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded-md"
          >
            Generate
          </button>
        </div>
      </form>
      <hr />
      <pre>
        <code>{output}</code>
      </pre>
    </>
  );
}

function loadOrPromptApiKey() {
  const apiKey = localStorage.getItem("openai-api-key");
  if (apiKey) return apiKey;
  const ret = prompt("Please input your OpenAI API Key");
  if (ret) {
    localStorage.setItem("openai-api-key", ret);
    return prompt;
  }
  return apiKey;
}

async function* requestToOpenAI(
  prompt: string,
): AsyncGenerator<string, void, void> {
  const apiKey = loadOrPromptApiKey();
  const messages = [
    {
      role: "system",
      content: "You are a helpful assistant.",
    },
    {
      role: "user",
      content: prompt,
    },
  ];
  const completion = await fetch("https://api.openai.com/v1/chat/completions", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    method: "POST",
    body: JSON.stringify({
      messages: messages,
      model: "gpt-3.5-turbo",
      stream: true,
    }),
  });

  const reader = completion.body?.getReader();
  if (completion.status !== 200 || !reader) return;

  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      reader.releaseLock();
      break;
    }
    const data = decoder.decode(value, { stream: true });
    const response = data
      .split("data:")
      .map((data) => {
        const trimData = data.trim();
        if (trimData === "") return undefined;
        if (trimData === "[DONE]") return undefined;
        return JSON.parse(data.trim());
      })
      .filter((data) => data);
    for (const message of response ?? []) {
      // yield message.content;
      for (const choice of message?.choices) {
        yield choice.delta.content;
      }
    }
  }
  return;
}
