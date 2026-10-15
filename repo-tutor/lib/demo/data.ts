import type {
  Repository,
  Course,
  Lesson,
  Quiz,
  TreeNode,
  FileExplanation,
  CodeSnippet,
} from "../types";

export const DEMO_REPOSITORIES: Repository[] = [
  {
    id: "facebook-react",
    owner: "facebook",
    name: "react",
    fullName: "facebook/react",
    description: "The library for web and native user interfaces. Build UI from pieces called components.",
    stars: 228000,
    language: "JavaScript",
    topics: ["javascript", "ui", "declarative", "components"],
    category: "frontend",
    githubUrl: "https://github.com/facebook/react",
    isDemo: true,
  },
  {
    id: "vercel-next-js",
    owner: "vercel",
    name: "next.js",
    fullName: "vercel/next.js",
    description: "The React Framework for the Web. Used by some of the world's largest companies.",
    stars: 127000,
    language: "TypeScript",
    topics: ["typescript", "react", "ssr", "framework"],
    category: "fullstack",
    githubUrl: "https://github.com/vercel/next.js",
    isDemo: true,
  },
  {
    id: "expressjs-express",
    owner: "expressjs",
    name: "express",
    fullName: "expressjs/express",
    description: "Fast, unopinionated, minimalist web framework for Node.js.",
    stars: 65000,
    language: "JavaScript",
    topics: ["nodejs", "http", "server", "middleware"],
    category: "backend",
    githubUrl: "https://github.com/expressjs/express",
    isDemo: true,
  },
  {
    id: "vuejs-vue",
    owner: "vuejs",
    name: "vue",
    fullName: "vuejs/vue",
    description: "An approachable, performant and versatile framework for building web UIs.",
    stars: 207000,
    language: "TypeScript",
    topics: ["typescript", "javascript", "vue", "frontend"],
    category: "frontend",
    githubUrl: "https://github.com/vuejs/vue",
    isDemo: true,
  },
  {
    id: "fastapi-fastapi",
    owner: "fastapi",
    name: "fastapi",
    fullName: "fastapi/fastapi",
    description: "FastAPI framework, high performance, easy to learn, fast to code, ready for production.",
    stars: 78000,
    language: "Python",
    topics: ["python", "api", "rest", "async"],
    category: "backend",
    githubUrl: "https://github.com/fastapi/fastapi",
    isDemo: true,
  },
  {
    id: "remix-run-remix",
    owner: "remix-run",
    name: "remix",
    fullName: "remix-run/remix",
    description: "Build better websites. Create modern, resilient user experiences with web fundamentals.",
    stars: 30000,
    language: "TypeScript",
    topics: ["typescript", "react", "fullstack", "web"],
    category: "fullstack",
    githubUrl: "https://github.com/remix-run/remix",
    isDemo: true,
  },
];

export const DEMO_COURSES: Record<string, Course> = {
  "facebook-react": {
    repoId: "facebook-react",
    title: "Understanding React: From Components to Reconciliation",
    description: "Learn how React works under the hood — from JSX to the virtual DOM, hooks to rendering.",
    objectives: [
      "Understand React's component model and how JSX compiles",
      "Learn how React's reconciliation algorithm efficiently updates the DOM",
      "Master React hooks and the rules that make them work",
    ],
    totalLessons: 6,
    estimatedHours: 4,
    language: "english",
    skillLevel: "beginner",
    learningPath: [
      { id: "react-l1", lessonNumber: 1, title: "What is React and Why Does It Exist?", objective: "Understand the core problem React solves", estimatedMinutes: 20, status: "completed" },
      { id: "react-l2", lessonNumber: 2, title: "JSX: JavaScript That Looks Like HTML", objective: "Learn how JSX works and how Babel transforms it", estimatedMinutes: 25, status: "completed" },
      { id: "react-l3", lessonNumber: 3, title: "Components and Props", objective: "Build reusable UI components and pass data with props", estimatedMinutes: 30, status: "in_progress" },
      { id: "react-l4", lessonNumber: 4, title: "State and the useState Hook", objective: "Manage component state and trigger re-renders", estimatedMinutes: 35, status: "not_started" },
      { id: "react-l5", lessonNumber: 5, title: "Side Effects with useEffect", objective: "Handle async operations and component lifecycle", estimatedMinutes: 35, status: "not_started" },
      { id: "react-l6", lessonNumber: 6, title: "The Virtual DOM and Reconciliation", objective: "Understand how React decides what to update in the DOM", estimatedMinutes: 40, status: "not_started" },
    ],
  },
  "vercel-next-js": {
    repoId: "vercel-next-js",
    title: "Next.js Deep Dive: App Router and Modern Web Patterns",
    description: "Explore the Next.js codebase and understand server components, routing, and data fetching.",
    objectives: [
      "Understand the App Router directory structure",
      "Learn how React Server Components differ from Client Components",
      "Explore how Next.js handles data fetching and caching",
    ],
    totalLessons: 5,
    estimatedHours: 5,
    language: "english",
    skillLevel: "intermediate",
    learningPath: [
      { id: "next-l1", lessonNumber: 1, title: "Project Structure: How Next.js Organizes Itself", objective: "Navigate the Next.js monorepo and understand its structure", estimatedMinutes: 20, status: "completed" },
      { id: "next-l2", lessonNumber: 2, title: "The App Router File Conventions", objective: "Learn what page.tsx, layout.tsx, and loading.tsx do", estimatedMinutes: 25, status: "in_progress" },
      { id: "next-l3", lessonNumber: 3, title: "Server vs Client Components", objective: "Know when to use 'use client' and why it matters", estimatedMinutes: 35, status: "not_started" },
      { id: "next-l4", lessonNumber: 4, title: "Data Fetching Patterns", objective: "Master fetch, caching, and revalidation in Next.js", estimatedMinutes: 40, status: "not_started" },
      { id: "next-l5", lessonNumber: 5, title: "API Routes and Middleware", objective: "Build backend endpoints and intercept requests", estimatedMinutes: 35, status: "not_started" },
    ],
  },
  "expressjs-express": {
    repoId: "expressjs-express",
    title: "Express.js Internals: How a Web Server Works",
    description: "Trace how Express handles HTTP requests from arrival to response.",
    objectives: [
      "Understand Express's middleware chain",
      "Learn how routing works internally",
      "See how request and response objects are created",
    ],
    totalLessons: 5,
    estimatedHours: 3,
    language: "english",
    skillLevel: "beginner",
    learningPath: [
      { id: "express-l1", lessonNumber: 1, title: "What Happens When You Call express()", objective: "Trace the app creation flow from the source", estimatedMinutes: 20, status: "completed" },
      { id: "express-l2", lessonNumber: 2, title: "The Middleware Stack", objective: "Learn how app.use() builds a processing pipeline", estimatedMinutes: 25, status: "in_progress" },
      { id: "express-l3", lessonNumber: 3, title: "Routing: How URLs Get Matched", objective: "Understand the Router class and route matching logic", estimatedMinutes: 30, status: "not_started" },
      { id: "express-l4", lessonNumber: 4, title: "Request and Response Objects", objective: "Explore the req and res objects Express creates", estimatedMinutes: 25, status: "not_started" },
      { id: "express-l5", lessonNumber: 5, title: "Error Handling in Express", objective: "Learn the four-argument error handler pattern", estimatedMinutes: 20, status: "not_started" },
    ],
  },
};

