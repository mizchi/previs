export default function Button() {
  // Changed button color to red (bg-red-500) and hover color to darker red (hover:bg-red-700)
  return (
    <button
      type="button"
      className="bg-red-500 text-white font-semibold py-2 px-4 rounded shadow hover:bg-red-700 transition duration-300"
    >
      button
    </button>
  );
}

if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest;
  const { renderToString } = await import("react-dom/server");
  test("should render", () => {
    const result = renderToString(<Button />);
    expect(result).toContain("button");
  });
}
