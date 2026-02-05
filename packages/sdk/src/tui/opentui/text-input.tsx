import { createElement } from "react";

interface TextInputProps {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  focus?: boolean;
}

export default function TextInput({
  value,
  placeholder,
  onChange,
  onSubmit,
  focus = true,
}: TextInputProps) {
  const handleValueChange = (nextValue: string) => {
    onChange(nextValue);
  };

  return createElement("input", {
    value,
    placeholder,
    focused: focus,
    onInput: handleValueChange,
    onChange: handleValueChange,
    onSubmit,
  } as any);
}