export const DEMO_LESSONS: Record<string, Lesson> = {
  "react-l1": {
    id: "react-l1", repoId: "facebook-react", lessonNumber: 1,
    title: "What is React and Why Does It Exist?",
    objective: "Understand the core problem React solves",
    estimatedMinutes: 20, status: "completed",
    sections: [
      { type: "explanation", content: "Before React, building interactive UIs meant manually manipulating the DOM — a slow, error-prone process. React introduced a component model where your UI is a function of state. When state changes, React figures out the minimal set of DOM updates needed." },
      { type: "objectives", content: "By the end of this lesson you will:", items: ["Know what problem React was built to solve", "Understand what a component is", "See how React's model differs from direct DOM manipulation"] },
      { type: "code", content: "Here's the simplest possible React component:", codeSnippet: { filename: "HelloWorld.jsx", path: "examples/HelloWorld.jsx", language: "jsx", content: `function HelloWorld() {\n  return (\n    <div className="greeting">\n      <h1>Hello, World!</h1>\n      <p>This is a React component.</p>\n    </div>\n  );\n}\n\nexport default HelloWorld;` } },
      { type: "breakdown", content: "Important lines explained:", items: ["Line 1: A component is a regular JavaScript function", "Lines 3-7: JSX looks like HTML but it is JavaScript", "Line 10: React converts JSX to real DOM elements"] },
      { type: "takeaways", content: "Key takeaways:", items: ["React components are just functions that return JSX", "React manages DOM updates for you", "Components are reusable and composable"] },
      { type: "exercise", content: "Exercise: Create a component called WelcomeCard that accepts a name prop and renders a greeting message. Use it three times with different names on the same page." },
    ],
  },
  "react-l2": {
    id: "react-l2", repoId: "facebook-react", lessonNumber: 2,
    title: "JSX: JavaScript That Looks Like HTML",
    objective: "Learn how JSX works and how Babel transforms it",
    estimatedMinutes: 25, status: "completed",
    sections: [
      { type: "explanation", content: "JSX is syntactic sugar that Babel transforms into React.createElement() calls. Browsers never see JSX — it's compiled to plain JavaScript first. Understanding this transformation helps you debug confusing JSX errors." },
      { type: "objectives", content: "By the end of this lesson you will:", items: ["Know what JSX compiles to", "Understand JSX expressions and curly braces", "Avoid common JSX pitfalls"] },
      { type: "code", content: "JSX is compiled by Babel into createElement calls:", codeSnippet: { filename: "jsx-transformation.js", path: "examples/jsx-transformation.js", language: "javascript", content: `// What you write (JSX):\nconst element = (\n  <h1 className="title">Hello, {name}!</h1>\n);\n\n// What Babel compiles it to:\nconst element = React.createElement(\n  'h1',\n  { className: 'title' },\n  'Hello, ', name, '!'\n);` } },
      { type: "breakdown", content: "Important lines explained:", items: ["Line 3: className is used instead of class (JavaScript reserved word)", "Line 3: Curly braces {} evaluate any JavaScript expression", "Lines 7-11: Every JSX element becomes a React.createElement call"] },
      { type: "takeaways", content: "Key takeaways:", items: ["JSX is not a browser feature — it is compiled to JavaScript", "Use className instead of class in JSX", "Curly braces let you embed JavaScript expressions in JSX"] },
      { type: "exercise", content: "Exercise: Write the JSX for a profile card with an avatar, name, and bio. Then manually write out what the compiled React.createElement() calls would look like." },
    ],
  },
  "react-l3": {
    id: "react-l3", repoId: "facebook-react", lessonNumber: 3,
    title: "Components and Props",
    objective: "Build reusable UI components and pass data with props",
    estimatedMinutes: 30, status: "in_progress",
    sections: [
      { type: "explanation", content: "Props (short for properties) are how components receive data from their parent. Think of a component as a function and props as its arguments — React passes a single props object, and you destructure what you need." },
      { type: "objectives", content: "By the end of this lesson you will:", items: ["Pass data into components using props", "Use TypeScript to type your props interface", "Compose components together to build complex UIs"] },
      { type: "code", content: "A typed component with props in TypeScript:", codeSnippet: { filename: "Card.tsx", path: "examples/Card.tsx", language: "typescript", content: `interface CardProps {\n  title: string;\n  description: string;\n  tag: string;\n  isHighlighted?: boolean;\n}\n\nfunction Card({ title, description, tag, isHighlighted = false }: CardProps) {\n  return (\n    <div className={\`card \${isHighlighted ? 'card--highlighted' : ''}\`}>\n      <span className="tag">{tag}</span>\n      <h2>{title}</h2>\n      <p>{description}</p>\n    </div>\n  );\n}` } },
      { type: "breakdown", content: "Important lines explained:", items: ["Lines 1-5: TypeScript interface defines the shape of props", "Line 8: Destructuring extracts props — isHighlighted defaults to false", "Line 10: Template literals conditionally apply a CSS class"] },
      { type: "takeaways", content: "Key takeaways:", items: ["Props are read-only — never mutate them inside the component", "TypeScript interfaces prevent prop typos and enable editor completion", "Default values make optional props safe without undefined checks"] },
      { type: "exercise", content: "Exercise: Build a LessonCard component that accepts title, status (completed | in_progress | not_started), duration in minutes, and an optional description. Show a colored status badge." },
    ],
  },
  "react-l4": {
    id: "react-l4", repoId: "facebook-react", lessonNumber: 4,
    title: "State and the useState Hook",
    objective: "Manage component state and trigger re-renders",
    estimatedMinutes: 35, status: "not_started",
    sections: [
      { type: "explanation", content: "State is data that belongs to a component and can change over time. When state changes, React re-renders the component. useState is the simplest way to add state — it returns the current value and a setter function." },
      { type: "objectives", content: "By the end of this lesson you will:", items: ["Add state to a component with useState", "Update state correctly to trigger re-renders", "Avoid common state mutation mistakes"] },
      { type: "code", content: "useState in action:", codeSnippet: { filename: "Counter.tsx", path: "examples/Counter.tsx", language: "typescript", content: `import { useState } from 'react';\n\nfunction Counter() {\n  const [count, setCount] = useState(0);\n\n  function increment() {\n    setCount(prev => prev + 1); // Use functional update\n  }\n\n  return (\n    <div>\n      <p>Count: {count}</p>\n      <button onClick={increment}>+1</button>\n    </div>\n  );\n}` } },
      { type: "breakdown", content: "Key concepts:", items: ["Line 4: useState(0) returns [currentValue, setter]", "Line 7: Functional update (prev => prev + 1) is safer than setCount(count + 1)", "Line 12: count in JSX automatically re-renders when state changes"] },
      { type: "takeaways", content: "Key takeaways:", items: ["Never mutate state directly — always use the setter", "Use functional updates when the new state depends on the old state", "State updates are batched and asynchronous in React 18+"] },
      { type: "exercise", content: "Exercise: Build a toggle component that switches between 'Light Mode' and 'Dark Mode' and changes its background color accordingly using useState." },
    ],
  },
  "react-l5": {
    id: "react-l5", repoId: "facebook-react", lessonNumber: 5,
    title: "Side Effects with useEffect",
    objective: "Handle async operations and component lifecycle",
    estimatedMinutes: 35, status: "not_started",
    sections: [
      { type: "explanation", content: "Side effects are anything that reaches outside the component — fetch calls, subscriptions, DOM manipulation. useEffect lets you run these effects after the component renders, and optionally clean them up." },
      { type: "objectives", content: "By the end of this lesson you will:", items: ["Use useEffect to fetch data after render", "Understand the dependency array", "Write cleanup functions to prevent memory leaks"] },
      { type: "code", content: "Data fetching with useEffect:", codeSnippet: { filename: "UserProfile.tsx", path: "examples/UserProfile.tsx", language: "typescript", content: `import { useState, useEffect } from 'react';\n\nfunction UserProfile({ userId }: { userId: string }) {\n  const [user, setUser] = useState(null);\n  const [loading, setLoading] = useState(true);\n\n  useEffect(() => {\n    let cancelled = false;\n\n    async function fetchUser() {\n      const res = await fetch(\`/api/users/\${userId}\`);\n      const data = await res.json();\n      if (!cancelled) setUser(data);\n    }\n\n    fetchUser().finally(() => {\n      if (!cancelled) setLoading(false);\n    });\n\n    return () => { cancelled = true; }; // Cleanup\n  }, [userId]); // Re-run when userId changes\n\n  if (loading) return <p>Loading...</p>;\n  return <p>Hello, {user?.name}</p>;\n}` } },
      { type: "breakdown", content: "Key concepts:", items: ["Line 8: cancelled flag prevents state updates after unmount", "Lines 10-14: Async function inside useEffect (effects can't be async directly)", "Line 20: Return value is the cleanup function", "Line 21: Dependency array [userId] — effect runs again when userId changes"] },
      { type: "takeaways", content: "Key takeaways:", items: ["useEffect runs after every render by default", "The dependency array controls when the effect re-runs", "Always clean up subscriptions and async operations to prevent memory leaks"] },
      { type: "exercise", content: "Exercise: Create a component that fetches a list of GitHub repos for a username from the public GitHub API. Show a loading state and an error state." },
    ],
  },
  "react-l6": {
    id: "react-l6", repoId: "facebook-react", lessonNumber: 6,
    title: "The Virtual DOM and Reconciliation",
    objective: "Understand how React decides what to update in the DOM",
    estimatedMinutes: 40, status: "not_started",
    sections: [
      { type: "explanation", content: "React maintains a Virtual DOM — a JavaScript representation of the actual DOM. When state changes, React creates a new Virtual DOM tree and diffs it with the old one. Only the actual changed DOM nodes are updated." },
      { type: "objectives", content: "By the end of this lesson you will:", items: ["Understand what the Virtual DOM is and why it exists", "Learn how React's diffing algorithm works", "Know why keys matter in lists"] },
      { type: "code", content: "Why keys matter in lists:", codeSnippet: { filename: "list-keys.jsx", path: "examples/list-keys.jsx", language: "jsx", content: `// BAD: Using array index as key\nfunction BadList({ items }) {\n  return (\n    <ul>\n      {items.map((item, index) => (\n        <li key={index}>{item.name}</li> // Don't do this!\n      ))}\n    </ul>\n  );\n}\n\n// GOOD: Using a stable unique identifier\nfunction GoodList({ items }) {\n  return (\n    <ul>\n      {items.map(item => (\n        <li key={item.id}>{item.name}</li> // Stable identity\n      ))}\n    </ul>\n  );\n}` } },
      { type: "breakdown", content: "Key concepts:", items: ["Line 6: Index keys break when items are reordered or inserted", "Line 17: ID-based keys let React correctly identify which item changed", "React uses keys to match old and new virtual DOM elements during reconciliation"] },
      { type: "takeaways", content: "Key takeaways:", items: ["The Virtual DOM is a performance optimization — it batches DOM updates", "React's diffing is O(n) because it makes assumptions about the tree", "Keys must be stable, unique among siblings, and not based on array index"] },
      { type: "exercise", content: "Exercise: Create a list of items where you can add, remove, and reorder them. Compare the behavior when using index-based keys vs ID-based keys in your browser DevTools." },
    ],
  },
  "next-l1": {
    id: "next-l1", repoId: "vercel-next-js", lessonNumber: 1,
    title: "Project Structure: How Next.js Organizes Itself",
    objective: "Navigate the Next.js monorepo and understand its structure",
    estimatedMinutes: 20, status: "completed",
    sections: [
      { type: "explanation", content: "The Next.js repository is a monorepo managed with Turborepo. Understanding its layout is the first step to reading the source code. The core framework lives in packages/next/, while examples/ has hundreds of usage patterns." },
      { type: "objectives", content: "By the end of this lesson you will:", items: ["Know where the core Next.js code lives", "Understand what packages/next/src contains", "Navigate the directory structure confidently"] },
      { type: "code", content: "Top-level structure of the Next.js repo:", codeSnippet: { filename: "structure", path: "packages/next/src/", language: "text", content: `packages/next/src/\n├── client/          # Browser-side code\n│   ├── app-dir/     # App Router client runtime\n│   └── components/  # Built-in components (Link, Image)\n├── server/          # Node.js server code\n│   ├── app-render/  # Server component rendering\n│   └── lib/         # Server utilities\n├── shared/          # Shared between client and server\n└── build/           # Build pipeline configuration` } },
      { type: "breakdown", content: "Key directories:", items: ["client/ — runs in the browser, handles navigation and hydration", "server/ — runs in Node.js, handles SSR and RSC rendering", "shared/ — utilities that work in both environments", "build/ — the compilation step that processes your app"] },
      { type: "takeaways", content: "Key takeaways:", items: ["Next.js is a full-stack framework with both client and server code", "The App Router code lives in client/app-dir and server/app-render", "The monorepo structure lets teams work on different packages independently"] },
      { type: "exercise", content: "Exercise: Navigate to packages/next/src/client/app-dir/ and identify three files. Write a one-sentence guess about what each does based on its name." },
    ],
  },
  "express-l1": {
    id: "express-l1", repoId: "expressjs-express", lessonNumber: 1,
    title: "What Happens When You Call express()",
    objective: "Trace the app creation flow from the source",
    estimatedMinutes: 20, status: "completed",
    sections: [
      { type: "explanation", content: "When you call express(), Express creates an application object that is also a function. This dual nature — an object with methods that is itself callable — is a key design pattern in Node.js libraries. Let's trace exactly what happens." },
      { type: "objectives", content: "By the end of this lesson you will:", items: ["Know what express() returns", "Understand the app object's dual nature", "See how Express sets up its initial defaults"] },
      { type: "code", content: "The createApplication function (lib/express.js):", codeSnippet: { filename: "express.js", path: "lib/express.js", language: "javascript", content: `function createApplication() {\n  var app = function(req, res, next) {\n    app.handle(req, res, next);\n  };\n\n  mixin(app, EventEmitter.prototype, false);\n  mixin(app, proto, false);\n\n  app.request = Object.create(req, {\n    app: { configurable: true, enumerable: true, writable: true, value: app }\n  });\n  app.response = Object.create(res, {\n    app: { configurable: true, enumerable: true, writable: true, value: app }\n  });\n\n  app.init();\n  return app;\n}` } },
      { type: "breakdown", content: "Line-by-line breakdown:", items: ["Line 2: app is a function — it IS the HTTP request handler", "Lines 6-7: mixin copies EventEmitter and Application methods onto app", "Lines 9-14: app gets request/response prototypes with a back-reference", "Line 16: init() sets up settings and default middleware"] },
      { type: "takeaways", content: "Key takeaways:", items: ["The Express app is both a function (HTTP handler) and an object (API)", "Mixin pattern avoids class inheritance while composing multiple behaviors", "app.init() is where Express's default settings are configured"] },
      { type: "exercise", content: "Exercise: Open lib/application.js and find the init() method. List every setting that is configured by default when you create a new Express app." },
    ],
  },
};

