import { cn } from '../../lib/utils';

const RadioGroup = ({ label, options, value, onChange, className, name }) => {
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
              type="radio"
              name={name}
              className="h-4 w-4 border-slate-300 text-primary-600 focus:ring-primary-500 dark:border-dark-border"
              checked={value === option.value}
              onChange={() => onChange?.(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
};

export default RadioGroup;

