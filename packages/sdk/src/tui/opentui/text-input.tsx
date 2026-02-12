import { createElement } from "react";

interface TextInputProps {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  focus?: boolean;
}

/** Props for the OpenTUI input element */
interface OpenTuiInputProps {
  value: string;
  placeholder?: string;
  focused?: boolean;
  onInput?: (value: string) => void;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  [key: string]: unknown;
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

  const inputProps: OpenTuiInputProps = {
    value,
    placeholder,
    focused: focus,
    onInput: handleValueChange,
    onChange: handleValueChange,
    onSubmit,
  };

  return createElement("input", inputProps);
}
