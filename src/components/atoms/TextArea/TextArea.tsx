interface Props {
  value: string;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export default function TextArea({
  value,
  rows = 4,
  placeholder,
  disabled,
  onChange,
}: Props) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
