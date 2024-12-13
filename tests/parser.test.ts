import { load as parseYaml } from "js-yaml";
import { describe, it, expect, vi } from "vitest";

// Mock needs to be before importing the module that uses it
vi.mock("obsidian", () => ({
  parseYaml,
}));

// Import after mock is defined
import { parseFrontmatter, parseContent } from "../src/parser";
import { vietnameseNote, expectedFlashcards } from "./fixtures";

describe("parseFrontmatter", () => {
  it("should parse valid frontmatter correctly", () => {
    const content = String.raw`---
ankiDeck: VN Study List 1
ankiNoteType: Vietnamese
ankiFieldMappings:
  Front: Front
  Back: Back
  Usage: Usage
  Example: Example
  Context: Context
---
Some content here`;
    const result = parseFrontmatter(content);
    expect(result).toEqual({
      ankiDeck: "VN Study List 1",
      ankiNoteType: "Vietnamese",
      ankiFieldMappings: {
        Front: "Front",
        Back: "Back",
        Usage: "Usage",
        Example: "Example",
        Context: "Context",
      },
    });
  });

  it("should return undefined for missing frontmatter markers", () => {
    const content = String.raw`ankiDeck: VN Study List 1
ankiNoteType: Vietnamese`;
    const result = parseFrontmatter(content);
    expect(result).toBeUndefined();
  });

  it("should return undefined for empty frontmatter", () => {
    const content = String.raw`---
---
Some content here`;
    const result = parseFrontmatter(content);
    expect(result).toBeUndefined();
  });

  it("should return undefined for invalid YAML format", () => {
    const content = String.raw`---
[]: invalid yaml
this is not valid: : : :
  - unbalanced brackets: [
---
Some content here`;
    const result = parseFrontmatter(content);
    expect(result).toBeUndefined();
  });

  it("should return undefined for non-Anki frontmatter", () => {
    const content = String.raw`---
title: Some Title
date: 2021-01-01
tags: [test]
---
Some content here`;
    const result = parseFrontmatter(content);
    expect(result).toBeUndefined();
  });

  it("should return undefined for invalid ankiFieldMappings type", () => {
    const content = String.raw`---
ankiDeck: Test Deck
ankiFieldMappings: not an object
---
Some content here`;
    const result = parseFrontmatter(content);
    expect(result).toBeUndefined();
  });
});

describe("parseContent", () => {
  const availableFields = ["Front", "Back", "Usage", "Example", "Context"];
  // Only Front and Back fields are required. The rest are optional.
  const validFieldMappings = {
    Front: "Front",
    Back: "Back",
    Usage: "Usage",
    Example: "Example",
    Context: "Context",
  };

  it("should parse content into flashcards correctly", () => {
    const flashcards = parseContent(
      vietnameseNote,
      validFieldMappings,
      availableFields,
    );
    expect(flashcards).toEqual(expectedFlashcards);
  });

  it("should handle invalid field mappings", () => {
    const invalidFieldMappings = {
      Front: "InvalidField",
      Back: "Back",
    };
    const flashcards = parseContent(
      vietnameseNote,
      invalidFieldMappings,
      availableFields,
    );
    expect(flashcards).toHaveLength(0);
  });

  it("should handle empty field mappings", () => {
    const flashcards = parseContent(vietnameseNote, {}, availableFields);
    expect(flashcards).toHaveLength(0);
  });

  it("should parse content with missing optional fields", () => {
    const content = String.raw`### **Front: Hello**
**Back:** Xin chào
-   Usage: Common greeting`;

    const flashcards = parseContent(
      content,
      validFieldMappings,
      availableFields,
    );
    expect(flashcards).toHaveLength(1);
    expect(flashcards[0]).toEqual({
      Front: "Hello",
      Back: "Xin chào",
      Usage: "Common greeting",
    });
  });
});
