export interface TimezoneOption {
  label: string;
  value: string;
}

const FIRMWARE_TIMEZONE_OPTIONS: readonly TimezoneOption[] = [
  { label: "US/Hawaii", value: "HST10" },
  { label: "US/Alaska", value: "AKST9AKDT,M3.2.0,M11.1.0" },
  { label: "US/Pacific", value: "PST8PDT,M3.2.0,M11.1.0" },
  { label: "US/Arizona", value: "MST7" },
  { label: "US/Mountain", value: "MST7MDT,M3.2.0,M11.1.0" },
  { label: "US/Central", value: "CST6CDT,M3.2.0,M11.1.0" },
  { label: "US/Eastern", value: "EST5EDT,M3.2.0,M11.1.0" },
  { label: "BR/Brasilia", value: "BRT3" },
  { label: "UTC", value: "UTC0" },
  { label: "EU/Western", value: "GMT0BST,M3.5.0/1,M10.5.0" },
  { label: "EU/Central", value: "CET-1CEST,M3.5.0,M10.5.0/3" },
  { label: "EU/Eastern", value: "EET-2EEST,M3.5.0/3,M10.5.0/4" },
  { label: "Asia/Kolkata", value: "IST-5:30" },
  { label: "Asia/Hong_Kong", value: "HKT-8" },
  { label: "AU/AWST", value: "AWST-8" },
  { label: "AU/ACST", value: "ACST-9:30ACDT,M10.1.0,M4.1.0/3" },
  { label: "AU/AEST", value: "AEST-10AEDT,M10.1.0,M4.1.0/3" },
  { label: "Pacific/NZ", value: "NZST-12NZDT,M9.5.0,M4.1.0/3" },
] as const;

export const getFirmwareTimezoneOptions = (
  currentValue?: string,
): TimezoneOption[] => {
  if (!currentValue) {
    return [...FIRMWARE_TIMEZONE_OPTIONS];
  }

  const hasCurrentValue = FIRMWARE_TIMEZONE_OPTIONS.some(
    (option) => option.value === currentValue,
  );

  if (hasCurrentValue) {
    return [...FIRMWARE_TIMEZONE_OPTIONS];
  }

  return [
    { label: currentValue, value: currentValue },
    ...FIRMWARE_TIMEZONE_OPTIONS,
  ];
};