export const DEMO_QUIZZES: Record<string, Quiz> = {
  "react-l1": {
    lessonId: "react-l1",
    questions: [
      { id: "q1", question: "What core problem did React introduce components to solve?", options: [{ id: "a", text: "Making CSS easier to write" }, { id: "b", text: "Making UI a predictable function of state" }, { id: "c", text: "Replacing JavaScript with a new language" }, { id: "d", text: "Generating database schemas automatically" }], correctOptionId: "b", explanation: "React's core insight is UI = f(state). When state changes, React re-renders the minimal DOM changes needed." },
      { id: "q2", question: "What does a React component return?", options: [{ id: "a", text: "A plain JavaScript object" }, { id: "b", text: "An HTML string" }, { id: "c", text: "JSX (compiled to React elements)" }, { id: "d", text: "A CSS class name" }], correctOptionId: "c", explanation: "React components return JSX, which Babel compiles to React.createElement() calls that produce React element objects." },
      { id: "q3", question: "Which best describes a React component?", options: [{ id: "a", text: "A database model" }, { id: "b", text: "An HTML template file" }, { id: "c", text: "A JavaScript function that returns UI description" }, { id: "d", text: "A CSS stylesheet" }], correctOptionId: "c", explanation: "React components are functions that accept props and return a description of what the UI should look like." },
    ],
  },
  "react-l2": {
    lessonId: "react-l2",
    questions: [
      { id: "q1", question: "What does Babel do to JSX?", options: [{ id: "a", text: "Sends it directly to the browser" }, { id: "b", text: "Compiles it to React.createElement() calls" }, { id: "c", text: "Stores it in a database" }, { id: "d", text: "Converts it to CSS" }], correctOptionId: "b", explanation: "Babel transforms JSX into React.createElement() calls during build. Browsers only see compiled JavaScript." },
      { id: "q2", question: "Why do we use className instead of class in JSX?", options: [{ id: "a", text: "It has different behavior from class" }, { id: "b", text: "class is a reserved keyword in JavaScript" }, { id: "c", text: "className is faster to process" }, { id: "d", text: "It is required only for TypeScript" }], correctOptionId: "b", explanation: "class is a reserved keyword in JavaScript (used for class declarations), so JSX uses className to avoid a syntax conflict." },
      { id: "q3", question: "What do curly braces {} do inside JSX?", options: [{ id: "a", text: "Create a CSS block" }, { id: "b", text: "Define an object literal" }, { id: "c", text: "Evaluate any JavaScript expression" }, { id: "d", text: "Start a function body" }], correctOptionId: "c", explanation: "Curly braces in JSX switch to JavaScript mode and evaluate any valid JavaScript expression." },
    ],
  },
  "react-l3": {
    lessonId: "react-l3",
    questions: [
      { id: "q1", question: "Can a component modify its own props?", options: [{ id: "a", text: "Yes, using setState" }, { id: "b", text: "Yes, by reassigning the prop variable" }, { id: "c", text: "No, props are read-only" }, { id: "d", text: "Only if the prop is an object" }], correctOptionId: "c", explanation: "Props are read-only. A component should never modify its own props — use state for changing data." },
      { id: "q2", question: "What is the shorthand for passing a boolean prop as true?", options: [{ id: "a", text: 'isHighlighted="true"' }, { id: "b", text: "isHighlighted={true} only" }, { id: "c", text: "isHighlighted (no value)" }, { id: "d", text: "Both isHighlighted and isHighlighted={true} work" }], correctOptionId: "d", explanation: "isHighlighted is shorthand for isHighlighted={true}. Both are valid and produce identical results." },
      { id: "q3", question: "What is the benefit of TypeScript interfaces for props?", options: [{ id: "a", text: "They run faster at runtime" }, { id: "b", text: "They catch typos and enable editor autocomplete" }, { id: "c", text: "They replace JSX syntax" }, { id: "d", text: "They are required for React to work" }], correctOptionId: "b", explanation: "TypeScript interfaces catch misspelled prop names and enable IDE autocomplete at development time, not runtime." },
    ],
  },
  "next-l1": {
    lessonId: "next-l1",
    questions: [
      { id: "q1", question: "Where does the core Next.js framework code live?", options: [{ id: "a", text: "In the examples/ directory" }, { id: "b", text: "In packages/next/src/" }, { id: "c", text: "In the test/ directory" }, { id: "d", text: "In the public/ folder" }], correctOptionId: "b", explanation: "The core framework code is in packages/next/src/. Next.js uses a monorepo and the main package is packages/next." },
      { id: "q2", question: "What does the client/ directory in Next.js contain?", options: [{ id: "a", text: "Server-side rendering code" }, { id: "b", text: "Browser-side code" }, { id: "c", text: "Database models" }, { id: "d", text: "Build configuration" }], correctOptionId: "b", explanation: "The client/ directory contains code that runs in the browser — navigation, hydration, and client-side React rendering." },
      { id: "q3", question: "What build tool does the Next.js monorepo use?", options: [{ id: "a", text: "Lerna" }, { id: "b", text: "Nx" }, { id: "c", text: "Turborepo" }, { id: "d", text: "Rush" }], correctOptionId: "c", explanation: "Next.js uses Turborepo to manage its monorepo, handling task orchestration and caching across packages." },
    ],
  },
  "express-l1": {
    lessonId: "express-l1",
    questions: [
      { id: "q1", question: "What is unusual about the object returned by express()?", options: [{ id: "a", text: "It extends HTMLElement" }, { id: "b", text: "It is both a function and an object with methods" }, { id: "c", text: "It is a class instance" }, { id: "d", text: "It returns a Promise" }], correctOptionId: "b", explanation: "The Express app is a function (HTTP handler) that also has methods like .use(), .get(), and .listen() — enabled by mixing methods into the function object." },
      { id: "q2", question: "What does the mixin function do in Express's source?", options: [{ id: "a", text: "Combines CSS styles" }, { id: "b", text: "Copies properties from source objects onto the target" }, { id: "c", text: "Mixes database records" }, { id: "d", text: "Merges HTTP headers" }], correctOptionId: "b", explanation: "mixin copies properties from EventEmitter and the Application prototype onto the app function object without class inheritance." },
      { id: "q3", question: "What does app.init() do?", options: [{ id: "a", text: "Starts the HTTP server" }, { id: "b", text: "Connects to a database" }, { id: "c", text: "Sets up default settings and middleware" }, { id: "d", text: "Imports route handlers" }], correctOptionId: "c", explanation: "app.init() configures Express's default settings (ETag, case sensitivity, etc.) before any user code runs." },
    ],
  },
};

