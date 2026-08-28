import type { SettingDefinitionItem } from "obsidian";
import {
  DEFAULT_SETTINGS,
  type CanvasFoldingSettings,
} from "./settings-data";

type CanvasFoldingSettingKey = keyof CanvasFoldingSettings;

export function getCanvasFoldingSettingDefinitions(
  openPersistedCanvasStates: () => void = () => {},
  showLastUpdate: () => void = () => {},
): SettingDefinitionItem<CanvasFoldingSettingKey>[] {
  return [
    {
      name: "Canvas files are never modified",
      desc: "Canvas Folding changes only the current view. It never writes folding state, layout, or other data to your .canvas files.",
      searchable: false,
    },
    {
      type: "group",
      heading: "Behavior",
      items: [
        {
          name: "Show canvas toolbar initially",
          desc: "Show the Canvas Folding command toolbar when the plugin loads. Use the command palette to show, hide, or toggle it at any time.",
          control: {
            type: "toggle",
            key: "showCanvasToolbar",
            defaultValue: DEFAULT_SETTINGS.showCanvasToolbar,
          },
        },
        {
          name: "Show branch controls initially",
          desc: "Set the initial visibility of folding controls when Canvas Folding loads. Collapsed branches show their hidden-node count. Use the command palette or Canvas toolbar to change them at any time.",
          control: {
            type: "toggle",
            key: "showBranchControls",
            defaultValue: DEFAULT_SETTINGS.showBranchControls,
          },
        },
        {
          name: "Show focus controls initially",
          desc: "Show a focus control on every non-group node, including nodes without children. Use the command palette or Canvas toolbar to change them at any time.",
          control: {
            type: "toggle",
            key: "showFocusControls",
            defaultValue: DEFAULT_SETTINGS.showFocusControls,
          },
        },
        {
          name: "Background opacity during branch focus",
          desc: "Set the opacity of nodes and edges outside the focused branch.",
          control: {
            type: "slider",
            key: "focusBackgroundOpacity",
            defaultValue: DEFAULT_SETTINGS.focusBackgroundOpacity,
            min: 5,
            max: 60,
            step: 5,
            displayFormat: (value) => `${value}%`,
          },
        },
        {
          name: "Remember canvas states between sessions",
          desc: "Canvas Folding remembers states in each open tab for back navigation. Enable this to also restore them in newly opened tabs and after Obsidian or the plugin restarts. Canvas files remain unchanged.",
          control: {
            type: "toggle",
            key: "rememberCanvasStates",
            defaultValue: DEFAULT_SETTINGS.rememberCanvasStates,
          },
        },
        {
          name: "Show status notices",
          desc: "Show confirmations after Canvas Folding actions.",
          control: {
            type: "toggle",
            key: "showStatusNotices",
            defaultValue: DEFAULT_SETTINGS.showStatusNotices,
          },
        },
      ],
    },
    {
      type: "group",
      heading: "Persisted canvas states",
      items: [
        {
          name: "Manage persisted canvas states",
          desc: "Review or remove folding states stored for restoration between sessions.",
          render: (setting) => {
            setting.addButton((button) => {
              button
                .setButtonText("Manage")
                .onClick(openPersistedCanvasStates);
            });
          },
        },
      ],
    },
    {
      type: "group",
      heading: "Diagnostics",
      items: [
        {
          name: "Debug logging",
          desc: "Write Canvas Folding diagnostics to the developer console.",
          control: {
            type: "toggle",
            key: "debugLogging",
            defaultValue: DEFAULT_SETTINGS.debugLogging,
          },
        },
      ],
    },
    {
      type: "group",
      heading: "About",
      items: [
        {
          name: "Last update",
          desc: "Review the features and usage notes for version 1.1.0.",
          render: (setting) => {
            setting.addButton((button) => {
              button
                .setButtonText("Show last update")
                .onClick(showLastUpdate);
            });
          },
        },
      ],
    },
  ];
}
