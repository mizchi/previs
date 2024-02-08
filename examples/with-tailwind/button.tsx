export default function Button() {
  // Changed the button background color from blue to red as per the user request
  return (
    <button
      type="button"
      className="bg-red-500 text-white font-semibold py-2 px-4 rounded shadow hover:bg-red-700 transition duration-300 border border-white"
    >
      &#x1F4C8; Click me {/* Text remains updated */}
    </button>
  );
}

// The __PREVIEW__ function showcases the Button component with the updated red background
export function __PREVIEW__() {
  return <Button />;
}
