type Props = {
  value?: number;
  disabled?: boolean;
  onChange: (value: number | undefined) => void;
};

export function TimeLimitInput({ value, disabled, onChange }: Props) {
  return (
    <label className="flex w-fit flex-col gap-1 text-xs font-semibold text-navy">
      Time limit (seconds)
      <input
        type="number"
        min={1}
        max={3600}
        step={1}
        disabled={disabled}
        placeholder="Untimed"
        className="w-32 rounded border border-border bg-cream px-3 py-2 text-sm font-normal"
        value={value ?? ''}
        onChange={(event) => {
          const { value: raw, valueAsNumber: number } = event.currentTarget;
          if (raw === '') onChange(undefined);
          else if (Number.isInteger(number) && number >= 1 && number <= 3600) onChange(number);
        }}
      />
    </label>
  );
}
