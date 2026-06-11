"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Save } from "lucide-react";
import { SettingsPanel } from "@/components/settings-panel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  appSettingsUpdatedEvent,
  defaultAppSettings,
  readAppSettings,
  writeAppSettings,
  type AppSettings,
} from "@/lib/app-settings";

type BooleanSettingKey = Exclude<keyof AppSettings, "reportDepth">;

const dataSourceSettings: Array<{
  key: BooleanSettingKey;
  label: string;
  description: string;
  note: string;
}> = [
  {
    key: "amapDataEnabled",
    label: "地图通勤免费额度",
    description: "用于估算地铁、公交、步行、骑行通勤和周边生活信息。",
    note: "关闭后，不会再调用高德地图服务，通勤和周边信息会按你填写的内容估算。",
  },
  {
    key: "weatherDataEnabled",
    label: "天气与环境开放数据",
    description: "用于判断潮湿、高温、雨天通勤、空气质量等居住舒适度。",
    note: "关闭后，天气判断会改用城市气候常识，不再读取实时天气。",
  },
  {
    key: "officialPromptEnabled",
    label: "官方查询入口提示",
    description: "引导用户自行确认权属、备案、合同示范文本和公共服务信息。",
    note: "关闭后，报告不再额外提醒官方入口，但基础合同确认仍保留。",
  },
];

const privacySettings: Array<{
  key: BooleanSettingKey;
  label: string;
  description: string;
  note: string;
}> = [
  {
    key: "saveReportHistory",
    label: "保存报告历史",
    description: "评估保存后保存为房源记录，用于工作台、对比和签约前确认。",
    note: "关闭后，报告只保留在当前浏览器会话里。",
  },
  {
    key: "maskSensitiveInfo",
    label: "隐藏截图敏感信息",
    description: "展示报告时弱化手机号、门牌号等敏感信息。",
    note: "手机号、邮箱、门牌号和房间号会在展示时弱化。",
  },
  {
    key: "personalizationEnabled",
    label: "允许用于个人偏好优化",
    description: "仅用于你的后续报告排序和建议。",
    note: "开启后，后续评估会更重视你的长期偏好和看房重点。",
  },
];

export function AppBehaviorSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultAppSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    function refreshSettings() {
      setSettings(readAppSettings());
      setSaved(false);
    }

    refreshSettings();
    window.addEventListener(appSettingsUpdatedEvent, refreshSettings);
    window.addEventListener("storage", refreshSettings);
    window.addEventListener("focus", refreshSettings);

    return () => {
      window.removeEventListener(appSettingsUpdatedEvent, refreshSettings);
      window.removeEventListener("storage", refreshSettings);
      window.removeEventListener("focus", refreshSettings);
    };
  }, []);

  function updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSaved(false);
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function saveSettings() {
    writeAppSettings(settings);
    setSaved(true);
  }

  return (
    <>
      <SettingsPanel
        title="评估设置"
        description="这些设置决定房源评估的细致程度，以及是否整理你主动上传的截图。"
      >
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="report-depth">评估细致程度</Label>
            <select
              id="report-depth"
              value={settings.reportDepth}
              onChange={(event) =>
                updateSetting("reportDepth", event.target.value as AppSettings["reportDepth"])
              }
              className="h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="standard">标准评估</option>
              <option value="deep-risk">重点看风险</option>
              <option value="pre-sign">签约前确认</option>
            </select>
          </div>
          <ToggleRow
            checked={settings.screenshotExtractionEnabled}
            label="从截图里读取房源信息"
            description="从你主动上传的房源截图中读取租金、面积、位置和费用说明。"
            note="关闭后仍可上传截图作为参考，但不会从截图里读取信息。"
            onCheckedChange={(value) => updateSetting("screenshotExtractionEnabled", value)}
          />
        </div>
      </SettingsPanel>

      <SettingsPanel
        title="数据源设置"
        description="只使用免费额度、开放数据和你主动上传的信息；不抓取租房平台数据。"
      >
        <div className="grid gap-3">
          {dataSourceSettings.map((item) => (
            <ToggleRow
              key={item.key}
              checked={Boolean(settings[item.key])}
              label={item.label}
              description={item.description}
              note={item.note}
              onCheckedChange={(value) => updateSetting(item.key, value)}
            />
          ))}
        </div>
      </SettingsPanel>

      <SettingsPanel
        title="隐私设置"
        description="房源截图、地址、合同和付款信息都按最小化保存原则留存。"
      >
        <div className="grid gap-3">
          {privacySettings.map((item) => (
            <ToggleRow
              key={item.key}
              checked={Boolean(settings[item.key])}
              label={item.label}
              description={item.description}
              note={item.note}
              onCheckedChange={(value) => updateSetting(item.key, value)}
            />
          ))}
        </div>
      </SettingsPanel>

      <div className="lg:col-span-2">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">评估与隐私设置</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              保存后会立即影响后续评估；已有报告不会被重写。
            </p>
          </div>
          <Button type="button" onClick={saveSettings}>
            {saved ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
            {saved ? "已保存" : "保存设置"}
          </Button>
        </div>
      </div>
    </>
  );
}

function ToggleRow({
  checked,
  label,
  description,
  note,
  onCheckedChange,
}: {
  checked: boolean;
  label: string;
  description: string;
  note: string;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-secondary p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        <p className="mt-2 text-[11px] leading-5 text-primary/80">{note}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
