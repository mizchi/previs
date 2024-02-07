import React from "react";

export interface FormProps {
  onSubmit: (data: { [key: string]: any }) => void;
}

export default function FancyForm({ onSubmit }: FormProps) {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data = Array.from(formData.entries()).reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {} as { [key: string]: any });
    onSubmit(data);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 bg-white shadow-lg rounded-lg p-8"
    >
      <div className="form-group">
        <label htmlFor="name" className="font-bold text-gray-700">
          Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="email" className="font-bold text-gray-700">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="message" className="font-bold text-gray-700">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
          rows={4}
        ></textarea>
      </div>
      <button
        type="submit"
        className="inline-flex justify-center items-center px-4 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Submit
      </button>
    </form>
  );
}

export function __PREVIEW__() {
  return <FancyForm onSubmit={console.log} />;
}
