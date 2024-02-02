import CodeRequestForm from "../islands/CodeRequestForm.tsx";

const firstSampleCode = `export default function Form() {
  return <form>
    <input type="text" />
    <button type="submit">Submit</button>
  </form>;
}
`;
export default function Home() {
  return (
    <div>
      <header className="bg-gray-800 text-white p-4">
        <h1 className="text-4xl font-bold text-center">Previs Studio</h1>
      </header>
      <main className="max-w-4xl mx-auto">
        <pre className="bg-gray-100 p-4">
          <code>{firstSampleCode}</code>
        </pre>
        <CodeRequestForm />
      </main>
    </div>
  );
}
