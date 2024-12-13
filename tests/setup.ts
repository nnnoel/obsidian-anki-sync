import { App, MarkdownView, Plugin } from "obsidian";
import { vi } from "vitest";

// Mock the App class
vi.mock("obsidian", () => {
  const App = vi.fn().mockImplementation(() => ({
    workspace: {
      on: vi.fn(),
      off: vi.fn(),
      getActiveViewOfType: vi.fn(),
    },
    vault: {
      getConfig: vi.fn(),
      setConfig: vi.fn(),
    },
  }));

  const MarkdownView = vi.fn();
  const Plugin = vi.fn();
  const PluginSettingTab = vi.fn();
  const Setting = vi.fn().mockImplementation(() => ({
    setName: vi.fn().mockReturnThis(),
    setDesc: vi.fn().mockReturnThis(),
    addText: vi.fn().mockReturnThis(),
  }));
  const Notice = vi.fn();

  return {
    App,
    MarkdownView,
    Plugin,
    PluginSettingTab,
    Setting,
    Notice,
  };
});

export { App, MarkdownView, Plugin };
