import React from "react";

interface TextAreaProps {
  value: string;
  onChange: (newValue: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

const TextArea: React.FC<TextAreaProps> = ({
  value,
  onChange,
  placeholder = "",
  rows = 4,
  className = "",
}) => {
  return (
    <textarea
      className={`shadow appearance-none border rounded py-2 px-3 text-grey-darker leading-tight focus:outline-none focus:shadow-outline ${className}`}
      rows={rows}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
};

export default TextArea;

export function __PREVIEW__() {
  // Use some default props for the preview component
  const [text, setText] = React.useState<string>("Type here...");

  return (
    <TextArea
      value={text}
      onChange={setText}
      placeholder="Placeholder"
      rows={4}
      className="w-full max-w-xs"
    />
  );
}
