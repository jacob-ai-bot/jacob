import { faQuestionCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Tooltip } from "react-tooltip";

interface FormFieldProps {
  label: string;
  name: string;
  value: string | undefined;
  onChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => void;
  type?: "text" | "select" | "textarea" | "checkbox";
  options?: { value: string; label: string }[];
  placeholder?: string;
  tooltip?: string;
  className?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  options,
  placeholder,
  tooltip,
  className,
}) => {
  const inputClasses =
    "w-full rounded-full border-2 border-aurora-200 bg-white px-4 py-2 text-aurora-700 shadow-sm transition-all duration-300 focus:border-aurora-500 focus:outline-none focus:ring-2 focus:ring-aurora-500/50";
  const labelClasses = "mb-2 block text-sm font-medium text-aurora-700";

  const inputId = `input-${name}`;

  return (
    <div className={`flex w-full flex-col justify-center ${className}`}>
      <div className="flex items-center space-x-1 ">
        <label htmlFor={inputId} className={labelClasses}>
          {label}
        </label>
        {tooltip && (
          <>
            <Tooltip id={inputId} place="top" className="tooltip">
              {tooltip}
            </Tooltip>
            <div
              data-tooltip-id={inputId}
              className="top-0 cursor-pointer text-aurora-500/50 hover:text-aurora-500"
            >
              <FontAwesomeIcon
                icon={faQuestionCircle}
                size="sm"
                className="mb-[4px]"
              />
            </div>
          </>
        )}
      </div>
      {type === "select" && (
        <select
          id={inputId}
          name={name}
          value={value}
          onChange={onChange}
          className={inputClasses}
        >
          {options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
      {type === "textarea" && (
        <textarea
          id={inputId}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`${inputClasses} min-h-[200px] resize-y rounded-2xl`}
          rows={4}
        />
      )}
      {type === "checkbox" && (
        <div className="flex items-center">
          <input
            id={inputId}
            type="checkbox"
            name={name}
            checked={value === "true"}
            onChange={onChange}
            className="mr-2 rounded border-aurora-300 text-aurora-600 focus:ring-aurora-500"
          />
          <span className={labelClasses}>{label}</span>
        </div>
      )}
      {type === "text" && (
        <input
          id={inputId}
          type="text"
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={inputClasses}
        />
      )}
    </div>
  );
};

export default FormField;
