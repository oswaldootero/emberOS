import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Sparkles,
  Recycle,
  Calendar,
  Globe,
  TrendingUp,
  Heart,
  Library,
  LineChart,
  Package,
  Settings,
  Users,
  UserCog,
  Workflow,
  Briefcase,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  description?: string;
  adminOnly?: boolean;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

export const navigation: NavSection[] = [
  {
    label: "Operations",
    items: [
      {
        label: "Mission Control",
        href: "/dashboard",
        icon: LayoutDashboard,
        description: "The cinematic command center",
      },
      {
        label: "AI Content Studio",
        href: "/studio",
        icon: Sparkles,
        description: "Generate captions, blogs, devotionals",
      },
      {
        label: "Repurpose Engine",
        href: "/repurpose",
        icon: Recycle,
        description: "One asset → every channel",
      },
      {
        label: "Calendar",
        href: "/calendar",
        icon: Calendar,
        description: "Schedule + campaigns",
      },
    ],
  },
  {
    label: "Business",
    items: [
      {
        label: "CRM & Orders",
        href: "/crm",
        icon: Briefcase,
        description: "Retailers, lounges, distributors, orders",
      },
      {
        label: "Inventory",
        href: "/inventory",
        icon: Package,
        description: "SKUs, stock levels, reorder alerts",
      },
      {
        label: "Forecasting",
        href: "/forecasting",
        icon: LineChart,
        description: "Revenue, margins, scenarios",
      },
    ],
  },
  {
    label: "Channels",
    items: [
      {
        label: "Telegram",
        href: "/telegram",
        icon: Users,
        description: "Brotherhood community ops",
      },
      {
        label: "WordPress",
        href: "/wordpress",
        icon: Globe,
        description: "Blog + SEO publishing",
      },
    ],
  },
  {
    label: "Insight",
    items: [
      {
        label: "Analytics",
        href: "/analytics",
        icon: TrendingUp,
        description: "Performance across channels",
      },
    ],
  },
  {
    label: "Brand & System",
    items: [
      {
        label: "Brand Voice",
        href: "/brand-voice",
        icon: Heart,
        description: "Tone memory + guardrails",
      },
      {
        label: "Asset Library",
        href: "/library",
        icon: Library,
        description: "Images, video, audio, PDFs",
      },
      {
        label: "Workflows",
        href: "/workflows",
        icon: Workflow,
        description: "Automation when content publishes",
      },
      {
        label: "Team",
        href: "/settings/team",
        icon: UserCog,
        description: "Invite-only access",
        adminOnly: true,
      },
      {
        label: "Settings",
        href: "/settings",
        icon: Settings,
      },
    ],
  },
];
