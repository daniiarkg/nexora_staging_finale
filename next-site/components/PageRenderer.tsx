import Link from "next/link";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { LeadForm } from "./LeadForm";
import { LottieHero } from "./LottieHero";
import type { CourseContent, PageContent, PageSection, SiteContent } from "@/lib/types";

function externalProps(href: string) {
  return href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {};
}

function ButtonPair({ primary, secondary }: PageContent["hero"]) {
  return (
    <div className="hero-actions">
      <Link className="primary-button" href={primary.href} {...externalProps(primary.href)}>
        {primary.label}
      </Link>
      {secondary ? (
        <Link className="secondary-button" href={secondary.href} {...externalProps(secondary.href)}>
          {secondary.label}
        </Link>
      ) : null}
    </div>
  );
}

function Hero({ page }: { page: PageContent }) {
  return (
    <section className={`hero ${page.hero.className}`}>
      {page.hero.orbit ? (
        <div className="hero-bg" aria-hidden="true">
          {page.hero.orbit.map((item, index) => (
            <div key={item} className={`orbit-card orbit-${["one", "two", "three", "four"][index] || "one"}`}>
              {item}
            </div>
          ))}
        </div>
      ) : null}
      <div className="hero-content reveal">
        <p className="eyebrow">{page.hero.eyebrow}</p>
        <h1>{page.hero.title}</h1>
        <p>{page.hero.text}</p>
        <ButtonPair {...page.hero} />
      </div>
      {page.theme === "nfc" ? <LottieHero /> : null}
    </section>
  );
}

