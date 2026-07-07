export type ButtonLink = {
  label: string;
  href: string;
};

export type CardItem = {
  kicker: string;
  title: string;
  text: string;
  href?: string;
};

export type HeroContent = {
  className: string;
  eyebrow: string;
  title: string;
  text: string;
  primary: ButtonLink;
  secondary?: ButtonLink;
  orbit?: string[];
};

export type LeadContent = {
  eyebrow: string;
  title: string;
  interest: string;
  button: string;
};

export type PageSection = {
  type: "cards" | "services" | "timeline" | "metrics" | "benefits" | "mock" | "documents";
  id?: string;
  eyebrow?: string;
  title?: string;
  text?: string;
  cards?: CardItem[];
  items?: CardItem[] | Array<{ value: string; label: string }>;
  mockTitle?: string;
  mockText?: string;
};

export type PageContent = {
  slug: string;
  theme: string;
  seo: {
    title: string;
    description: string;
  };
  navCta: string;
  hero: HeroContent;
  coursesTitle?: string;
  sections: PageSection[];
  lead: LeadContent;
};

export type CourseContent = {
  slug: string;
  title: string;
  image: string;
  description: string;
  bullets: string[];
  detailText: string;
  program: string[];
  results: string[];
  leadTitle: string;
};

export type UiLabels = {
  coursesGridEyebrow: string;
  courseDetailsButton: string;
  courseEnrollButton: string;
  courseDetailEyebrow: string;
  courseProgramEyebrow: string;
  courseProgramTitle: string;
  courseResultsEyebrow: string;
  courseResultsTitle: string;
  courseLeadEyebrow: string;
  allCoursesLabel: string;
};

export type LeadFormText = {
  nameLabel: string;
  emailLabel: string;
  phoneLabel: string;
  pendingStatus: string;
  successStatus: string;
  fallbackStatus: string;
  messageIntro: string;
  interestFallback: string;
  subjectPrefix: string;
  fromName: string;
};

export type SiteContent = {
  settings: {
    brandLogo: string;
    brandLogoDark: string;
    footerLogo: string;
    footerLogoDark: string;
    web3formsAccessKey: string;
    footerText: string;
    ui?: UiLabels;
    form?: LeadFormText;
    nav: ButtonLink[];
  };
  pages: Record<string, PageContent>;
  courses: CourseContent[];
};

export type CmsPayload = {
  content: SiteContent;
  lottieJsonText: string;
};
