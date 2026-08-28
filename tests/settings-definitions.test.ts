import assert from "node:assert/strict";
import test from "node:test";

import type { ButtonComponent, Setting, SettingGroup } from "obsidian";

import { getCanvasFoldingSettingDefinitions } from "../src/settings-definitions";

void test("starts settings with a non-destructive Canvas notice", () => {
  const definitions = getCanvasFoldingSettingDefinitions();
  const notice = definitions[0];
  assert.ok(notice !== undefined && !("type" in notice));
  assert.equal(notice.name, "Canvas files are never modified");
  if (typeof notice.desc !== "string") {
    assert.fail("The Canvas safety notice must use a text description.");
  }
  assert.match(notice.desc, /never writes.*\.canvas files/i);
});

void test("orders behavior settings by the user workflow", () => {
  const definitions = getCanvasFoldingSettingDefinitions();
  const behavior = definitions[1];
  assert.ok(behavior !== undefined && "type" in behavior);
  assert.equal(behavior.type, "group");
  assert.deepEqual(
    behavior.items?.map((item) => item.name),
    [
      "Show canvas toolbar initially",
      "Show branch controls initially",
      "Show focus controls initially",
      "Background opacity during branch focus",
      "Remember canvas states between sessions",
      "Show status notices",
    ],
  );
});

void test("exposes one persisted-state manager action", () => {
  let openCount = 0;
  const definitions = getCanvasFoldingSettingDefinitions(() => {
    openCount += 1;
  });
  const persisted = definitions[2];
  assert.ok(persisted !== undefined && "type" in persisted);
  assert.equal(persisted.type, "group");
  assert.deepEqual(
    persisted.items?.map((item) => item.name),
    ["Manage persisted canvas states"],
  );

  const item = persisted.items?.[0];
  assert.ok(item !== undefined && "render" in item);
  assert.equal(typeof item.render, "function");

  const button = new FakeButton();
  const setting = {
    addButton: (configure: (component: ButtonComponent) => unknown) => {
      configure(button as unknown as ButtonComponent);
      return setting;
    },
  } as unknown as Setting;
  item.render?.(setting, {} as SettingGroup);
  assert.equal(button.text, "Manage");
  assert.equal(button.disabled, false);
  button.click?.();
  assert.equal(openCount, 1);
});

class FakeButton {
  click: (() => void) | null = null;
  disabled = false;
  text = "";

  setButtonText(text: string): this {
    this.text = text;
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.disabled = disabled;
    return this;
  }

  onClick(click: () => void): this {
    this.click = click;
    return this;
  }
}
