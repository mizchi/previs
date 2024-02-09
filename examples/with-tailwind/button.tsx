export default function Button() {
  // Changed the button background color from red to blue as per the user request
  return (
    <button
      type="button"
      className="bg-blue-500 text-white font-semibold py-2 px-4 rounded shadow hover:bg-blue-700 transition duration-300 border border-white"
    >
      &#x1F4C8; Click me {/* Text remains updated */}
    </button>
  );
}

// The __PREVIEW__ function showcases the Button component with the updated blue background
export function __PREVIEW__() {
  return <Button />;
}