function CardsSection({ section, product }: { section: PageSection; product?: boolean }) {
  return (
    <section id={section.id} className="section-shell section-block">
      <div className="section-heading reveal">
        <p className="eyebrow">{section.eyebrow}</p>
        <h2>{section.title}</h2>
      </div>
      <div className={product ? "product-grid" : "service-grid"}>
        {(section.cards || []).map((card) => {
          const className = product ? "product-card reveal" : "service-card reveal";
          const content = (
            <>
              <span>{card.kicker}</span>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </>
          );

          return card.href ? (
            <Link key={card.title} className={className} href={card.href}>
              {content}
            </Link>
          ) : (
            <article key={card.title} className={className}>
              {content}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function TimelineSection({ section }: { section: PageSection }) {
  return (
    <section id={section.id} className="section-shell split-section">
      <div className="split-copy reveal">
        <p className="eyebrow">{section.eyebrow}</p>
        <h2>{section.title}</h2>
        <p>{section.text}</p>
      </div>
      <div className="timeline reveal">
        {(section.items || []).map((item) => (
          "title" in item ? (
            <article key={item.title}>
              <b>{item.kicker}</b>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ) : null
        ))}
      </div>
    </section>
  );
}

function BenefitsSection({ section }: { section: PageSection }) {
  return (
    <section className="section-shell split-section">
      <div className="split-copy reveal">
        <p className="eyebrow">{section.eyebrow}</p>
        <h2>{section.title}</h2>
        <p>{section.text}</p>
      </div>
      <div className="benefit-grid reveal">
        {(section.items || []).map((item) => (
          "title" in item ? (
            <article key={item.title}>
              <b>{item.kicker}</b>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ) : null
        ))}
      </div>
    </section>
  );
}

function MetricsSection({ section }: { section: PageSection }) {
  return (
    <section className="section-shell metric-band reveal">
      {(section.items || []).map((item) => (
        "value" in item ? (
          <div key={item.value}>
            <b>{item.value}</b>
            <span>{item.label}</span>
          </div>
        ) : null
      ))}
    </section>
  );
}

function MockSection({ section }: { section: PageSection }) {
  return (
    <section className="section-shell split-section">
      <div className="split-copy reveal">
        <p className="eyebrow">{section.eyebrow}</p>
        <h2>{section.title}</h2>
        <p>{section.text}</p>
      </div>
      <div className="phone-mock reveal">
        <div>
          <img src="/assets/nexora-text-logo.svg" alt="Nexora" />
          <h3>{section.mockTitle}</h3>
          <p>{section.mockText}</p>
        </div>
      </div>
    </section>
  );
}

function DocumentsSection({ section }: { section: PageSection }) {
  return (
    <section className="section-shell split-section">
      <div className="split-copy reveal">
        <p className="eyebrow">{section.eyebrow}</p>
        <h2>{section.title}</h2>
        <p>{section.text}</p>
      </div>
      <div className="document-stack reveal">
        <article />
        <article />
        <article />
      </div>
    </section>
  );
}

function SectionRenderer({ section }: { section: PageSection }) {
  if (section.type === "cards") return <CardsSection section={section} product />;
  if (section.type === "services") return <CardsSection section={section} />;
  if (section.type === "timeline") return <TimelineSection section={section} />;
  if (section.type === "metrics") return <MetricsSection section={section} />;
  if (section.type === "benefits") return <BenefitsSection section={section} />;
  if (section.type === "mock") return <MockSection section={section} />;
  if (section.type === "documents") return <DocumentsSection section={section} />;
  return null;
}

function CoursesGrid({ courses, settings }: { courses: CourseContent[]; settings: SiteContent["settings"] }) {
  const labels = settings.ui!;

  return (
    <div className="course-grid">
      {courses.map((course) => (
        <article className="course-card reveal" key={course.slug}>
          <img src={course.image} alt={`Обложка курса ${course.title}`} />
          <div>
            <h3>{course.title}</h3>
            <p>{course.description}</p>
            <ul>
              {course.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
            <div className="course-actions">
              <Link className="secondary-button" href={`/courses/${course.slug}`}>
                {labels.courseDetailsButton}
              </Link>
              <Link className="primary-button" href={`/courses/${course.slug}#lead`}>
                {labels.courseEnrollButton}
              </Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function LeadSection({ page, settings }: { page: PageContent; settings: SiteContent["settings"] }) {
  return (
    <section id="lead" className="section-shell cta-section">
      <div className="cta-copy reveal">
        <p className="eyebrow">{page.lead.eyebrow}</p>
        <h2>{page.lead.title}</h2>
      </div>
      <LeadForm accessKey={settings.web3formsAccessKey} interest={page.lead.interest} button={page.lead.button} labels={settings.form!} />
    </section>
  );
}

export function SitePage({ content, pageKey }: { content: SiteContent; pageKey: keyof SiteContent["pages"] }) {
  const page = content.pages[pageKey as string];
  const dark = page.theme === "courses";

  return (
    <div className={`page-root theme-${page.theme}`}>
      <Header settings={content.settings} active={page.slug} cta={page.navCta} dark={dark} />
      <main>
        <Hero page={page} />
        {pageKey === "courses" ? (
          <section id="courses" className="section-shell section-block">
            <div className="section-heading reveal">
              <p className="eyebrow">{content.settings.ui!.coursesGridEyebrow}</p>
              <h2>{page.coursesTitle}</h2>
            </div>
            <CoursesGrid courses={content.courses} settings={content.settings} />
          </section>
        ) : null}
        {page.sections.map((section, index) => (
          <SectionRenderer key={`${section.type}-${section.id || index}`} section={section} />
        ))}
        <LeadSection page={page} settings={content.settings} />
      </main>
      <Footer settings={content.settings} dark={dark} />
    </div>
  );
}

export function CoursePage({ content, course }: { content: SiteContent; course: CourseContent }) {
  const coursesPage = content.pages.courses;
  const labels = content.settings.ui!;

  return (
    <div className="page-root theme-courses">
      <Header settings={content.settings} active="courses" cta={labels.courseEnrollButton} dark />
      <main>
        <section className="hero course-detail-hero">
          <div className="hero-content reveal">
            <p className="eyebrow">{labels.courseDetailEyebrow}</p>
            <h1>{course.title}</h1>
            <p>{course.detailText}</p>
            <div className="hero-actions">
              <a className="primary-button" href="#lead">
                {labels.courseEnrollButton}
              </a>
              <Link className="secondary-button" href="/courses">
                {labels.allCoursesLabel}
              </Link>
            </div>
          </div>
        </section>
        <section className="section-shell course-detail-grid">
          <article className="detail-panel reveal">
            <p className="eyebrow">{labels.courseProgramEyebrow}</p>
            <h2>{labels.courseProgramTitle}</h2>
            <ol>
              {course.program.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </article>
          <article className="detail-panel reveal">
            <p className="eyebrow">{labels.courseResultsEyebrow}</p>
            <h2>{labels.courseResultsTitle}</h2>
            <ul>
              {course.results.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </section>
        <section id="lead" className="section-shell cta-section">
          <div className="cta-copy reveal">
            <p className="eyebrow">{labels.courseLeadEyebrow}</p>
            <h2>{course.leadTitle}</h2>
          </div>
          <LeadForm
            accessKey={content.settings.web3formsAccessKey}
            interest={`Курс: ${course.title}`}
            button={coursesPage.lead.button || labels.courseEnrollButton}
            labels={content.settings.form!}
          />
        </section>
      </main>
      <Footer settings={content.settings} dark />
    </div>
  );
}
