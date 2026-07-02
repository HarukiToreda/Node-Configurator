import { create } from "@bufbuild/protobuf";
import { Button } from "@components/UI/Button.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import { Input } from "@components/UI/Input.tsx";
import { Label } from "@components/UI/Label.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/UI/Popover.tsx";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@components/UI/Select.tsx";
import { Switch } from "@components/UI/Switch.tsx";
import { useToast } from "@core/hooks/useToast.ts";
import { cn } from "@core/utils/cn.ts";
import { Protobuf } from "@meshtastic/sdk";
import { SearchIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

const QUICK_EXPIRY_DAY_OPTIONS = Array.from({ length: 15 }, (_, index) =>
  String(index),
);
const QUICK_EXPIRY_HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) =>
  String(index),
);

const WAYPOINT_EMOJI_GROUPS = [
  {
    key: "people",
    emojis: [
      "😀",
      "😃",
      "😄",
      "😁",
      "😆",
      "😅",
      "😂",
      "🤣",
      "😊",
      "😍",
      "😘",
      "😎",
      "🤩",
      "🤔",
      "🫡",
      "👍",
      "👎",
      "👏",
      "🙌",
      "🙏",
      "💪",
      "🫶",
      "👀",
      "🧠",
    ],
  },
  {
    key: "nature",
    emojis: [
      "🌞",
      "🌙",
      "⭐",
      "🔥",
      "💧",
      "⛈️",
      "🌈",
      "🌲",
      "🌳",
      "🌵",
      "🌴",
      "🌺",
      "🍀",
      "🐶",
      "🐱",
      "🐻",
      "🦊",
      "🐺",
      "🦌",
      "🐟",
      "🦅",
      "🦉",
      "🐢",
      "🐝",
    ],
  },
  {
    key: "places",
    emojis: [
      "📍",
      "📌",
      "🏠",
      "🏕️",
      "🏢",
      "🏥",
      "🏫",
      "🏪",
      "🏭",
      "⛺",
      "🏖️",
      "🏝️",
      "🏞️",
      "🗻",
      "⛰️",
      "🌋",
      "🛣️",
      "🛤️",
      "🗺️",
      "🧭",
      "🛟",
      "⛽",
      "🪧",
      "🚩",
    ],
  },
  {
    key: "travel",
    emojis: [
      "🚗",
      "🚙",
      "🛻",
      "🏍️",
      "🚲",
      "🛴",
      "🚜",
      "🚤",
      "⛵",
      "🚁",
      "🛩️",
      "✈️",
      "🚂",
      "🚆",
      "🚇",
      "🚌",
      "🚓",
      "🚑",
      "🚒",
      "🚚",
      "🛶",
      "🚀",
      "🛰️",
      "⚓",
    ],
  },
  {
    key: "objects",
    emojis: [
      "📻",
      "📡",
      "📱",
      "💻",
      "🔋",
      "🔌",
      "💡",
      "🔦",
      "🧰",
      "🛠️",
      "⚙️",
      "🔧",
      "🪛",
      "🔨",
      "⛏️",
      "🧯",
      "🪓",
      "🪚",
      "🧲",
      "🪫",
      "🎒",
      "📦",
      "🧴",
      "🔐",
    ],
  },
  {
    key: "symbols",
    emojis: [
      "❗",
      "‼️",
      "❓",
      "⚠️",
      "🚨",
      "🆘",
      "✅",
      "❌",
      "⭕",
      "🟢",
      "🟡",
      "🔴",
      "🔵",
      "🟠",
      "🟣",
      "⚪",
      "⚫",
      "⬆️",
      "⬇️",
      "⬅️",
      "➡️",
      "↗️",
      "↘️",
      "⭐",
    ],
  },
  {
    key: "food",
    emojis: [
      "🍎",
      "🍊",
      "🍌",
      "🍇",
      "🍓",
      "🥪",
      "🍔",
      "🍕",
      "🌮",
      "🍜",
      "☕",
      "🧃",
      "🥤",
      "💧",
      "🧊",
      "🍪",
    ],
  },
  {
    key: "activities",
    emojis: [
      "🎯",
      "🎣",
      "🏹",
      "🪁",
      "🎒",
      "🎵",
      "🎤",
      "📣",
      "🎧",
      "🎮",
      "🏆",
      "🥇",
      "⚽",
      "🏈",
      "🏕️",
      "🎆",
    ],
  },
] as const;

interface WaypointChannelOption {
  index: number;
  label: string;
}

interface WaypointDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  latitude: number;
  longitude: number;
  channels: readonly WaypointChannelOption[];
  myNodeNum?: number;
  onSubmit: (
    waypoint: Protobuf.Mesh.Waypoint,
    channelIndex: number,
  ) => Promise<void>;
}

