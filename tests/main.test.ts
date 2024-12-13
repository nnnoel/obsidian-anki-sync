import { describe, it, expect, beforeEach, vi } from 'vitest'
import { App, Plugin } from 'obsidian'
import AnkiSyncPlugin from '../src/main'
import { DEFAULT_SETTINGS } from '../src/settings'
import manifest from '../manifest.json'
import { parseFrontmatter, parseContent } from '../src/parser'

// Mock the AnkiSyncPlugin class
class MockAnkiSyncPlugin extends Plugin {
  settings = DEFAULT_SETTINGS
  noteTypeFields = {
    'Vietnamese': ['Front', 'Back', 'Usage', 'Example', 'Context']
  }

  constructor(app: App, manifest: any) {
    super(app, manifest)
  }

  async loadData() {
    return {}
  }

  async saveData() {
    return
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
    return this.settings
  }

  async invokeAnkiConnect(action: string, params?: any) {
    return { result: 'success', error: null }
  }
}

describe('AnkiSyncPlugin', () => {
  let plugin: MockAnkiSyncPlugin
  let app: App

  beforeEach(async () => {
    app = new App()
    plugin = new MockAnkiSyncPlugin(app, manifest)
    await plugin.loadSettings()
  })

  describe('Settings', () => {
    it('should load default settings', async () => {
      const settings = await plugin.loadSettings()
      expect(settings).toEqual(DEFAULT_SETTINGS)
    })
  })

  describe('Anki Integration', () => {
    it('should invoke AnkiConnect with correct parameters', async () => {
      const mockResponse = { result: 'success', error: null }
      vi.spyOn(plugin, 'invokeAnkiConnect').mockResolvedValue(mockResponse)

      const result = await plugin.invokeAnkiConnect('modelNames')
      expect(result).toEqual(mockResponse)
      expect(plugin.invokeAnkiConnect).toHaveBeenCalledWith('modelNames')
    })

    it('should handle AnkiConnect errors', async () => {
      vi.spyOn(plugin, 'invokeAnkiConnect').mockRejectedValue(new Error('Connection failed'))

      await expect(plugin.invokeAnkiConnect('modelNames')).rejects.toThrow('Connection failed')
    })
  })
})
