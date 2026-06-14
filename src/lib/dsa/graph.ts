/**
 * Directed graph utilities for the per-course knowledge graph.
 *
 * Nodes are concepts; edges encode "prerequisite" / "related" relations.
 * Used to order learning (teach prerequisites first) and to propagate
 * weakness to dependent concepts.
 */
export interface GraphEdge {
  from: string;
  to: string;
  relation: "prerequisite" | "related";
  weight: number;
}

export class KnowledgeGraph {
  private adjacency = new Map<string, GraphEdge[]>();
  private nodes = new Set<string>();

  addNode(id: string) {
    this.nodes.add(id);
    if (!this.adjacency.has(id)) this.adjacency.set(id, []);
  }

  addEdge(edge: GraphEdge) {
    this.addNode(edge.from);
    this.addNode(edge.to);
    this.adjacency.get(edge.from)!.push(edge);
  }

  neighbors(id: string): GraphEdge[] {
    return this.adjacency.get(id) ?? [];
  }

  /**
   * Kahn's algorithm over prerequisite edges. Returns a learning order where
   * prerequisites precede dependents. Falls back gracefully on cycles by
   * appending any remaining nodes (stable, never throws).
   */
  topologicalOrder(): string[] {
    const indegree = new Map<string, number>();
    for (const id of this.nodes) indegree.set(id, 0);
    for (const edges of this.adjacency.values()) {
      for (const e of edges) {
        if (e.relation !== "prerequisite") continue;
        indegree.set(e.to, (indegree.get(e.to) ?? 0) + 1);
      }
    }

    const queue: string[] = [];
    for (const [id, deg] of indegree) if (deg === 0) queue.push(id);
    queue.sort();

    const order: string[] = [];
    const seen = new Set<string>();
    while (queue.length) {
      const id = queue.shift()!;
      if (seen.has(id)) continue;
      seen.add(id);
      order.push(id);
      for (const e of this.adjacency.get(id) ?? []) {
        if (e.relation !== "prerequisite") continue;
        const d = (indegree.get(e.to) ?? 1) - 1;
        indegree.set(e.to, d);
        if (d <= 0 && !seen.has(e.to)) queue.push(e.to);
      }
      queue.sort();
    }

    // Append nodes left out by cycles to guarantee completeness.
    for (const id of this.nodes) if (!seen.has(id)) order.push(id);
    return order;
  }

  /**
   * Spread a weakness signal from a struggling concept to the concepts that
   * depend on it (BFS with decaying weight). Returns id -> propagated weight.
   */
  propagateWeakness(rootId: string, decay = 0.6): Map<string, number> {
    const result = new Map<string, number>();
    const queue: { id: string; weight: number }[] = [{ id: rootId, weight: 1 }];
    while (queue.length) {
      const { id, weight } = queue.shift()!;
      if (weight < 0.1) continue;
      const prev = result.get(id) ?? 0;
      if (weight <= prev) continue;
      result.set(id, weight);
      for (const e of this.neighbors(id)) {
        queue.push({ id: e.to, weight: weight * decay * e.weight });
      }
    }
    return result;
  }
}
