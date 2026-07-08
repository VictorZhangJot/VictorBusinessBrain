// ─────────────────────────────────────────────────────────────────────────────
// JOT AI Resume Builder — suggestion engine content
//
// This file is the "brain" of the app. Every role category below carries:
//   summaries        — 3 career-summary templates ({years}, {strengths},
//                      {industries} are filled in from the candidate's answers)
//   responsibilities — selectable bullets, each in 3 versions
//   skills           — clickable skill suggestions
//   certifications   — suggested certifications for the role
//   atsKeywords      — words the ATS checker looks for
//   strengths        — clickable strength chips for the summary step
//
// Edit the wording here to change what candidates see. No code knowledge
// needed — keep the quotes and commas intact.
// ─────────────────────────────────────────────────────────────────────────────

export const ROLES = [
  {
    id: "ai-engineer",
    label: "AI Engineer",
    detect: ["ai engineer", "artificial intelligence", "genai", "llm", "ai developer"],
    strengths: ["Machine learning", "Python development", "Problem solving", "Stakeholder communication", "Cloud deployment", "Data pipelines", "Model evaluation"],
    summaries: {
      professional:
        "AI Engineer with {years} of experience across {industries}. Skilled in {strengths}, with hands-on experience taking machine learning models from experimentation to production. Focused on building reliable, well-documented AI solutions that solve real business problems.",
      achievement:
        "AI Engineer with {years} of experience delivering machine learning solutions across {industries}. Known for {strengths}, with a track record of shipping models that improve decision-making, automate manual work and create measurable business value.",
      technical:
        "AI Engineer specialising in machine learning model development, data pipelines and cloud deployment. {years} of experience across {industries}, working with Python, SQL and modern ML frameworks. Strong in {strengths}, from data preparation through to model monitoring in production.",
      fresh:
        "Recent graduate targeting AI Engineer roles, with strong foundations in machine learning, Python and data analysis built through coursework and hands-on projects. Brings {strengths} and a genuine interest in applying AI to practical business problems in {industries}.",
    },
    responsibilities: [
      {
        basic: "Built and deployed machine learning models.",
        stronger: "Developed and deployed machine learning models for business use cases, from data preparation through to production release.",
        achievement: "Developed and deployed machine learning models that automated manual decision-making, improving turnaround time and consistency for business teams.",
      },
      {
        basic: "Worked on data preprocessing.",
        stronger: "Built data preprocessing and feature engineering pipelines to improve model accuracy and training reliability.",
        achievement: "Built reusable data preprocessing pipelines that reduced model preparation effort and improved prediction quality across projects.",
      },
      {
        basic: "Used Python, SQL and cloud platforms.",
        stronger: "Worked with Python, SQL and cloud platforms (AWS/Azure) to develop, test and support AI initiatives.",
        achievement: "Applied Python, SQL and cloud services to deliver AI solutions on schedule, supporting the team's move from proof-of-concept to production systems.",
      },
      {
        basic: "Talked to stakeholders about AI projects.",
        stronger: "Collaborated with business stakeholders to translate operational problems into well-scoped AI and machine learning solutions.",
        achievement: "Partnered with business stakeholders to scope and deliver AI use cases, ensuring solutions matched real operational needs and were adopted by end users.",
      },
      {
        basic: "Tested and monitored models.",
        stronger: "Evaluated, tested and monitored model performance in production, retraining models when data or business conditions changed.",
        achievement: "Set up model evaluation and monitoring practices that caught performance drift early, keeping production models accurate and trusted by the business.",
      },
      {
        basic: "Wrote documentation for AI systems.",
        stronger: "Documented model design, data sources and known limitations so systems could be maintained and audited by other engineers.",
        achievement: "Produced clear model documentation and handover materials that shortened onboarding for new team members and supported internal audit requirements.",
      },
    ],
    skills: ["Python", "SQL", "Machine Learning", "Deep Learning", "NLP", "Data Analysis", "TensorFlow", "PyTorch", "AWS", "Azure", "Git", "Docker", "API Integration", "MLOps"],
    certifications: ["AWS Certified Machine Learning – Specialty", "Microsoft Azure AI Engineer Associate", "Google Professional Machine Learning Engineer", "DeepLearning.AI Specialization", "NUS/NTU/SMU AI or Data Science certificate"],
    atsKeywords: ["machine learning", "python", "sql", "deep learning", "model", "cloud", "deployment", "data pipeline", "nlp", "ai"],
  },
  {
    id: "data-analyst",
    label: "Data Analyst",
    detect: ["data analyst", "business analyst", "analytics", "bi analyst", "business intelligence"],
    strengths: ["Data storytelling", "SQL and dashboards", "Attention to detail", "Business communication", "Statistical analysis", "Process improvement"],
    summaries: {
      professional:
        "Data Analyst with {years} of experience across {industries}. Skilled in {strengths}, turning raw data into clear reports and dashboards that support day-to-day business decisions.",
      achievement:
        "Data Analyst with {years} of experience across {industries}. Known for {strengths}, with a record of building dashboards and analyses that saved teams manual reporting time and surfaced insights leadership acted on.",
      technical:
        "Data Analyst specialising in SQL, dashboarding and statistical analysis. {years} of experience across {industries}, comfortable across the full workflow — data extraction, cleaning, analysis and presentation. Strong in {strengths}.",
      fresh:
        "Recent graduate targeting Data Analyst roles, with solid grounding in SQL, Excel and data visualisation built through coursework and projects. Brings {strengths} and a practical, business-first approach to analysis in {industries}.",
    },
    responsibilities: [
      {
        basic: "Made reports and dashboards.",
        stronger: "Built recurring reports and interactive dashboards to track key business metrics for management and operational teams.",
        achievement: "Built dashboards that replaced manual weekly reporting, giving managers same-day visibility of key business metrics.",
      },
      {
        basic: "Cleaned and prepared data.",
        stronger: "Extracted, cleaned and validated data from multiple systems to ensure analyses were accurate and consistent.",
        achievement: "Standardised data cleaning steps across recurring reports, reducing errors and rework in month-end reporting.",
      },
      {
        basic: "Did ad-hoc analysis for the business.",
        stronger: "Performed ad-hoc analyses to answer business questions on sales, operations and customer behaviour.",
        achievement: "Delivered ad-hoc analyses that identified underperforming segments and informed pricing and campaign decisions.",
      },
      {
        basic: "Worked with different departments.",
        stronger: "Partnered with sales, finance and operations teams to define metrics and translate business questions into analysis.",
        achievement: "Worked with department heads to agree on shared metric definitions, ending conflicting numbers across team reports.",
      },
      {
        basic: "Presented findings to management.",
        stronger: "Presented findings and recommendations to management in clear, non-technical language.",
        achievement: "Presented analysis to senior management that directly shaped quarterly planning decisions.",
      },
    ],
    skills: ["SQL", "Excel", "Power BI", "Tableau", "Python", "Data Visualisation", "Statistical Analysis", "Data Cleaning", "Reporting", "Stakeholder Management", "Google Analytics", "Looker"],
    certifications: ["Microsoft Power BI Data Analyst (PL-300)", "Tableau Desktop Specialist", "Google Data Analytics Certificate", "AWS Certified Data Analytics", "SkillsFuture data analytics courses (SG)"],
    atsKeywords: ["sql", "dashboard", "excel", "power bi", "tableau", "reporting", "analysis", "data", "visualisation", "metrics"],
  },
  {
    id: "ml-engineer",
    label: "Machine Learning Engineer",
    detect: ["machine learning engineer", "ml engineer", "mlops"],
    strengths: ["Model deployment", "Python engineering", "MLOps", "System design", "Data pipelines", "Cross-team collaboration"],
    summaries: {
      professional:
        "Machine Learning Engineer with {years} of experience across {industries}. Skilled in {strengths}, building and maintaining the systems that take models from notebooks into reliable production services.",
      achievement:
        "Machine Learning Engineer with {years} of experience across {industries}. Known for {strengths}, with a record of shipping production ML systems that run reliably at scale and shortening the path from experiment to release.",
      technical:
        "Machine Learning Engineer focused on production ML — training pipelines, deployment, monitoring and MLOps tooling. {years} of experience across {industries}, working with Python, containers and cloud infrastructure. Strong in {strengths}.",
      fresh:
        "Recent graduate targeting Machine Learning Engineer roles, with strong foundations in Python, ML frameworks and software engineering practice from coursework and personal projects. Brings {strengths} and a focus on writing production-quality code in {industries}.",
    },
    responsibilities: [
      {
        basic: "Deployed machine learning models.",
        stronger: "Packaged and deployed machine learning models as APIs and batch services in cloud environments.",
        achievement: "Deployed ML models as production services with automated testing and rollback, reducing failed releases and manual deployment effort.",
      },
      {
        basic: "Built training pipelines.",
        stronger: "Built automated training and retraining pipelines covering data validation, feature generation and model evaluation.",
        achievement: "Automated the model retraining pipeline end to end, cutting the retraining cycle from days of manual work to a scheduled job.",
      },
      {
        basic: "Monitored models in production.",
        stronger: "Implemented monitoring for model performance, data drift and service health in production.",
        achievement: "Introduced drift and performance monitoring that caught degrading models before business teams were affected.",
      },
      {
        basic: "Worked with data scientists.",
        stronger: "Collaborated with data scientists to productionise prototypes, improving code quality, speed and reliability.",
        achievement: "Partnered with data scientists to move prototypes into production faster by providing shared templates and deployment tooling.",
      },
      {
        basic: "Managed cloud infrastructure for ML.",
        stronger: "Managed cloud infrastructure for ML workloads, including compute, storage and cost optimisation.",
        achievement: "Right-sized training and serving infrastructure, reducing cloud spend while maintaining performance targets.",
      },
    ],
    skills: ["Python", "SQL", "TensorFlow", "PyTorch", "Docker", "Kubernetes", "AWS", "Azure", "CI/CD", "MLOps", "Airflow", "Git", "API Development", "Model Monitoring"],
    certifications: ["AWS Certified Machine Learning – Specialty", "Google Professional Machine Learning Engineer", "Microsoft Azure AI Engineer Associate", "Kubernetes (CKA/CKAD)", "Databricks ML certifications"],
    atsKeywords: ["machine learning", "python", "deployment", "mlops", "pipeline", "docker", "kubernetes", "cloud", "monitoring", "production"],
  },
  {
    id: "dc-engineer",
    label: "Data Centre Engineer",
    detect: ["data centre engineer", "data center engineer", "facilities engineer", "critical facilities", "dc engineer", "m&e engineer"],
    strengths: ["Preventive maintenance", "Incident response", "Vendor coordination", "Electrical systems", "Cooling systems", "Safety compliance", "Shift operations"],
    summaries: {
      professional:
        "Data Centre Engineer with {years} of experience across {industries}. Skilled in {strengths}, supporting the power, cooling and monitoring systems that keep critical facilities running around the clock.",
      achievement:
        "Data Centre Engineer with {years} of experience in critical facilities across {industries}. Known for {strengths}, with a record of maintaining high uptime through disciplined preventive maintenance and fast, calm incident response.",
      technical:
        "Data Centre Engineer with hands-on experience across UPS, PDU, CRAC/CRAH, BMS and fire suppression systems. {years} of experience across {industries}, covering preventive maintenance, incident response and vendor-managed works. Strong in {strengths}.",
      fresh:
        "Entry-level engineer targeting Data Centre roles, with a foundation in electrical and mechanical systems from studies and practical training. Brings {strengths} and a strong commitment to safety and operational discipline in {industries}.",
    },
    responsibilities: [
      {
        basic: "Responsible for maintaining data centre equipment.",
        stronger: "Maintained critical data centre infrastructure including power, cooling and monitoring systems to support stable operations.",
        achievement: "Performed preventive maintenance and troubleshooting for critical data centre infrastructure, helping to reduce downtime and improve operational reliability.",
      },
      {
        basic: "Monitored data centre systems.",
        stronger: "Monitored critical data centre infrastructure including power, cooling and network systems through BMS and DCIM tools.",
        achievement: "Monitored facility systems around the clock and escalated anomalies early, preventing minor faults from becoming service-affecting incidents.",
      },
      {
        basic: "Did maintenance on UPS and cooling units.",
        stronger: "Performed preventive maintenance on UPS, CRAC, PDU and related facilities equipment according to schedule.",
        achievement: "Completed scheduled preventive maintenance on UPS, CRAC and PDU systems with zero missed windows, supporting uptime commitments to clients.",
      },
      {
        basic: "Responded to incidents.",
        stronger: "Supported incident response and root-cause follow-up to maintain uptime and operational reliability.",
        achievement: "Responded to facility incidents within SLA, containing faults quickly and contributing to root-cause reviews that prevented repeats.",
      },
      {
        basic: "Worked with vendors.",
        stronger: "Coordinated with vendors and internal teams for equipment installation, servicing and troubleshooting.",
        achievement: "Supervised vendor works in live environments, ensuring method statements and permits were followed with no safety or service incidents.",
      },
      {
        basic: "Followed safety procedures.",
        stronger: "Complied with EHS procedures, permit-to-work and change management processes in a live critical environment.",
        achievement: "Maintained a clean safety record by enforcing permit-to-work and change control discipline during high-risk maintenance activities.",
      },
    ],
    skills: ["Data Centre Operations", "UPS", "PDU", "CRAC / CRAH", "HVAC", "BMS", "Fire Suppression Systems", "Structured Cabling", "Network Infrastructure", "Incident Management", "Preventive Maintenance", "Vendor Coordination", "Permit to Work", "DCIM"],
    certifications: ["CDCP (Certified Data Centre Professional)", "SCEM / Singapore Certified Energy Manager", "NFPA / fire safety training", "BCA / WSQ electrical certifications", "Uptime Institute ATD/ATS awareness"],
    atsKeywords: ["data centre", "ups", "pdu", "crac", "preventive maintenance", "bms", "incident", "uptime", "cooling", "vendor"],
  },
  {
    id: "dc-ops-manager",
    label: "Data Centre Operations Manager",
    detect: ["data centre operations manager", "data center operations manager", "dc operations", "facilities manager", "critical facilities manager"],
    strengths: ["Team leadership", "Uptime management", "Vendor management", "Budget control", "Client management", "Process improvement", "Crisis management"],
    summaries: {
      professional:
        "Data Centre Operations Manager with {years} of experience across {industries}. Skilled in {strengths}, leading shift teams and vendors to run critical facilities safely, compliantly and without surprises.",
      achievement:
        "Data Centre Operations Manager with {years} of experience across {industries}. Known for {strengths}, with a record of sustaining high availability, passing client and certification audits, and developing dependable operations teams.",
      technical:
        "Data Centre Operations Manager covering M&E operations, maintenance programmes, incident management and compliance. {years} of experience across {industries}, managing teams, vendors and budgets in live critical environments. Strong in {strengths}.",
      fresh:
        "Operations professional stepping up to Data Centre Operations Manager responsibilities, with {years} of experience in critical facilities across {industries}. Brings {strengths} and a hands-on understanding of what keeps facilities running.",
    },
    responsibilities: [
      {
        basic: "Managed data centre operations.",
        stronger: "Managed day-to-day data centre operations including shift coverage, maintenance planning and incident escalation.",
        achievement: "Ran daily operations for a live data centre, sustaining availability targets while keeping maintenance and audits on schedule.",
      },
      {
        basic: "Led a team of engineers.",
        stronger: "Led and rostered a team of facility engineers and technicians, covering 24/7 shift operations and on-call escalation.",
        achievement: "Built and developed a 24/7 operations team, improving shift handover discipline and reducing repeat operational errors.",
      },
      {
        basic: "Handled vendors and contracts.",
        stronger: "Managed maintenance vendors and service contracts, reviewing scope, performance and compliance with SLAs.",
        achievement: "Renegotiated and tightened vendor maintenance contracts, improving response times while keeping costs within budget.",
      },
      {
        basic: "Handled incidents and reports.",
        stronger: "Owned incident management end to end — response, client communication, root-cause analysis and corrective action tracking.",
        achievement: "Led incident response and client communications during critical events, closing corrective actions that prevented recurrence.",
      },
      {
        basic: "Managed budgets.",
        stronger: "Planned and controlled operational budgets covering maintenance, manpower, spares and utilities.",
        achievement: "Managed the facility operations budget, finding savings in maintenance and energy without compromising reliability.",
      },
      {
        basic: "Prepared for audits.",
        stronger: "Prepared the facility for client audits and certifications (ISO, SS 564, Uptime), maintaining documentation and compliance evidence.",
        achievement: "Led the site through client and certification audits with zero major findings, maintaining required certifications year on year.",
      },
    ],
    skills: ["Data Centre Operations", "Team Leadership", "Incident Management", "Vendor Management", "Budget Management", "SLA Management", "UPS", "HVAC", "BMS", "Change Management", "Audit & Compliance", "Capacity Planning", "EHS / Workplace Safety"],
    certifications: ["CDCP / CDCS (Certified Data Centre Specialist)", "Uptime Institute Accredited Operations Specialist", "ITIL Foundation", "PMP", "bizSAFE / WSH certifications (SG)"],
    atsKeywords: ["data centre", "operations", "uptime", "sla", "vendor", "incident", "team", "budget", "audit", "maintenance"],
  },
  {
    id: "cloud-engineer",
    label: "Cloud Engineer",
    detect: ["cloud engineer", "devops", "infrastructure engineer", "platform engineer", "site reliability", "sre"],
    strengths: ["Cloud architecture", "Automation", "Infrastructure as code", "Troubleshooting", "Security awareness", "Cost optimisation"],
    summaries: {
      professional:
        "Cloud Engineer with {years} of experience across {industries}. Skilled in {strengths}, designing and supporting cloud infrastructure that is secure, automated and dependable.",
      achievement:
        "Cloud Engineer with {years} of experience across {industries}. Known for {strengths}, with a record of automating manual infrastructure work, improving reliability and keeping cloud costs under control.",
      technical:
        "Cloud Engineer specialising in AWS/Azure infrastructure, infrastructure as code and CI/CD automation. {years} of experience across {industries}, covering networking, security, monitoring and cost management. Strong in {strengths}.",
      fresh:
        "Recent graduate targeting Cloud Engineer roles, with hands-on exposure to AWS/Azure, Linux and scripting from coursework, labs and certifications. Brings {strengths} and a strong drive to automate and document in {industries}.",
    },
    responsibilities: [
      {
        basic: "Managed cloud infrastructure.",
        stronger: "Provisioned and managed cloud infrastructure on AWS/Azure, covering compute, networking, storage and IAM.",
        achievement: "Managed production cloud infrastructure with high availability, supporting business systems with minimal unplanned downtime.",
      },
      {
        basic: "Wrote automation scripts.",
        stronger: "Automated provisioning and configuration using Terraform and scripting, replacing manual setup steps.",
        achievement: "Automated environment provisioning with Terraform, cutting setup time from days to hours and eliminating configuration drift.",
      },
      {
        basic: "Set up CI/CD pipelines.",
        stronger: "Built and maintained CI/CD pipelines for application and infrastructure deployments.",
        achievement: "Introduced CI/CD pipelines that made releases smaller and safer, reducing deployment failures and rollback time.",
      },
      {
        basic: "Monitored systems.",
        stronger: "Implemented monitoring, alerting and logging to detect and resolve issues before users were affected.",
        achievement: "Set up monitoring and alerting that cut mean time to detect incidents, catching issues before business users reported them.",
      },
      {
        basic: "Worked on cloud security.",
        stronger: "Applied security baselines across cloud accounts — IAM policies, network segmentation, encryption and patching.",
        achievement: "Tightened IAM and network policies across cloud accounts, closing audit findings and reducing the attack surface.",
      },
      {
        basic: "Helped control cloud costs.",
        stronger: "Reviewed cloud usage and right-sized resources to keep spend aligned with budget.",
        achievement: "Identified and removed idle resources and right-sized workloads, reducing monthly cloud spend without impacting performance.",
      },
    ],
    skills: ["AWS", "Azure", "Terraform", "Linux", "Docker", "Kubernetes", "CI/CD", "Python", "Networking", "IAM & Security", "Monitoring", "Git", "PowerShell / Bash"],
    certifications: ["AWS Certified Solutions Architect – Associate", "Microsoft Azure Administrator (AZ-104)", "HashiCorp Terraform Associate", "Kubernetes (CKA)", "AWS/Azure security specialty certifications"],
    atsKeywords: ["aws", "azure", "cloud", "terraform", "ci/cd", "kubernetes", "automation", "infrastructure", "monitoring", "security"],
  },
  {
    id: "sales-manager",
    label: "Sales Manager",
    detect: ["sales manager", "sales", "business development", "account manager", "bd manager", "sales executive"],
    strengths: ["New business development", "Client relationships", "Negotiation", "Pipeline management", "Team coaching", "Presentation skills"],
    summaries: {
      professional:
        "Sales Manager with {years} of experience across {industries}. Skilled in {strengths}, managing the full sales cycle from prospecting to close and building client relationships that last beyond the first deal.",
      achievement:
        "Sales Manager with {years} of experience across {industries}. Known for {strengths}, with a consistent record of meeting sales targets, growing key accounts and opening new revenue streams.",
      technical:
        "Sales Manager with deep knowledge of consultative and solution selling in {industries}. {years} of experience covering territory planning, CRM discipline, forecasting and enterprise account management. Strong in {strengths}.",
      fresh:
        "Motivated professional targeting sales roles, with strong foundations in communication and customer service from education and early work experience. Brings {strengths} and genuine energy for building client relationships in {industries}.",
    },
    responsibilities: [
      {
        basic: "Sold products and services to clients.",
        stronger: "Managed the full sales cycle — prospecting, qualification, proposals, negotiation and closing — for B2B clients.",
        achievement: "Owned the full sales cycle for B2B accounts, consistently achieving quarterly targets through disciplined pipeline management.",
      },
      {
        basic: "Looked after existing accounts.",
        stronger: "Managed and grew a portfolio of existing accounts, identifying upsell and cross-sell opportunities.",
        achievement: "Grew revenue from existing accounts by deepening relationships and identifying expansion opportunities before renewal cycles.",
      },
      {
        basic: "Found new customers.",
        stronger: "Generated new business through outbound prospecting, referrals, events and partner channels.",
        achievement: "Opened new client accounts through structured outbound prospecting, adding qualified pipeline every quarter.",
      },
      {
        basic: "Used the CRM.",
        stronger: "Maintained accurate pipeline and activity records in CRM, producing reliable forecasts for management.",
        achievement: "Kept CRM data clean and forecasts reliable, giving management early visibility of pipeline risks and wins.",
      },
      {
        basic: "Worked with the team on deals.",
        stronger: "Coordinated with presales, delivery and finance teams to shape winning proposals and smooth handovers.",
        achievement: "Coordinated cross-functional deal teams on complex opportunities, improving win rates and post-sale handover quality.",
      },
      {
        basic: "Coached junior salespeople.",
        stronger: "Coached and mentored junior sales staff on prospecting, discovery and closing techniques.",
        achievement: "Mentored junior salespeople who went on to hit their individual targets, strengthening overall team performance.",
      },
    ],
    skills: ["Sales Management", "Account Management", "Business Development", "Negotiation", "CRM (Salesforce/HubSpot)", "Pipeline Management", "Forecasting", "Solution Selling", "Presentation Skills", "Stakeholder Management", "Territory Planning"],
    certifications: ["Certified Sales Professional (CSP)", "SPIN / Challenger / MEDDIC sales training", "HubSpot Sales Software Certification", "Salesforce Trailhead credentials", "SkillsFuture sales & negotiation courses (SG)"],
    atsKeywords: ["sales", "pipeline", "targets", "crm", "business development", "negotiation", "accounts", "revenue", "b2b", "forecast"],
  },
  {
    id: "marketing-exec",
    label: "Marketing Executive",
    detect: ["marketing executive", "marketing", "digital marketing", "brand executive", "content marketing", "social media"],
    strengths: ["Campaign management", "Content creation", "Social media", "Data-driven marketing", "Copywriting", "Event coordination"],
    summaries: {
      professional:
        "Marketing Executive with {years} of experience across {industries}. Skilled in {strengths}, planning and running campaigns across digital and offline channels with clear reporting on what worked.",
      achievement:
        "Marketing Executive with {years} of experience across {industries}. Known for {strengths}, with a record of campaigns that grew engagement, generated qualified leads and stayed on budget.",
      technical:
        "Marketing Executive with strong digital execution skills — paid social, SEO/SEM, email marketing and analytics. {years} of experience across {industries}, comfortable owning campaigns end to end from brief to performance report. Strong in {strengths}.",
      fresh:
        "Recent graduate targeting marketing roles, with hands-on experience in social media, content creation and campaign support from internships and projects. Brings {strengths} and a sharp eye for what audiences respond to in {industries}.",
    },
    responsibilities: [
      {
        basic: "Ran marketing campaigns.",
        stronger: "Planned and executed marketing campaigns across digital and offline channels, from brief through to post-campaign reporting.",
        achievement: "Ran multi-channel campaigns end to end, delivering on schedule and reporting results that shaped the next quarter's plan.",
      },
      {
        basic: "Managed social media accounts.",
        stronger: "Managed social media content calendars, publishing and community engagement across LinkedIn, Instagram and Facebook.",
        achievement: "Grew social media engagement through consistent, audience-tested content and active community management.",
      },
      {
        basic: "Wrote marketing content.",
        stronger: "Produced marketing content — EDMs, web copy, brochures and case studies — aligned to brand guidelines.",
        achievement: "Produced content that improved email open and click rates, testing subject lines and formats to learn what resonated.",
      },
      {
        basic: "Ran ads online.",
        stronger: "Set up and optimised paid campaigns on Google, Meta and LinkedIn, monitoring spend and performance.",
        achievement: "Optimised paid campaigns by reallocating budget to the best-performing channels, improving cost per lead.",
      },
      {
        basic: "Helped with events.",
        stronger: "Coordinated events, webinars and roadshows, covering logistics, vendors and lead follow-up.",
        achievement: "Coordinated events that ran smoothly within budget and delivered qualified leads to the sales team.",
      },
      {
        basic: "Reported on marketing numbers.",
        stronger: "Tracked and reported campaign performance using Google Analytics and channel dashboards.",
        achievement: "Built simple campaign dashboards that gave management a clear monthly view of marketing performance and ROI.",
      },
    ],
    skills: ["Digital Marketing", "Social Media Management", "Content Creation", "Copywriting", "Google Analytics", "SEO / SEM", "Email Marketing (EDM)", "Paid Ads (Meta/Google/LinkedIn)", "Canva / Adobe Creative Suite", "Event Management", "CRM & Marketing Automation"],
    certifications: ["Google Analytics Certification", "Google Ads Certification", "Meta Blueprint Certification", "HubSpot Content/Email Marketing Certification", "SkillsFuture digital marketing courses (SG)"],
    atsKeywords: ["marketing", "campaign", "social media", "content", "digital", "seo", "analytics", "email", "brand", "leads"],
  },
  {
    id: "hr-exec",
    label: "HR Executive",
    detect: ["hr executive", "human resources", "talent acquisition", "recruiter", "hr generalist", "people operations"],
    strengths: ["Recruitment coordination", "Employee relations", "HR systems", "Confidentiality", "Onboarding", "Attention to detail"],
    summaries: {
      professional:
        "HR Executive with {years} of experience across {industries}. Skilled in {strengths}, supporting the full employee lifecycle from recruitment and onboarding to payroll support and offboarding.",
      achievement:
        "HR Executive with {years} of experience across {industries}. Known for {strengths}, with a record of smoother onboarding, faster hiring coordination and clean, audit-ready HR records.",
      technical:
        "HR Executive with strong working knowledge of Singapore employment practices — MOM regulations, work passes, CPF and leave administration. {years} of experience across {industries}. Strong in {strengths}.",
      fresh:
        "Recent graduate targeting HR roles, with foundations in HR practices and employment law from studies and internship experience. Brings {strengths} and a people-first, detail-conscious working style suited to {industries}.",
    },
    responsibilities: [
      {
        basic: "Helped with recruitment.",
        stronger: "Coordinated end-to-end recruitment — job postings, screening, interview scheduling and offer administration.",
        achievement: "Coordinated recruitment across multiple departments, shortening time-to-offer by keeping candidates and hiring managers moving.",
      },
      {
        basic: "Did onboarding for new staff.",
        stronger: "Managed onboarding and offboarding, including contracts, IT/access coordination and first-day orientation.",
        achievement: "Streamlined the onboarding checklist so new hires had accounts, equipment and inductions ready from day one.",
      },
      {
        basic: "Handled work passes.",
        stronger: "Administered work pass applications, renewals and MOM compliance for foreign employees.",
        achievement: "Managed work pass applications and renewals with zero lapses, keeping the company fully MOM-compliant.",
      },
      {
        basic: "Helped with payroll and leave.",
        stronger: "Supported monthly payroll processing, CPF submissions and leave administration in the HR system.",
        achievement: "Supported accurate, on-time payroll every month, resolving discrepancies before they reached employees.",
      },
      {
        basic: "Answered staff questions.",
        stronger: "Served as first point of contact for employee queries on policies, benefits and leave.",
        achievement: "Handled employee queries promptly and confidentially, improving trust in HR as a reliable first port of call.",
      },
      {
        basic: "Kept HR records updated.",
        stronger: "Maintained accurate employee records and HR documentation to support audits and reporting.",
        achievement: "Kept HR records complete and audit-ready, supporting external audits with no documentation findings.",
      },
    ],
    skills: ["HR Operations", "Recruitment Coordination", "Onboarding", "Employment Act (SG)", "Work Pass Administration", "Payroll Support", "CPF & MOM Compliance", "HRIS (Workday/SAP/Talenox)", "Employee Relations", "Leave Administration", "Microsoft Office"],
    certifications: ["IHRP Certified Professional (IHRP-CP)", "SHRM-CP", "WSQ HR certifications (SG)", "Payroll administration courses", "Employment Act / MOM compliance training"],
    atsKeywords: ["hr", "recruitment", "onboarding", "payroll", "employee", "mom", "cpf", "work pass", "hris", "compliance"],
  },
  {
    id: "finance-exec",
    label: "Finance Executive",
    detect: ["finance executive", "finance", "accountant", "accounts executive", "financial analyst", "finance analyst"],
    strengths: ["Accuracy and attention to detail", "Month-end closing", "Financial reporting", "Excel modelling", "Process improvement", "Deadline management"],
    summaries: {
      professional:
        "Finance Executive with {years} of experience across {industries}. Skilled in {strengths}, supporting accurate month-end closing, reporting and day-to-day finance operations.",
      achievement:
        "Finance Executive with {years} of experience across {industries}. Known for {strengths}, with a record of faster closings, cleaner reconciliations and reports that management can rely on.",
      technical:
        "Finance Executive with hands-on experience in AP/AR, GL, reconciliations and financial reporting under SFRS. {years} of experience across {industries}, working with ERP systems and advanced Excel. Strong in {strengths}.",
      fresh:
        "Recent graduate targeting finance roles, with strong foundations in accounting principles and Excel from studies and internship experience. Brings {strengths} and a careful, deadline-driven working style suited to {industries}.",
    },
    responsibilities: [
      {
        basic: "Did accounts payable and receivable.",
        stronger: "Processed AP/AR transactions, invoice matching and payment runs accurately and on schedule.",
        achievement: "Kept AP/AR processing accurate and on time, reducing overdue items through disciplined follow-up.",
      },
      {
        basic: "Helped with month-end closing.",
        stronger: "Supported month-end closing including journal entries, accruals and balance sheet reconciliations.",
        achievement: "Supported month-end close within tight deadlines, clearing reconciling items so reports went out on schedule.",
      },
      {
        basic: "Prepared reports.",
        stronger: "Prepared monthly management reports, variance analysis and supporting schedules for review.",
        achievement: "Produced management reports with clear variance commentary that helped department heads control their budgets.",
      },
      {
        basic: "Helped with audits and tax.",
        stronger: "Prepared audit schedules and supported external audit and GST/corporate tax filing requirements.",
        achievement: "Prepared complete audit schedules that helped close the external audit with minimal follow-up queries.",
      },
      {
        basic: "Worked on process improvements.",
        stronger: "Improved finance processes by standardising templates and automating recurring reports in Excel.",
        achievement: "Automated recurring reports in Excel, cutting manual preparation time and reducing errors in monthly reporting.",
      },
    ],
    skills: ["Financial Reporting", "Accounts Payable / Receivable", "General Ledger", "Month-End Closing", "Bank Reconciliation", "GST Filing", "SFRS", "Excel (Advanced)", "ERP (SAP/Oracle/Xero/QuickBooks)", "Variance Analysis", "Audit Support"],
    certifications: ["ACCA (in progress or completed)", "CA (Singapore)", "CPA", "ISCA courses", "SkillsFuture finance & analytics courses (SG)"],
    atsKeywords: ["finance", "accounting", "reconciliation", "month-end", "reporting", "ap", "ar", "audit", "gst", "excel"],
  },
];

