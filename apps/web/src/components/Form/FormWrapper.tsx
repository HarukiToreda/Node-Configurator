import { Label } from "@components/UI/Label.tsx";

export interface FieldWrapperProps {
  label: string;
  fieldName: string;
  description?: string;
  disabled?: boolean;
  children?: React.ReactNode;
  valid?: boolean;
  validationText?: string;
}

export const FieldWrapper = ({
  label,
  fieldName,
  description,
  children,
  valid,
  validationText,
}: FieldWrapperProps) => (
  <div className="pt-1">
    <fieldset aria-labelledby="label-notifications">
      <div className="grid grid-cols-1 gap-x-2 gap-y-1 md:grid-cols-[140px_minmax(0,1fr)] xl:grid-cols-[156px_minmax(0,1fr)] sm:items-start">
        <Label htmlFor={fieldName} className="pt-1 text-[0.95rem] leading-tight">
          {label}
        </Label>
        <div className="max-w-none">
          <p className="text-[11px] leading-tight text-slate-500 dark:text-slate-400">
            {description}
          </p>
          <p
            hidden={valid ?? true}
            className="mt-0.5 text-[11px] leading-tight text-red-500"
          >
            {validationText}
          </p>
          <div className="mt-0.5 space-y-1 sm:col-span-2">
            <div className="flex items-center">{children}</div>
          </div>
        </div>
      </div>
    </fieldset>
  </div>
);