export const DEMO_TREES: Record<string, TreeNode[]> = {
  "facebook-react": [
    { id: "packages", name: "packages", path: "packages", type: "directory", children: [
      { id: "react-pkg", name: "react", path: "packages/react", type: "directory", children: [
        { id: "react-index", name: "index.js", path: "packages/react/index.js", type: "file", language: "javascript" },
        { id: "react-src", name: "src", path: "packages/react/src", type: "directory", children: [
          { id: "react-hooks", name: "ReactHooks.js", path: "packages/react/src/ReactHooks.js", type: "file", language: "javascript" },
          { id: "react-context", name: "ReactContext.js", path: "packages/react/src/ReactContext.js", type: "file", language: "javascript" },
        ]},
      ]},
      { id: "react-dom-pkg", name: "react-dom", path: "packages/react-dom", type: "directory", children: [
        { id: "react-dom-client", name: "client.js", path: "packages/react-dom/client.js", type: "file", language: "javascript" },
        { id: "react-dom-server", name: "server.js", path: "packages/react-dom/server.js", type: "file", language: "javascript" },
      ]},
      { id: "react-reconciler-pkg", name: "react-reconciler", path: "packages/react-reconciler", type: "directory", children: [
        { id: "fiber-reconciler", name: "ReactFiberReconciler.js", path: "packages/react-reconciler/src/ReactFiberReconciler.js", type: "file", language: "javascript" },
        { id: "fiber-hooks", name: "ReactFiberHooks.js", path: "packages/react-reconciler/src/ReactFiberHooks.js", type: "file", language: "javascript" },
        { id: "fiber-work", name: "ReactFiberWorkLoop.js", path: "packages/react-reconciler/src/ReactFiberWorkLoop.js", type: "file", language: "javascript" },
      ]},
    ]},
  ],
  "vercel-next-js": [
    { id: "packages-next", name: "packages", path: "packages", type: "directory", children: [
      { id: "next-main", name: "next", path: "packages/next", type: "directory", children: [
        { id: "next-package-json", name: "package.json", path: "packages/next/package.json", type: "file" },
        { id: "next-src", name: "src", path: "packages/next/src", type: "directory", children: [
          { id: "next-client", name: "client", path: "packages/next/src/client", type: "directory", children: [
            { id: "next-link", name: "link.tsx", path: "packages/next/src/client/link.tsx", type: "file", language: "typescript" },
            { id: "next-image", name: "image.tsx", path: "packages/next/src/client/image.tsx", type: "file", language: "typescript" },
          ]},
          { id: "next-server", name: "server", path: "packages/next/src/server", type: "directory", children: [
            { id: "next-app-render", name: "app-render.tsx", path: "packages/next/src/server/app-render/app-render.tsx", type: "file", language: "typescript" },
          ]},
        ]},
      ]},
    ]},
  ],
  "expressjs-express": [
    { id: "lib", name: "lib", path: "lib", type: "directory", children: [
      { id: "express-js", name: "express.js", path: "lib/express.js", type: "file", language: "javascript" },
      { id: "application-js", name: "application.js", path: "lib/application.js", type: "file", language: "javascript" },
      { id: "router", name: "router", path: "lib/router", type: "directory", children: [
        { id: "router-index", name: "index.js", path: "lib/router/index.js", type: "file", language: "javascript" },
        { id: "router-layer", name: "layer.js", path: "lib/router/layer.js", type: "file", language: "javascript" },
        { id: "router-route", name: "route.js", path: "lib/router/route.js", type: "file", language: "javascript" },
      ]},
      { id: "request-js", name: "request.js", path: "lib/request.js", type: "file", language: "javascript" },
      { id: "response-js", name: "response.js", path: "lib/response.js", type: "file", language: "javascript" },
    ]},
    { id: "index-js", name: "index.js", path: "index.js", type: "file", language: "javascript" },
    { id: "package-json", name: "package.json", path: "package.json", type: "file" },
  ],
};