function createWaypointId(): number {
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  const generatedId = values[0] ?? 1;
  return generatedId === 0 ? 1 : generatedId;
}

function parseIconCodePoint(icon: string): number | undefined {
  const firstSymbol = [...icon.trim()][0];
  return firstSymbol?.codePointAt(0);
}

function formatDateTimeLocal(date: Date): string {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

export function WaypointDialog({
  open,
  onOpenChange,
  latitude,
  longitude,
  channels,
  myNodeNum,
  onSubmit,
}: WaypointDialogProps) {
  const { t } = useTranslation(["map", "channels"]);
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [channelIndex, setChannelIndex] = useState("0");
  const [lockToMyNode, setLockToMyNode] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [expiryDays, setExpiryDays] = useState("0");
  const [expiryHours, setExpiryHours] = useState("0");
  const [emojiSearch, setEmojiSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultChannelIndex = useMemo(
    () => String(channels[0]?.index ?? 0),
    [channels],
  );

  const filteredEmojiGroups = useMemo(() => {
    const search = emojiSearch.trim().toLowerCase();
    if (!search) {
      return WAYPOINT_EMOJI_GROUPS;
    }

    return WAYPOINT_EMOJI_GROUPS.map((group) => ({
      ...group,
      emojis: group.emojis.filter((emojiOption) => emojiOption.includes(search)),
    })).filter((group) => group.emojis.length > 0);
  }, [emojiSearch]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setName("");
    setDescription("");
    setIcon("");
    setChannelIndex(defaultChannelIndex);
    setLockToMyNode(false);
    setExpiresAt("");
    setExpiryDays("0");
    setExpiryHours("0");
    setEmojiSearch("");
    setIsSubmitting(false);
  }, [defaultChannelIndex, open]);

  const applyRelativeExpiry = (days: string, hours: string) => {
    const totalHours =
      Number.parseInt(days, 10) * 24 + Number.parseInt(hours, 10);

    if (!Number.isFinite(totalHours) || totalHours <= 0) {
      setExpiresAt("");
      return;
    }

    setExpiresAt(
      formatDateTimeLocal(new Date(Date.now() + totalHours * 60 * 60 * 1000)),
    );
  };

  const handleExpiryDaysChange = (value: string) => {
    setExpiryDays(value);
    applyRelativeExpiry(value, expiryHours);
  };

  const handleExpiryHoursChange = (value: string) => {
    setExpiryHours(value);
    applyRelativeExpiry(expiryDays, value);
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast({
        title: t("waypointDialog.validation.nameRequired", { ns: "map" }),
      });
      return;
    }

    const iconCodePoint = parseIconCodePoint(icon);
    if (!iconCodePoint) {
      toast({
        title: t("waypointDialog.validation.iconRequired", { ns: "map" }),
      });
      return;
    }

    const expirationSeconds =
      expiresAt.trim().length > 0
        ? Math.floor(new Date(expiresAt).getTime() / 1000)
        : 0;

    if (Number.isNaN(expirationSeconds) || expirationSeconds < 0) {
      toast({
        title: t("waypointDialog.validation.invalidExpiry", { ns: "map" }),
      });
      return;
    }

    const waypoint = create(Protobuf.Mesh.WaypointSchema, {
      id: createWaypointId(),
      latitudeI: Math.round(latitude * 1e7),
      longitudeI: Math.round(longitude * 1e7),
      expire: expirationSeconds,
      lockedTo: lockToMyNode && myNodeNum ? myNodeNum : 0,
      name: trimmedName,
      description: description.trim(),
      icon: iconCodePoint,
    });

    try {
      setIsSubmitting(true);
      await onSubmit(waypoint, Number.parseInt(channelIndex, 10));
      onOpenChange(false);
      toast({
        title: t("waypointDialog.success.title", { ns: "map" }),
        description: t("waypointDialog.success.description", { ns: "map" }),
      });
    } catch {
      toast({
        title: t("waypointDialog.error.title", { ns: "map" }),
        description: t("waypointDialog.error.description", { ns: "map" }),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>{t("waypointDialog.title", { ns: "map" })}</DialogTitle>
          <DialogDescription>
            {t("waypointDialog.description", { ns: "map" })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="waypoint-name">
              {t("waypointDialog.name.label", { ns: "map" })}
            </Label>
            <Input
              id="waypoint-name"
              value={name}
              maxLength={30}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("waypointDialog.name.placeholder", { ns: "map" })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="waypoint-description">
              {t("waypointDialog.descriptionField.label", { ns: "map" })}
            </Label>
            <textarea
              id="waypoint-description"
              value={description}
              maxLength={100}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("waypointDialog.descriptionField.placeholder", {
                ns: "map",
              })}
              className="min-h-24 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:border-slate-500 dark:text-slate-100"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("waypointDialog.icon.label", { ns: "map" })}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex h-10 w-full items-center rounded-md border border-slate-300 bg-transparent px-3 text-left text-sm focus:outline-hidden focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 dark:border-slate-700 dark:text-slate-50 dark:focus:ring-offset-slate-900",
                      icon
                        ? "justify-center text-2xl"
                        : "justify-start text-slate-400",
                    )}
                    aria-label={t("waypointDialog.icon.fieldAria", {
                      ns: "map",
                    })}
                  >
                    {icon || t("waypointDialog.icon.empty", { ns: "map" })}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[22rem] space-y-3 p-3">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {t("waypointDialog.icon.popoverTitle", { ns: "map" })}
                    </p>
                    <div className="relative">
                      <SearchIcon
                        size={14}
                        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                      />
                      <Input
                        value={emojiSearch}
                        onChange={(event) => setEmojiSearch(event.target.value)}
                        placeholder={t("waypointDialog.icon.searchPlaceholder", {
                          ns: "map",
                        })}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                    {filteredEmojiGroups.map((group) => (
                      <div key={group.key} className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {t(`waypointDialog.icon.groups.${group.key}`, {
                            ns: "map",
                          })}
                        </p>
                        <div className="grid grid-cols-8 gap-2">
                          {group.emojis.map((emojiOption) => (
                            <button
                              key={`${group.key}-${emojiOption}`}
                              type="button"
                              className="flex h-9 items-center justify-center rounded-md border border-slate-300 bg-transparent text-xl transition-colors hover:bg-slate-100 focus:outline-hidden focus:ring-2 focus:ring-slate-400 dark:border-slate-600 dark:hover:bg-slate-700"
                              onClick={() => setIcon(emojiOption)}
                              aria-label={t("waypointDialog.icon.pickAria", {
                                ns: "map",
                                icon: emojiOption,
                              })}
                            >
                              {emojiOption}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    {filteredEmojiGroups.length === 0 && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {t("waypointDialog.icon.noResults", { ns: "map" })}
                      </p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>{t("waypointDialog.channel.label", { ns: "map" })}</Label>
              <Select value={channelIndex} onValueChange={setChannelIndex}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((channel) => (
                    <SelectItem
                      key={channel.index}
                      value={String(channel.index)}
                    >
                      {channel.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="waypoint-expire">
              {t("waypointDialog.expiresAt.label", { ns: "map" })}
            </Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs text-slate-500 dark:text-slate-400">
                  {t("waypointDialog.quickExpiry.daysLabel", { ns: "map" })}
                </Label>
                <Select value={expiryDays} onValueChange={handleExpiryDaysChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>
                        {t("waypointDialog.quickExpiry.groups.days", {
                          ns: "map",
                        })}
                      </SelectLabel>
                      {QUICK_EXPIRY_DAY_OPTIONS.map((value) => (
                        <SelectItem key={value} value={value}>
                          {t("waypointDialog.quickExpiry.dayOption", {
                            ns: "map",
                            count: Number.parseInt(value, 10),
                          })}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-slate-500 dark:text-slate-400">
                  {t("waypointDialog.quickExpiry.hoursLabel", { ns: "map" })}
                </Label>
                <Select value={expiryHours} onValueChange={handleExpiryHoursChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>
                        {t("waypointDialog.quickExpiry.groups.hours", {
                          ns: "map",
                        })}
                      </SelectLabel>
                      {QUICK_EXPIRY_HOUR_OPTIONS.map((value) => (
                        <SelectItem key={value} value={value}>
                          {t("waypointDialog.quickExpiry.hourOption", {
                            ns: "map",
                            count: Number.parseInt(value, 10),
                          })}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Input
              id="waypoint-expire"
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border border-slate-300 px-3 py-2 dark:border-slate-600">
            <div className="space-y-1">
              <Label className="text-sm">
                {t("waypointDialog.lockToNode.label", { ns: "map" })}
              </Label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {myNodeNum
                  ? t("waypointDialog.lockToNode.description", { ns: "map" })
                  : t("waypointDialog.lockToNode.unavailable", {
                      ns: "map",
                    })}
              </p>
            </div>
            <Switch
              checked={lockToMyNode}
              disabled={!myNodeNum}
              onCheckedChange={setLockToMyNode}
            />
          </div>

          <div className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900/60">
            <p className="font-medium">
              {t("waypointDialog.coordinates.label", { ns: "map" })}
            </p>
            <p className="mt-1 text-slate-600 dark:text-slate-300">
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("waypointDialog.cancel", { ns: "map" })}
          </Button>
          <Button disabled={isSubmitting} onClick={handleSubmit}>
            {t("waypointDialog.submit", { ns: "map" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
