import { faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { NumericFormat, NumericFormatProps } from "react-number-format";
import { Button } from "./button";
import { Input } from "./input";

export interface NumberInputProps extends Omit<
  NumericFormatProps,
  "value" | "onValueChange"
> {
  stepper?: number;
  thousandSeparator?: string;
  placeholder?: string;
  defaultValue?: number;
  min?: number;
  max?: number;
  value?: number; // Controlled value
  suffix?: string;
  prefix?: string;
  onValueChange?: (value: number | undefined) => void;
  fixedDecimalScale?: boolean;
  decimalScale?: number;
  disabled?: boolean;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      stepper,
      thousandSeparator,
      placeholder,
      defaultValue,
      min = -Infinity,
      max = Infinity,
      onValueChange,
      fixedDecimalScale = false,
      decimalScale = 0,
      suffix,
      prefix,
      value: controlledValue,
      disabled = false,
      ...props
    },
    ref,
  ) => {
    const internalRef = useRef<HTMLInputElement>(null);
    const combinedRef = ref || internalRef;

    // Determine if component is controlled
    const isControlled = controlledValue !== undefined;

    // Internal state only used for uncontrolled mode
    const [internalValue, setInternalValue] = useState<number | undefined>(
      defaultValue,
    );

    // Use controlled value if provided, otherwise use internal state
    const value = isControlled ? controlledValue : internalValue;

    // Update function that works for both controlled and uncontrolled
    const updateValue = useCallback(
      (newValue: number | undefined) => {
        if (!isControlled) {
          setInternalValue(newValue);
        }
        onValueChange?.(newValue);
      },
      [isControlled, onValueChange],
    );

    const handleIncrement = useCallback(() => {
      const newValue =
        value === undefined
          ? (stepper ?? 1)
          : Math.min(value + (stepper ?? 1), max);
      updateValue(newValue);
    }, [stepper, max, value, updateValue]);

    const handleDecrement = useCallback(() => {
      const newValue =
        value === undefined
          ? -(stepper ?? 1)
          : Math.max(value - (stepper ?? 1), min);
      updateValue(newValue);
    }, [stepper, min, value, updateValue]);

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (
          document.activeElement ===
          (combinedRef as React.RefObject<HTMLInputElement>).current
        ) {
          if (e.key === "ArrowUp") {
            handleIncrement();
          } else if (e.key === "ArrowDown") {
            handleDecrement();
          }
        }
      };

      window.addEventListener("keydown", handleKeyDown);

      return () => {
        window.removeEventListener("keydown", handleKeyDown);
      };
    }, [handleIncrement, handleDecrement, combinedRef]);

    const handleChange = (values: {
      value: string;
      floatValue: number | undefined;
    }) => {
      const newValue =
        values.floatValue === undefined ? undefined : values.floatValue;
      updateValue(newValue);
    };

    const handleBlur = () => {
      if (value !== undefined) {
        if (value < min) {
          updateValue(min);
        } else if (value > max) {
          updateValue(max);
        }
      }
    };

    return (
      <div className="flex items-center">
        <NumericFormat
          value={value}
          onValueChange={handleChange}
          thousandSeparator={thousandSeparator}
          decimalScale={decimalScale}
          fixedDecimalScale={fixedDecimalScale}
          allowNegative={min < 0}
          valueIsNumericString
          onBlur={handleBlur}
          max={max}
          min={min}
          suffix={suffix}
          prefix={prefix}
          customInput={Input}
          placeholder={placeholder}
          disabled={disabled}
          className="relative [appearance:textfield] rounded-r-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          getInputRef={combinedRef} // Use combined ref
          {...props}
        />

        <div className="flex h-9 flex-col">
          <Button
            type="button"
            aria-label="Increase value"
            className="border-input h-4.5 min-h-0 rounded-l-none rounded-br-none border-b-[0.5px] border-l-0 px-1.5 focus-visible:relative"
            variant="outline"
            onClick={handleIncrement}
            disabled={disabled || value === max}
          >
            <FontAwesomeIcon icon={faChevronUp} className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            aria-label="Decrease value"
            className="border-input h-4.5 min-h-0 rounded-l-none rounded-tr-none border-t-[0.5px] border-l-0 px-1.5 focus-visible:relative"
            variant="outline"
            onClick={handleDecrement}
            disabled={disabled || value === min}
          >
            <FontAwesomeIcon icon={faChevronDown} className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  },
);
