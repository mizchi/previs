import React from "react";

interface CardProps {
  children: React.ReactNode;
}

// Card component that wraps content within a card layout using TailwindCSS classes
export default function Card({ children }: CardProps) {
  // Added 'border' and 'border-gray-300' classes for a gray outline
  return (
    <div className="bg-white shadow-xl rounded-lg overflow-hidden m-4 p-6 text-gray-800 border border-gray-300">
      {children}
    </div>
  );
}

// Preview component for development purposes
export function __PREVIEW__() {
  // Example text passed as children for the preview
  const text: string = "This is a card preview text";

  // Rendering the Card component with the example text
  // Wrapped the text in a <span> element for proper rendering as ReactNode
  return (
    <Card>
      <span>{text}</span>
    </Card>
  );
}
