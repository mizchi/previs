// User Request: fancy button
// Request: bg red
// Fix the given code
// Changes Made: Changed "bg-blue-500" to "bg-red-500" and "bg-blue-700" to "bg-red-700" for the requested background color change.

export function FancyButton(props: { onClick: () => void; text: string }) {
  return (
    <button
      onClick={props.onClick}
      className="transform transition ease-in-out duration-300 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1"
    >
      {props.text}
    </button>
  );
}

export function __PREVIEW__() {
  return <FancyButton onClick={() => alert("Clicked!")} text="Click me" />;
}

/**
 * @vitest-environment jsdom
 */
if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest;
  const { render, screen } = await import("@testing-library/react");
  const { userEvent } = await import("@testing-library/user-event");

  test("FancyButton", async () => {
    render(<FancyButton onClick={() => {}} text="Click me" />);
    const button = screen.getByText("Click me");
    expect(button).toHaveClass("bg-red-500"); // Updated to bg-red-500
    await userEvent.click(button);
    expect(button).toHaveClass("bg-red-700"); // Updated to bg-red-700
  });
}
