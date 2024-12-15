import { parseYaml } from "obsidian";

interface AnkiFrontmatter {
  ankiDeck: string;
  ankiNoteType: string;
  ankiFieldMappings: Record<string, string>;
}

export function parseFrontmatter(content: string): AnkiFrontmatter | undefined {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return;

  try {
    const yaml = parseYaml(match[1]);

    if (
      typeof yaml === 'object' &&
      yaml?.ankiDeck &&
      yaml?.ankiNoteType &&
      yaml?.ankiFieldMappings &&
      typeof yaml.ankiFieldMappings === 'object'
    ) {
      return {
        ankiDeck: yaml.ankiDeck,
        ankiNoteType: yaml.ankiNoteType,
        ankiFieldMappings: yaml.ankiFieldMappings,
      };
    }
  } catch {
    // ignore parsing errors
  }

  return;
}


type FieldMap = { [key: string]: string };

function extractFieldsFromText(fields: string[], text: string): FieldMap[] {
  // Join the fields dynamically into a regex group, allowing optional bold/italic markdown
  const fieldsPattern = fields.map(field => `\\*{0,2}${field}\\*{0,2}`).join('|');

  // Construct the regex dynamically to match fields and their values
  const pattern = new RegExp(
    `(${fieldsPattern}):\\s*((?:(?!(${fieldsPattern}):).|\\n)*)`,
    'g'
  );

  const matches = [...text.matchAll(pattern)];

  // Initialize the result
  const entries: FieldMap[] = [];
  let currentEntry: FieldMap = {};

  matches.forEach((match, index) => {
    const rawField = match[1]; // Captures the raw field name
    const field = rawField.replace(/^\**|\**$/g, ''); // Remove surrounding asterisks
    const value = match[2].trim(); // Captures the field value and trims whitespace

    currentEntry[field] = value;

    // If it's the last match or the next match starts a new 'Front', push the current entry
    const nextMatch = matches[index + 1];
    if (!nextMatch || nextMatch[1].replace(/^\**|\**$/g, '') === fields[0]) {
      entries.push(currentEntry);
      currentEntry = {};
    }
  });

  return entries.map(entry => {
    // Clean up any trailing dashes or asterisks in the values
    const cleanedEntry: FieldMap = {};
    for (const key in entry) {
      // Clean up any trailing or leading asterisks and any trailing dashes
      cleanedEntry[key] = entry[key]
        .replace(/^\**|\**$/g, '')   // remove leading and trailing asterisks
        .replace(/[-]\s*$/g, '')      // remove trailing dashes, if needed
        .trim();

    }
    return cleanedEntry;
  });
}

function markdownToHtml(markdown: string): string {
  const lines = markdown.split('\n');

  let htmlContent = '';
  let inOrderedList = false;
  let inUnorderedList = false;

  const isOrderedItem = (line: string) => /^\d+\.\s+/.test(line.trim());
  const isUnorderedItem = (line: string) => /^[-*]\s+/.test(line.trim());

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '') {
      // Empty line: close lists if needed
      if (inOrderedList) {
        htmlContent += '</ol>\n';
        inOrderedList = false;
      }
      if (inUnorderedList) {
        htmlContent += '</ul>\n';
        inUnorderedList = false;
      }
      continue;
    }

    if (isOrderedItem(line)) {
      // It's an ordered list item
      if (!inOrderedList) {
        // Close unordered list if we were in one
        if (inUnorderedList) {
          htmlContent += '</ul>\n';
          inUnorderedList = false;
        }
        htmlContent += '<ol>\n';
        inOrderedList = true;
      }
      const itemContent = line.trim().replace(/^\d+\.\s+/, '');
      htmlContent += `  <li>${itemContent}`;
      // Peek at next lines to see if they should be appended to this <li>
      // We'll close the <li> when we reach another list item or non-list line
      let j = i + 1;
      while (j < lines.length && lines[j].trim() !== '' && !isOrderedItem(lines[j]) && !isUnorderedItem(lines[j]) && !/^[A-Za-z]+:/.test(lines[j])) {
        // Append this line to the current <li>
        htmlContent += ' ' + lines[j].trim();
        j++;
      }
      htmlContent += '</li>\n';
      i = j - 1; // advance main loop
    } else if (isUnorderedItem(line)) {
      // It's an unordered list item
      if (!inUnorderedList) {
        // Close ordered list if we were in one
        if (inOrderedList) {
          htmlContent += '</ol>\n';
          inOrderedList = false;
        }
        htmlContent += '<ul>\n';
        inUnorderedList = true;
      }
      const itemContent = line.trim().replace(/^[-*]\s+/, '');
      htmlContent += `  <li>${itemContent}`;
      // Check following lines for continuation (similar logic as above)
      let j = i + 1;
      while (j < lines.length && lines[j].trim() !== '' && !isUnorderedItem(lines[j]) && !isOrderedItem(lines[j]) && !/^[A-Za-z]+:/.test(lines[j])) {
        htmlContent += ' ' + lines[j].trim();
        j++;
      }
      htmlContent += '</li>\n';
      i = j - 1;
    } else {
      // Regular line (not a list)
      // Close any open lists
      if (inOrderedList) {
        htmlContent += '</ol>\n';
        inOrderedList = false;
      }
      if (inUnorderedList) {
        htmlContent += '</ul>\n';
        inUnorderedList = false;
      }
      htmlContent += line + '\n';
    }
  }

  // Close any remaining lists
  if (inOrderedList) htmlContent += '</ol>\n';
  if (inUnorderedList) htmlContent += '</ul>\n';

  // Apply markdown formatting: bold, italic (*...*, _..._)
  htmlContent = htmlContent.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  htmlContent = htmlContent.replace(/\*(.*?)\*/g, '<i>$1</i>');
  htmlContent = htmlContent.replace(/_(.*?)_/g, '<i>$1</i>');

  return htmlContent.replace(/’/g, "'").trim();
}



function convertAllMarkdownToHtml(entries: FieldMap[]): FieldMap[] {
  return entries.map(entry => {
    const newEntry: FieldMap = {};
    for (const key in entry) {
      newEntry[key] = markdownToHtml(entry[key]);
    }
    return newEntry;
  });
}

export const parseContent = (
  content: string,
  fieldMappings: { [key: string]: string },
  availableFields: string[],
): Record<string, string>[] => {
  // Validate field mappings
  const invalidFields = Object.values(fieldMappings).filter(
    (ankiField) => !availableFields.includes(ankiField),
  );
  if (invalidFields.length > 0) {
    throw new Error(
      `Invalid field mappings: ${invalidFields.join(", ")} not found in note type`,
    );
  }

  // Get all field names that we're looking for
  const noteFields = Object.keys(fieldMappings);
  if (noteFields.length === 0) {
    console.error("No field mappings provided");
    throw new Error("No field mappings provided");
  }

  const contentWithoutFrontmatter = content.replace(
    /^---\n[\s\S]*?\n---\n/,
    "",
  );

  const fieldMap = extractFieldsFromText(noteFields, contentWithoutFrontmatter);

  const result = convertAllMarkdownToHtml(fieldMap);

  return result;
};

