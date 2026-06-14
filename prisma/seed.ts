import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";
import { getAIProvider } from "../src/lib/ai";
import { knowledgeRepo } from "../src/lib/repositories/knowledge";
import { cardRepo } from "../src/lib/repositories/cards";
import { noteRepo } from "../src/lib/repositories/notes";
import type { ConceptContext } from "../src/lib/ai/types";

const SAMPLE = `Big-O Notation
Big-O notation describes the upper bound on the growth rate of an algorithm's running time as the input size increases. It lets us compare algorithms independently of hardware. Constant time O(1) does not grow with input. Linear time O(n) grows proportionally. Quadratic time O(n^2) grows with the square of the input and is common in naive nested loops. Understanding Big-O is essential for reasoning about scalability.

Arrays
An array is a contiguous block of memory storing elements of the same type. Accessing an element by index is O(1) because the address can be computed directly. Insertion and deletion in the middle are O(n) because elements must be shifted. Arrays are cache-friendly due to locality of reference.

Linked Lists
A linked list is a linear data structure where each node stores a value and a reference to the next node. Insertion and deletion at the head are O(1). However, random access is O(n) because the list must be traversed from the start. Linked lists trade locality for flexible insertion.

Stacks
A stack is a last-in, first-out (LIFO) data structure. The key operations are push, which adds an element to the top, and pop, which removes the top element. Stacks are used for function call management, expression evaluation, and backtracking algorithms. Both push and pop are O(1).

Queues
A queue is a first-in, first-out (FIFO) data structure. Enqueue adds to the back and dequeue removes from the front. Queues are fundamental to breadth-first search and scheduling. A circular buffer implements a queue efficiently with O(1) operations.

Hash Tables
A hash table maps keys to values using a hash function that converts a key into an array index. Average-case lookup, insertion, and deletion are O(1). Collisions occur when two keys hash to the same index and are resolved by chaining or open addressing. A good hash function distributes keys uniformly to minimize collisions.

Binary Search Trees
A binary search tree is a tree where each node's left subtree contains smaller keys and the right subtree contains larger keys. Search, insertion, and deletion are O(log n) on a balanced tree but degrade to O(n) when the tree becomes unbalanced. Self-balancing trees like AVL and red-black trees guarantee logarithmic height.

Graph Traversal
Graph traversal visits every vertex in a graph. Breadth-first search explores neighbors level by level using a queue and finds shortest paths in unweighted graphs. Depth-first search explores as far as possible along each branch using a stack or recursion. Both run in O(V + E) time.`;

function termsOf(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

async function main() {
  const email = "demo@axom.app";
  const password = "Demo1234";

  await prisma.user.deleteMany({ where: { email } });

  const user = await prisma.user.create({
    data: {
      email,
      name: "Demo Student",
      passwordHash: await hashPassword(password),
    },
  });

  const examDate = new Date(Date.now() + 12 * 86_400_000);
  const course = await prisma.course.create({
    data: {
      userId: user.id,
      title: "Data Structures & Algorithms",
      code: "CS 2110",
      color: "#7c6cff",
      examDate,
    },
  });

  const doc = await prisma.document.create({
    data: {
      userId: user.id,
      courseId: course.id,
      title: "Lecture Pack — Core Data Structures",
      kind: "slides",
      mimeType: "text/plain",
      sizeBytes: SAMPLE.length,
      contentText: SAMPLE,
      pageCount: 9,
      status: "processing",
    },
  });

  console.log("Extracting concepts…");
  const ai = getAIProvider();
  const { concepts, edges } = await ai.extractConcepts(SAMPLE, { maxConcepts: 24 });
  const nodes = await knowledgeRepo.createNodes(course.id, doc.id, concepts);

  const idByLabel = new Map(nodes.map((n) => [n.label.toLowerCase(), n.id]));
  const edgeRecords = [];
  for (const e of edges) {
    const fromId = idByLabel.get(e.fromLabel.toLowerCase());
    const toId = idByLabel.get(e.toLabel.toLowerCase());
    if (fromId && toId) edgeRecords.push({ fromId, toId, relation: e.relation, weight: e.weight });
  }
  await knowledgeRepo.createEdges(course.id, edgeRecords);

  const contexts: ConceptContext[] = nodes.map((n) => ({
    label: n.label,
    summary: n.summary,
    keyTerms: termsOf(n.keyTerms),
    difficulty: n.difficulty,
    sourceText: n.summary,
  }));
  const cards = await ai.generateCards(contexts);
  const cardCount = await cardRepo.createMany(
    course.id,
    cards.map((c) => ({
      front: c.front,
      back: c.back,
      kind: c.kind,
      nodeId: c.conceptLabel ? idByLabel.get(c.conceptLabel.toLowerCase()) ?? null : null,
    }))
  );
  await prisma.document.update({ where: { id: doc.id }, data: { status: "ready" } });
  console.log(`  → ${nodes.length} concepts, ${cardCount} cards.`);

  console.log("Generating Cornell notes…");
  const contentMd = await ai.generateNotes(contexts, "cornell", course.title);
  await noteRepo.create({
    courseId: course.id,
    documentId: doc.id,
    title: `${course.title} — Cornell Notes`,
    style: "cornell",
    contentMd,
    meta: { conceptCount: contexts.length, provider: ai.name },
  });

  // Make cards due now so the review screen has content.
  await prisma.card.updateMany({
    where: { courseId: course.id },
    data: { dueAt: new Date(Date.now() - 3600_000) },
  });

  console.log("\nSeed complete.");
  console.log("  Login:", email);
  console.log("  Password:", password);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
