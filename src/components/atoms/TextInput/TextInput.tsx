interface Props {
  type?: "text" | "password" | "number";
  value: string | number;
  autoFocus?: boolean;
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export default function TextInput({
  type = "text",
  value,
  autoFocus,
  placeholder,
  disabled,
  onChange,
}: Props) {
  return (
    <input
      type={type}
      value={value}
      autoFocus={autoFocus}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
