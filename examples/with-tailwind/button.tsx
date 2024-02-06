export default function Button() {
  // Changed button color to blue (bg-blue-500) and hover color to darker blue (hover:bg-blue-700)
  return (
    <button
      type="button"
      className="bg-blue-500 text-white font-semibold py-2 px-4 rounded shadow hover:bg-blue-700 transition duration-300"
    >
      button
    </button>
  );
}

// Added __PREVIEW__ function to exemplify the Button component
export function __PREVIEW__() {
  return <Button />;
}
