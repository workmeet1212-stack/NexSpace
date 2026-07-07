import Groq from 'groq-sdk';
import { redis, RedisKeys, TTL } from '../config/redis';
import crypto from 'crypto';
import { env } from '../config/env';

const groq = new Groq({ apiKey: env.GROQ_API_KEY });

const MODEL = 'llama-3.1-70b-versatile';

const getCacheKey = (prompt: string): string =>
  `ai:cache:${crypto.createHash('md5').update(prompt).digest('hex')}`;

export const aiComplete = async (
  prompt: string,
  systemPrompt: string,
  useCache = true
): Promise<string> => {
  const cacheKey = getCacheKey(systemPrompt + prompt);

  if (useCache) {
    const cached = await redis.get(cacheKey);
    if (cached) return cached as string;
  }

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 2048,
  });

  const result = response.choices[0].message.content || '';

  if (useCache) {
    await redis.setex(cacheKey, TTL.AI_CACHE, result);
  }

  return result;
};

export const aiStream = async (
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  onChunk: (chunk: string) => void,
  onDone: () => void
): Promise<void> => {
  const stream = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    temperature: 0.7,
    max_tokens: 4096,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    if (content) onChunk(content);
  }
  onDone();
};

export const generateTaskDescription = async (
  title: string,
  projectContext: string
): Promise<{
  description: string;
  priority: string;
  storyPoints: number;
  labels: string[];
}> => {
  const prompt = `
Task Title: "${title}"
Project Context: ${projectContext}

Generate a detailed task description in markdown format.
Also suggest: priority (urgent/high/medium/low),
story points (1-13 fibonacci), and relevant labels.

Respond in JSON format exactly:
{
  "description": "markdown content",
  "priority": "medium",
  "storyPoints": 3,
  "labels": ["backend", "api"]
}`;

  const result = await aiComplete(
    prompt,
    'You are an expert project manager and software engineer. Respond only with valid JSON.'
  );

  try {
    return JSON.parse(result);
  } catch {
    return {
      description: result,
      priority: 'medium',
      storyPoints: 3,
      labels: [],
    };
  }
};

export const suggestLabels = async (
  taskTitle: string,
  taskDescription: string,
  existingLabels: string[]
): Promise<string[]> => {
  const prompt = `
Task: "${taskTitle}"
Description: "${taskDescription}"
Available labels: ${existingLabels.join(', ')}

Pick the most relevant labels from the available list only.
Return JSON array of label names: ["label1", "label2"]
Maximum 3 labels.`;

  const result = await aiComplete(
    prompt,
    'You are a project management assistant. Respond only with valid JSON array.'
  );

  try {
    return JSON.parse(result);
  } catch {
    return [];
  }
};

export const summarizeComments = async (
  comments: Array<{ author: string; content: string; createdAt: string }>
): Promise<{
  summary: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: string[];
}> => {
  const commentsText = comments
    .map((c) => `${c.author} (${c.createdAt}): ${c.content}`)
    .join('\n');

  const prompt = `
Summarize these task comments and extract:
1. Brief summary
2. Key discussion points
3. Decisions made
4. Action items

Comments:
${commentsText}

Respond in JSON exactly:
{
  "summary": "...",
  "keyPoints": ["...", "..."],
  "decisions": ["...", "..."],
  "actionItems": ["...", "..."]
}`;

  const result = await aiComplete(
    prompt,
    'You are a project management assistant. Respond only with valid JSON.'
  );

  try {
    return JSON.parse(result);
  } catch {
    return {
      summary: result,
      keyPoints: [],
      decisions: [],
      actionItems: [],
    };
  }
};

export const chatWithProjectContext = async (
  question: string,
  projectData: {
    projectName: string;
    tasks: any[];
    members: any[];
    sprints: any[];
  },
  chatHistory: Array<{ role: string; content: string }>,
  onChunk: (chunk: string) => void,
  onDone: () => void
): Promise<void> => {
  const context = buildProjectContext(projectData);

  const systemPrompt = `You are an AI assistant for NexSpace project management.
You have access to real-time project data shown below.
Answer based on this data. Reference task IDs when relevant.
Be specific, helpful, and concise.
Current date: ${new Date().toISOString().split('T')[0]}

PROJECT CONTEXT:
${context}`;

  const messages = [
    ...chatHistory.slice(-10),
    { role: 'user', content: question },
  ];

  await aiStream(messages, systemPrompt, onChunk, onDone);
};

