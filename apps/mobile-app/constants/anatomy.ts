import { ViewMode } from "../types/viewer";

export type AnatomySystem = {
  key: ViewMode;
  label: string;
  shortLabel: string;
  description: string;
  icon: string; // emoji used as a lightweight icon
};

export const ANATOMY_SYSTEMS: AnatomySystem[] = [
  {
    key:         "full_body",
    label:       "Full Body",
    shortLabel:  "Full",
    description: "Overview of all body systems together",
    icon:        "🧍",
  },
  {
    key:         "skeleton",
    label:       "Skeleton",
    shortLabel:  "Bones",
    description: "The skeletal framework that supports the body",
    icon:        "🦴",
  },
  {
    key:         "muscular",
    label:       "Muscles",
    shortLabel:  "Muscles",
    description: "Muscles that enable movement and stability",
    icon:        "💪",
  },
  {
    key:         "nervous_system",
    label:       "Nervous System",
    shortLabel:  "Nerves",
    description: "Brain, spinal cord, and nerve network",
    icon:        "⚡",
  },
  {
    key:         "circulatory",
    label:       "Circulatory",
    shortLabel:  "Blood",
    description: "Heart, arteries, veins, and blood flow",
    icon:        "🩸",
  },
  {
    key:         "respiratory",
    label:       "Respiratory",
    shortLabel:  "Lungs",
    description: "Lungs and the airways that carry oxygen",
    icon:        "🫁",
  },
  {
    key:         "digestive",
    label:       "Digestive",
    shortLabel:  "Digest",
    description: "Organs that process food and absorb nutrients",
    icon:        "🌿",
  },
  {
    key:         "brain",
    label:       "Brain",
    shortLabel:  "Brain",
    description: "The central organ of the nervous system",
    icon:        "🧠",
  },
  {
    key:         "heart",
    label:       "Heart",
    shortLabel:  "Heart",
    description: "The muscular pump that drives circulation",
    icon:        "❤️",
  },
  {
    key:         "spine",
    label:       "Spine",
    shortLabel:  "Spine",
    description: "The vertebral column protecting the spinal cord",
    icon:        "🔗",
  },
];

export const SUGGESTED_QUESTIONS = [
  "What does the heart do?",
  "How does blood move through the body?",
  "What protects the brain?",
  "Where are the lungs located?",
  "What is the role of the spinal cord?",
  "How do muscles work?",
  "What does the nervous system control?",
  "How does the digestive system process food?",
];

export const getSystemByKey = (key: ViewMode): AnatomySystem =>
  ANATOMY_SYSTEMS.find((s) => s.key === key) ?? ANATOMY_SYSTEMS[0];