// Industry options shown in setup — candidates can also type their own.
export const INDUSTRIES = [
  "Technology",
  "Data Centres & Critical Facilities",
  "Banking & Financial Services",
  "Healthcare",
  "Telecommunications",
  "Manufacturing",
  "Logistics & Supply Chain",
  "Real Estate & Construction",
  "Professional Services",
  "Retail & E-commerce",
  "Government / Public Sector",
  "Energy & Utilities",
];

export const EXPERIENCE_LEVELS = [
  { id: "fresh", label: "Fresh graduate / less than 1 year", phrase: "entry-level experience" },
  { id: "1-3", label: "1–3 years", phrase: "over 2 years" },
  { id: "3-5", label: "3–5 years", phrase: "over 4 years" },
  { id: "5-8", label: "5–8 years", phrase: "over 6 years" },
  { id: "8-12", label: "8–12 years", phrase: "over 10 years" },
  { id: "12+", label: "More than 12 years", phrase: "more than 12 years" },
];

export const RESUME_STYLES = [
  { id: "professional", label: "Professional", note: "Balanced and safe — works for most corporate roles" },
  { id: "technical", label: "Technical", note: "Leads with tools, systems and hands-on depth" },
  { id: "executive", label: "Executive", note: "Leads with achievements, scale and leadership" },
  { id: "fresh", label: "Fresh Graduate", note: "Leads with education, projects and potential" },
];

