/**
 * Trie (prefix tree) for fast prefix search across notes and concepts.
 *
 * Each terminal node stores the set of document/record ids that contain the
 * indexed word, enabling O(prefix length) lookups for typeahead search.
 */
class TrieNode {
  children = new Map<string, TrieNode>();
  ids = new Set<string>();
  isWord = false;
}

export class Trie {
  private root = new TrieNode();

  insert(word: string, id: string) {
    const w = word.toLowerCase().trim();
    if (!w) return;
    let node = this.root;
    for (const ch of w) {
      let next = node.children.get(ch);
      if (!next) {
        next = new TrieNode();
        node.children.set(ch, next);
      }
      node = next;
    }
    node.isWord = true;
    node.ids.add(id);
  }

  /** Index a free-text blob under an id by tokenizing into words. */
  index(text: string, id: string) {
    for (const token of tokenize(text)) this.insert(token, id);
  }

  /** Return ids of records containing any word with the given prefix. */
  search(prefix: string): string[] {
    const p = prefix.toLowerCase().trim();
    if (!p) return [];
    let node = this.root;
    for (const ch of p) {
      const next = node.children.get(ch);
      if (!next) return [];
      node = next;
    }
    const ids = new Set<string>();
    this.collect(node, ids);
    return [...ids];
  }

  has(word: string): boolean {
    const w = word.toLowerCase().trim();
    let node = this.root;
    for (const ch of w) {
      const next = node.children.get(ch);
      if (!next) return false;
      node = next;
    }
    return node.isWord;
  }

  private collect(node: TrieNode, acc: Set<string>) {
    if (node.isWord) for (const id of node.ids) acc.add(id);
    for (const child of node.children.values()) this.collect(child, acc);
  }
}

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9'-]*/g) ?? []).filter(
    (t) => t.length > 1
  );
}
