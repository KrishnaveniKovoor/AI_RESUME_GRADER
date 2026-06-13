const Groq = require("groq-sdk");
const personaPrompts = require("./promptTemplates");

let groqClient;
const getGroqClient = () => {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is required for Groq client initialization.');
    }
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
};

const buildPrompt = (persona, resumeText, jobDescription) => {
  const personaPrompt =
    personaPrompts[persona] ||
    personaPrompts["ATS Screening Recruiter"];

  return `${personaPrompt}

Resume Text:
${resumeText}

Job Description:
${jobDescription}

Respond ONLY with a valid JSON object.

Do not use markdown.
Do not wrap the response in \`\`\`.
Do not write explanations before or after the JSON.

Expected format:

{
  "atsScore": 0,  "technicalSkillsMatch": 0,
  "projectsMatch": 0,
  "experienceMatch": 0,
  "educationMatch": 0,  "strengths": [],
  "weaknesses": [],
  "missingKeywords": [],
  "missingSkills": [],
  "suggestions": [],
  "hiringRecommendation": ""
}
`;
};

const cleanJsonResponse = (rawText) => rawText.replace(/```json/g, "").replace(/```/g, "").trim();

const extractJsonObjects = (text) => {
  const objects = [];
  let depth = 0;
  let inString = false;
  let escape = false;
  let start = -1;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (char === '\\' && !escape) {
      escape = true;
      continue;
    }

    if (char === '"' && !escape) {
      inString = !inString;
    }

    if (!inString) {
      if (char === '{') {
        if (depth === 0) start = i;
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
        if (depth === 0 && start !== -1) {
          objects.push(text.slice(start, i + 1));
          start = -1;
        }
      }
    }

    if (escape) escape = false;
  }

  return objects;
};

const parseJsonResponse = (rawText, options = {}) => {
  const cleanedText = cleanJsonResponse(rawText);
  const jsonObjects = extractJsonObjects(cleanedText);
  let index = options.index ?? 0;

  if (jsonObjects.length === 0) {
    return JSON.parse(cleanedText);
  }

  if (index < 0) {
    index = jsonObjects.length + index;
  }

  index = Math.min(Math.max(index, 0), jsonObjects.length - 1);
  const selected = jsonObjects[index];
  return JSON.parse(selected);
};

const normalizeArrayField = (val) => {
  if (Array.isArray(val)) return val;
  if (!val) return [];
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || trimmed.startsWith('"[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // fall through
      }
    }

    return trimmed
      .split(/\r?\n|\u2022|\-|;|\*|\u2023|,\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return [];
};

const buildInterviewFallback = (persona, resumeText, jobDescription) => {
  const cleanText = (text) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 3);

  const resumeWords = cleanText(resumeText);
  const jobWords = cleanText(jobDescription);
  const combined = [...new Set([...jobWords, ...resumeWords])];
  const skillHints = combined.filter((word) => !['experience', 'skills', 'project', 'teams', 'work', 'company'].includes(word)).slice(0, 6);

  const technicalQuestions = skillHints.length
    ? skillHints.map((skill) => `Tell me about your experience with ${skill} and how you used it on a project.`)
    : [
        'Describe a technical challenge you solved recently.',
        'What is your strongest technical skill and how have you applied it?',
      ];

  const projectQuestions = [
    'Tell me about a project you led from start to finish.',
    'How did you measure success on your most recent project?',
    'Describe a situation where you had to adapt your approach on a project.',
  ];

  const hrQuestions = [
    `Why are you interested in this role as a ${persona}?`,
    'How do you handle feedback in a fast-paced work environment?',
    'What motivates you to perform well in a team setting?',
  ];

  return {
    technicalQuestions,
    projectQuestions,
    hrQuestions,
  };
};

const normalizeAnalysisResponse = (parsed) => ({
  atsScore: typeof parsed.atsScore === 'number' ? parsed.atsScore : Number(parsed.atsScore) || 0,
  technicalSkillsMatch: typeof parsed.technicalSkillsMatch === 'number' ? parsed.technicalSkillsMatch : Number(parsed.technicalSkillsMatch) || 0,
  projectsMatch: typeof parsed.projectsMatch === 'number' ? parsed.projectsMatch : Number(parsed.projectsMatch) || 0,
  experienceMatch: typeof parsed.experienceMatch === 'number' ? parsed.experienceMatch : Number(parsed.experienceMatch) || 0,
  educationMatch: typeof parsed.educationMatch === 'number' ? parsed.educationMatch : Number(parsed.educationMatch) || 0,
  strengths: normalizeArrayField(parsed.strengths),
  weaknesses: normalizeArrayField(parsed.weaknesses),
  missingKeywords: normalizeArrayField(parsed.missingKeywords),
  missingSkills: normalizeArrayField(parsed.missingSkills),
  suggestions: normalizeArrayField(parsed.suggestions),
  hiringRecommendation: parsed.hiringRecommendation || parsed.hiring_recommendation || '',
});