// Match a free-typed job title to the closest role category.
export function detectRole(title) {
  const t = (title || "").toLowerCase();
  if (!t.trim()) return null;
  let best = null;
  let bestScore = 0;
  for (const role of ROLES) {
    let score = 0;
    for (const kw of role.detect) {
      if (t.includes(kw)) score = Math.max(score, kw.length);
    }
    if (score > bestScore) {
      best = role;
      bestScore = score;
    }
  }
  return best;
}

export function getRole(id) {
  return ROLES.find((r) => r.id === id) || null;
}

// Build the three career summary options from the candidate's answers.
export function buildSummaries(role, { levelId, styleId, strengths, industries, targetTitle }) {
  if (!role) return [];
  const level = EXPERIENCE_LEVELS.find((l) => l.id === levelId) || EXPERIENCE_LEVELS[1];
  const years = level.id === "fresh" ? "entry-level" : level.phrase + " of";
  const strengthText =
    strengths && strengths.length
      ? listToSentence(strengths.map((s) => s.toLowerCase()))
      : "clear communication and dependable delivery";
  const industryText =
    industries && industries.length ? listToSentence(industries) : "Singapore-based organisations";

  const fill = (tpl) =>
    tpl
      .replace(/\{years\} of/g, level.id === "fresh" ? "entry-level" : level.phrase + " of")
      .replace(/\{years\}/g, level.phrase)
      .replace(/\{strengths\}/g, strengthText)
      .replace(/\{industries\}/g, industryText)
      .replace(/\{title\}/g, targetTitle || role.label)
      // Capitalise the start of every sentence (placeholders can begin one).
      .replace(/(^|\. )([a-z])/g, (m, pre, ch) => pre + ch.toUpperCase());

  const s = role.summaries;
  if (levelId === "fresh" || styleId === "fresh") {
    return [
      { tag: "Fresh graduate", text: fill(s.fresh) },
      { tag: "Concise professional", text: fill(s.professional) },
      { tag: "Technical specialist", text: fill(s.technical) },
    ];
  }
  return [
    { tag: "Concise professional", text: fill(s.professional) },
    { tag: "Achievement-focused", text: fill(s.achievement) },
    { tag: "Technical specialist", text: fill(s.technical) },
  ];
}

function listToSentence(items) {
  if (items.length === 1) return items[0];
  if (items.length === 2) return items[0] + " and " + items[1];
  return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
}