export const DEMO_FILE_EXPLANATIONS: Record<string, FileExplanation> = {
  "packages/react/index.js": {
    path: "packages/react/index.js",
    summary: "The main entry point for the React package. Re-exports everything from the React source, making the public API available when you do import React from 'react'.",
    importantFunctions: [{ name: "module.exports", description: "The public API surface of React — useState, useEffect, createContext, etc." }],
    relatedFiles: ["packages/react/src/ReactHooks.js", "packages/react/src/ReactContext.js"],
  },
  "packages/react/src/ReactHooks.js": {
    path: "packages/react/src/ReactHooks.js",
    summary: "Defines all React Hooks (useState, useEffect, useContext, etc.). Hooks here dispatch to the current renderer's dispatcher — they don't contain the actual implementation.",
    importantFunctions: [
      { name: "useState", description: "Returns state value and a setter. Delegates to dispatcher.useState." },
      { name: "useEffect", description: "Registers a side effect to run after render." },
      { name: "useContext", description: "Reads the nearest Context value." },
      { name: "resolveDispatcher", description: "Gets the current fiber's dispatcher — throws if called outside a component." },
    ],
    relatedFiles: ["packages/react-reconciler/src/ReactFiberHooks.js"],
  },
  "lib/express.js": {
    path: "lib/express.js",
    summary: "Entry point and factory for the Express application. When you call express(), this module's createApplication function runs and returns the app object.",
    importantFunctions: [
      { name: "createApplication", description: "Creates and returns a new Express app. Mixes in EventEmitter, application proto, request and response objects." },
      { name: "mixin", description: "Copies properties from source onto a target — enables Express's composition pattern." },
    ],
    relatedFiles: ["lib/application.js", "lib/request.js", "lib/response.js"],
  },
  "lib/application.js": {
    path: "lib/application.js",
    summary: "Defines the Application prototype — all methods available on the Express app such as use(), set(), listen(), and route(). This is where the middleware stack is managed.",
    importantFunctions: [
      { name: "app.init", description: "Sets up default settings and initializes the middleware stack." },
      { name: "app.use", description: "Mounts middleware or sub-applications at a given path." },
      { name: "app.listen", description: "Binds the app to a port and starts accepting connections." },
      { name: "app.handle", description: "The HTTP request handler — dispatches incoming requests to the router." },
    ],
    relatedFiles: ["lib/router/index.js", "lib/middleware/init.js"],
  },
  "packages/next/src/client/link.tsx": {
    path: "packages/next/src/client/link.tsx",
    summary: "The Next.js <Link> component. Wraps an anchor element to enable client-side navigation using the App Router. Handles prefetching, scroll restoration, and page transitions.",
    importantFunctions: [
      { name: "Link", description: "The default export — the <Link> component users import." },
      { name: "prefetch", description: "Pre-loads the linked page's data and code before navigation." },
      { name: "handleClick", description: "Intercepts click events to use client-side navigation instead of a full page load." },
    ],
    relatedFiles: ["packages/next/src/client/image.tsx", "packages/next/src/server/app-render/app-render.tsx"],
  },
};

