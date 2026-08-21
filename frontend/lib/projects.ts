import type { Project } from "./types";

export const dashboardProjects: Project[] = [
  {
    id: "ai-model-arena",
    name: "AI Model Arena",
    description:
      "A debate-style workspace.",
    route: "/arena",
    backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:5000",
    status: "Ready to connect",
    owner: "ehud_ust",
    allowedUsers: ["gopinath_ust", "nazar_ust", "ehud_ust"],
  },
  {
    id: "ai-tutor",
    name: "AI Tutor",
    description:
      "A personalized learning experience",
    route: "/tutor",
    backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:5000",
    status: "Ready to connect",
    owner: "navaneeth_ust",
    allowedUsers: ["gopinath_ust", "nazar_ust", "navaneeth_ust"],
  },
  {
    id: "translator",
    name: "Japanese Translator",
    description:
      "Translate Japanese text to English.",
    route: "/translator",
    backendUrl:
      process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:5000",
    status: "Ready to connect",
    owner: "rohit_ust",
    allowedUsers: ["gopinath_ust", "nazar_ust", "rohit_ust"],
  },
  {
    id: "voice-doc-generator",
    name: "Voice Doc Generator",
    description:
      "Turn spoken notes into structured business documents.",
    route: "/voice-doc-generator",
    backendUrl:
      process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:5000",
    status: "Ready to connect",
    owner: "ritika_ust",
    allowedUsers: ["gopinath_ust", "nazar_ust", "ritika_ust"],
  },
  {
    id: "ui-generator",
    name: "Sketch To UI Generator",
    description:
      "Turn sketches into responsive UI using AI-powered design generation.",
    route: "/ui-generator",
    backendUrl:
      process.env.NEXT_PUBLIC_BACKEND_URL ??
      "http://127.0.0.1:5000",
    status: "Ready to connect",
    owner: "hemanth_ust",
    allowedUsers: ["gopinath_ust", "nazar_ust", "hemanth_ust"],
  },
  {
    id: "ai-whiteboard-cam",
    name: "AI Whiteboard Cam",
    description: "Convert whiteboard photos into interactive diagrams.",
    route: "/whiteboard-cam",
    backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:5000",
    status: "Ready to connect",
    owner: "nagarajan_ust",
    allowedUsers: ["gopinath_ust", "nazar_ust", "nagarajan_ust"],
  },
];
