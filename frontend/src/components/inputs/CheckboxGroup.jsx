import { cn } from '../../lib/utils';

const CheckboxGroup = ({ label, options, value = [], onChange, className }) => {
  const handleToggle = (optionValue) => {
    if (!onChange) {
      return;
    }
    if (value.includes(optionValue)) {
      onChange(value.filter((item) => item !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  return (
    <fieldset className={cn('mb-4', className)}>
      {label && (
        <legend className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          {label}
        </legend>
      )}
      <div className="space-y-2">
        {options?.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200"
          >
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 dark:border-dark-border"
              checked={value.includes(option.value)}
              onChange={() => handleToggle(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
};

export default CheckboxGroup;