export const DEMO_CODE_FILES: Record<string, CodeSnippet> = {
  "packages/react/index.js": {
    filename: "index.js",
    path: "packages/react/index.js",
    language: "javascript",
    content: `/**\n * Copyright (c) Meta Platforms, Inc. and affiliates.\n * React public API entry point.\n */\n\n'use strict';\n\nconst React = require('./src/React');\n\n// TODO: decide on the top-level export form.\nmodule.exports = React.default || React;`,
  },
  "packages/react/src/ReactHooks.js": {
    filename: "ReactHooks.js",
    path: "packages/react/src/ReactHooks.js",
    language: "javascript",
    content: `/**\n * React Hooks — the public hooks API.\n * Each hook delegates to the current renderer's dispatcher.\n */\n\nimport ReactCurrentDispatcher from './ReactCurrentDispatcher';\n\nfunction resolveDispatcher() {\n  const dispatcher = ReactCurrentDispatcher.current;\n  if (dispatcher === null) {\n    throw new Error(\n      'Invalid hook call. Hooks can only be called inside a function component.'\n    );\n  }\n  return dispatcher;\n}\n\nexport function useState(initialState) {\n  const dispatcher = resolveDispatcher();\n  return dispatcher.useState(initialState);\n}\n\nexport function useEffect(create, deps) {\n  const dispatcher = resolveDispatcher();\n  return dispatcher.useEffect(create, deps);\n}\n\nexport function useContext(Context) {\n  const dispatcher = resolveDispatcher();\n  return dispatcher.useContext(Context);\n}`,
  },
  "lib/express.js": {
    filename: "express.js",
    path: "lib/express.js",
    language: "javascript",
    content: `'use strict';\n\nvar EventEmitter = require('events').EventEmitter;\nvar mixin = require('merge-descriptors');\nvar proto = require('./application');\nvar req = require('./request');\nvar res = require('./response');\n\nexports = module.exports = createApplication;\n\nfunction createApplication() {\n  var app = function(req, res, next) {\n    app.handle(req, res, next);\n  };\n\n  mixin(app, EventEmitter.prototype, false);\n  mixin(app, proto, false);\n\n  app.request = Object.create(req, {\n    app: { configurable: true, enumerable: true, writable: true, value: app }\n  });\n  app.response = Object.create(res, {\n    app: { configurable: true, enumerable: true, writable: true, value: app }\n  });\n\n  app.init();\n  return app;\n}`,
  },
  "lib/application.js": {
    filename: "application.js",
    path: "lib/application.js",
    language: "javascript",
    content: `'use strict';\n\nvar Router = require('./router');\nvar methods = require('methods');\nvar middleware = require('./middleware/init');\nvar query = require('./middleware/query');\nvar debug = require('debug')('express:application');\nvar http = require('http');\n\nvar app = exports = module.exports = {};\n\napp.init = function init() {\n  this.cache = {};\n  this.engines = {};\n  this.settings = {};\n  this.defaultConfiguration();\n};\n\napp.defaultConfiguration = function defaultConfiguration() {\n  var env = process.env.NODE_ENV || 'development';\n  this.enable('x-powered-by');\n  this.set('etag', 'weak');\n  this.set('env', env);\n  this.set('query parser', 'extended');\n};\n\napp.handle = function handle(req, res, callback) {\n  var router = this._router;\n  var done = callback || finalhandler(req, res);\n  if (!router) { done(); return; }\n  router.handle(req, res, done);\n};`,
  },
  "packages/next/src/client/link.tsx": {
    filename: "link.tsx",
    path: "packages/next/src/client/link.tsx",
    language: "typescript",
    content: `'use client';\n\nimport React from 'react';\nimport { useRouter } from './components/navigation';\n\ninterface LinkProps {\n  href: string | URL;\n  replace?: boolean;\n  scroll?: boolean;\n  prefetch?: boolean;\n  children: React.ReactNode;\n  className?: string;\n}\n\nconst Link = React.forwardRef<HTMLAnchorElement, LinkProps>(\n  function LinkComponent({ href, replace, scroll = true, children, ...rest }, ref) {\n    const router = useRouter();\n    const hrefString = typeof href === 'string' ? href : href.toString();\n\n    const handleClick = React.useCallback(\n      (e: React.MouseEvent<HTMLAnchorElement>) => {\n        if (e.ctrlKey || e.metaKey || !hrefString.startsWith('/')) return;\n        e.preventDefault();\n        if (replace) {\n          router.replace(hrefString, { scroll });\n        } else {\n          router.push(hrefString, { scroll });\n        }\n      },\n      [router, hrefString, replace, scroll]\n    );\n\n    return <a ref={ref} href={hrefString} onClick={handleClick} {...rest}>{children}</a>;\n  }\n);\n\nexport default Link;`,
  },
};
