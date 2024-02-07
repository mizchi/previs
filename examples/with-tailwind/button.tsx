export default function Button() {
  // Changed the button text to "Click me"
  return (
    <button
      type="button"
      className="bg-blue-500 text-white font-semibold py-2 px-4 rounded shadow hover:bg-blue-700 transition duration-300 border border-white"
    >
      &#x1F4C8; Click me {/* Updated text */}
    </button>
  );
}

// The __PREVIEW__ function now showcases the Button component with the text "Click me"
export function __PREVIEW__() {
  return <Button />;
}
