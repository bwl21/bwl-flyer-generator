// TemplateSetStorageEngine Interface und Basis-Implementierung

import type { TemplateSet } from '../types/flyer'

export interface TemplateSetStorageEngine {
  listTemplateSets(): Promise<string[]>;
  loadTemplateSet(name: string): Promise<TemplateSet | null>;
  saveTemplateSet(set: TemplateSet): Promise<void>;
  deleteTemplateSet(name: string): Promise<void>;
  renameTemplateSet(oldName: string, newName: string): Promise<void>;
  getActiveTemplateSet(): Promise<string | null>;
  setActiveTemplateSet(name: string): Promise<void>;
}

// Beispiel: LocalStorage-Implementierung
export class LocalStorageTemplateSetEngine implements TemplateSetStorageEngine {
  private readonly prefix = 'templateSet_';
  private readonly activeKey = 'activeTemplateSet';

  async listTemplateSets(): Promise<string[]> {
    const keys = Object.keys(localStorage)
      .filter(k => k.startsWith(this.prefix))
      .map(k => k.substring(this.prefix.length));
    return keys;
  }

  async loadTemplateSet(name: string): Promise<TemplateSet | null> {
    const raw = localStorage.getItem(this.prefix + name);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as TemplateSet;
    } catch {
      return null;
    }
  }

  async saveTemplateSet(set: TemplateSet): Promise<void> {
    localStorage.setItem(this.prefix + set.name, JSON.stringify(set));
  }

  async deleteTemplateSet(name: string): Promise<void> {
    localStorage.removeItem(this.prefix + name);
    // Falls das gelöschte Set aktiv war, aktives Set zurücksetzen
    const active = await this.getActiveTemplateSet();
    if (active === name) {
      localStorage.removeItem(this.activeKey);
    }
  }

  async renameTemplateSet(oldName: string, newName: string): Promise<void> {
    const set = await this.loadTemplateSet(oldName);
    if (!set) return;
    set.name = newName;
    await this.saveTemplateSet(set);
    await this.deleteTemplateSet(oldName);
  }

  async getActiveTemplateSet(): Promise<string | null> {
    return localStorage.getItem(this.activeKey);
  }

  async setActiveTemplateSet(name: string): Promise<void> {
    localStorage.setItem(this.activeKey, name);
  }
}

// Service-Wrapper für flexible Engine-Auswahl
export class TemplateSetStorageService {
  private engine: TemplateSetStorageEngine

  constructor(engine: TemplateSetStorageEngine) {
    this.engine = engine
  }

  listTemplateSets() {
    return this.engine.listTemplateSets();
  }
  loadTemplateSet(name: string) {
    return this.engine.loadTemplateSet(name);
  }
  saveTemplateSet(set: TemplateSet) {
    return this.engine.saveTemplateSet(set);
  }
  deleteTemplateSet(name: string) {
    return this.engine.deleteTemplateSet(name);
  }
  renameTemplateSet(oldName: string, newName: string) {
    return this.engine.renameTemplateSet(oldName, newName);
  }
  getActiveTemplateSet() {
    return this.engine.getActiveTemplateSet();
  }
  setActiveTemplateSet(name: string) {
    return this.engine.setActiveTemplateSet(name);
  }
}

// Beispiel-Instanz für LocalStorage
export const templateSetStorage = new TemplateSetStorageService(new LocalStorageTemplateSetEngine());