const buildProjectContext = (projectData: {
  projectName: string;
  tasks: any[];
  members: any[];
  sprints: any[];
}): string => {
  const { projectName, tasks, members, sprints } = projectData;

  const taskSummary = tasks
    .slice(0, 50)
    .map(
      (t) =>
        `[${t.taskId}] ${t.title} | Status: ${t.status} | Priority: ${t.priority} | Assignee: ${t.assignees?.map((a: any) => a.name).join(', ') || 'Unassigned'}`
    )
    .join('\n');

  const memberSummary = members.map((m) => `${m.name} (${m.role})`).join(', ');

  const activeSprint = sprints.find((s) => s.status === 'active');

  return `
Project: ${projectName}
Team Members: ${memberSummary}
Active Sprint: ${activeSprint ? `${activeSprint.name} (${activeSprint.startDate} - ${activeSprint.endDate})` : 'None'}
Total Tasks: ${tasks.length}
Tasks:
${taskSummary}`;
};

export const planSprint = async (
  goal: string,
  capacity: number,
  backlogTasks: any[],
  teamMembers: any[]
): Promise<{
  selectedTasks: string[];
  assignments: Record<string, string[]>;
  riskLevel: 'low' | 'medium' | 'high';
  rationale: string;
}> => {
  const taskList = backlogTasks
    .map(
      (t) =>
        `${t.taskId}: ${t.title} (${t.storyPoints || '?'} pts, Priority: ${t.priority})`
    )
    .join('\n');

  const memberList = teamMembers.map((m) => m.name).join(', ');

  const prompt = `
Sprint Goal: "${goal}"
Team Capacity: ${capacity} story points
Team Members: ${memberList}

Available backlog tasks:
${taskList}

Plan the optimal sprint. Select tasks that fit within capacity
and match the goal. Assign tasks to team members evenly.

Respond in JSON exactly:
{
  "selectedTasks": ["TASK-1", "TASK-2"],
  "assignments": {
    "MemberName": ["TASK-1"],
    "MemberName2": ["TASK-2"]
  },
  "riskLevel": "medium",
  "rationale": "explanation"
}`;

  const result = await aiComplete(
    prompt,
    'You are an expert agile project manager. Respond only with valid JSON.',
    false
  );

  try {
    return JSON.parse(result);
  } catch {
    return {
      selectedTasks: [],
      assignments: {},
      riskLevel: 'medium',
      rationale: result,
    };
  }
};

export const analyzeProjectRisks = async (
  projectData: any
): Promise<
  Array<{
    severity: 'critical' | 'high' | 'medium' | 'low';
    type: string;
    description: string;
    suggestion: string;
  }>
> => {
  const overdueCount = projectData.tasks.filter(
    (t: any) =>
      t.dueDate &&
      new Date(t.dueDate) < new Date() &&
      t.status !== 'Done'
  ).length;

  const blockedCount = projectData.tasks.filter(
    (t: any) => t.blockedBy?.length > 0
  ).length;

  const prompt = `
Analyze risks for project: ${projectData.name}
Total tasks: ${projectData.tasks.length}
Overdue tasks: ${overdueCount}
Blocked tasks: ${blockedCount}
Sprint status: ${projectData.activeSprint?.status || 'No active sprint'}

Identify top risks and suggestions.
Respond with JSON array exactly:
[{
  "severity": "high",
  "type": "overdue",
  "description": "...",
  "suggestion": "..."
}]`;

  const result = await aiComplete(
    prompt,
    'You are a project risk analyst. Respond only with valid JSON array.'
  );

  try {
    return JSON.parse(result);
  } catch {
    return [];
  }
};

export const generateStandup = async (
  userName: string,
  tasks: {
    completedYesterday: any[];
    inProgressToday: any[];
    blockers: any[];
  }
): Promise<{
  yesterday: string[];
  today: string[];
  blockers: string[];
}> => {
  const prompt = `
Generate a daily standup for ${userName}.

Completed yesterday:
${tasks.completedYesterday.map((t) => `- ${t.title}`).join('\n') || '- Nothing'}

Working on today:
${tasks.inProgressToday.map((t) => `- ${t.title}`).join('\n') || '- No tasks assigned'}

Blocked tasks:
${tasks.blockers.map((t) => `- ${t.title}: blocked by ${t.blockedBy}`).join('\n') || '- No blockers'}

Write professional standup bullets. Be concise.
Respond in JSON exactly:
{
  "yesterday": ["Did X", "Completed Y"],
  "today": ["Will work on A", "Plan to finish B"],
  "blockers": ["Waiting for Z"] or []
}`;

  const result = await aiComplete(
    prompt,
    'You are a helpful engineering team assistant. Respond only with valid JSON.'
  );

  try {
    return JSON.parse(result);
  } catch {
    return {
      yesterday: [],
      today: [],
      blockers: [],
    };
  }
};