const normalizeInterviewResponse = (parsed) => ({
  technicalQuestions: normalizeArrayField(parsed.technicalQuestions || parsed.technical_questions || parsed.technical),
  projectQuestions: normalizeArrayField(parsed.projectQuestions || parsed.project_questions || parsed.projects),
  hrQuestions: normalizeArrayField(parsed.hrQuestions || parsed.hr_questions || parsed.behavioralQuestions || parsed.behavioral_questions || parsed.hr),
});

const analyzeResumeWithAI = async (persona, resumeText, jobDescription) => {
  const prompt = buildPrompt(persona, resumeText, jobDescription);
  const response = await getGroqClient().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: "You are an expert resume reviewer and recruiter persona simulator.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.3,
    max_tokens: 1200,
  });

  const rawText = response.choices[0]?.message?.content || "";

  try {
    const parsed = parseJsonResponse(rawText);
    return normalizeAnalysisResponse(parsed);
  } catch (error) {
    console.error('Failed parsing Groq response:', { error: error.message, rawText });
    throw new Error('Groq response could not be parsed as JSON. See server logs for details.');
  }
};

const rewriteResumeWithAI = async (persona, resumeText, jobDescription) => {
  const prompt = `${personaPrompts[persona] || personaPrompts['ATS Screening Recruiter']}

Resume Text:
${resumeText}

Job Description:
${jobDescription}

Rewrite the resume professionally to improve ATS compatibility, include missing job keywords naturally, improve project descriptions, skills, and summary/objective, and preserve truthful information.

Respond with a single valid JSON object only.

Expected format:
{
  "optimizedResume": "full rewritten resume text"
}
`;

  const response = await getGroqClient().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: "You are an expert resume writer and recruiter persona simulator.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.4,
    max_tokens: 1200,
  });

  const rawText = response.choices[0]?.message?.content || "";

  try {
    const parsed = parseJsonResponse(rawText);
    return {
      optimizedResume: typeof parsed.optimizedResume === 'string' ? parsed.optimizedResume : String(parsed.optimizedResume || ''),
    };
  } catch (error) {
    console.error('Failed parsing Groq rewrite response:', { error: error.message, rawText });
    throw new Error('Groq response could not be parsed as JSON. See server logs for details.');
  }
};

const buildInterviewPrompt = (persona, resumeText, jobDescription) => {
  const personaContext = {
    'ATS Screening Recruiter': 'an ATS-focused recruiter who evaluates keyword alignment and resume compatibility',
    'Technical Recruiter': 'a technical recruiter who focuses on coding skills, system design, and practical problem-solving',
    'Startup Founder': 'a startup founder who values initiative, ownership, real-world impact, and entrepreneurial mindset',
    'HR Recruiter': 'an HR recruiter who focuses on communication, cultural fit, teamwork, and professional behavior',
    'Product Company Recruiter': 'a product company recruiter who assesses DSA, system design, and scalability thinking',
  };

  const context = personaContext[persona] || personaContext['ATS Screening Recruiter'];

  return `You are ${context}. Your task is ONLY to generate interview questions — do NOT analyze the resume.

Resume:
${resumeText}

Job Description:
${jobDescription}

Generate 4–5 questions for each category below, tailored to the resume and job description.

Respond ONLY with a valid JSON object. Do not use markdown. Do not explain. No text before or after the JSON.

{
  "technicalQuestions": ["question1", "question2", "question3", "question4"],
  "projectQuestions": ["question1", "question2", "question3", "question4"],
  "hrQuestions": ["question1", "question2", "question3", "question4"]
}`;
};

const generateInterviewQuestionsWithAI = async (persona, resumeText, jobDescription) => {
  const prompt = buildInterviewPrompt(persona, resumeText, jobDescription);

  let rawText = "";

  try {
    const response = await getGroqClient().chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are an expert interview coach and recruiter persona simulator.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.4,
      max_tokens: 1200,
    });

    rawText = response.choices[0]?.message?.content || "";
  } catch (error) {
    console.error('Groq interview generation failed:', {
      message: error.message,
      status: error.status,
      type: error.type,
      code: error.code,
    });
    return buildInterviewFallback(persona, resumeText, jobDescription);
  }

  try {
    const parsed = parseJsonResponse(rawText);
    return normalizeInterviewResponse(parsed);
  } catch (error) {
    console.error('Failed parsing Groq interview response:', { error: error.message, rawText });
    // Try parsing the last JSON block if multiple JSON objects were returned.
    try {
      const parsed = parseJsonResponse(rawText, { index: -1 });
      return normalizeInterviewResponse(parsed);
    } catch (fallbackError) {
      console.error('Fallback interview JSON parsing failed:', { error: fallbackError.message });
      return buildInterviewFallback(persona, resumeText, jobDescription);
    }
  }
};

module.exports = {
  analyzeResumeWithAI,
  rewriteResumeWithAI,
  generateInterviewQuestionsWithAI,
};
