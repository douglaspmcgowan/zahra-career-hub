const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, TabStopType, TabStopPosition, LevelFormat, HeadingLevel, ExternalHyperlink } = require('docx');
const fs = require('fs');
const path = require('path');

// Colors
const NAVY = "1B3A5C";
const DARK = "333333";
const MEDIUM = "555555";
const LIGHT_LINE = "B0B0B0";
const ACCENT = "2E75B6";

// Spacing helpers (DXA: 1440 = 1 inch, 20 = ~1pt)
const SP = { SECTION: 200, AFTER_HEADING: 60, ITEM: 40, BULLET: 20 };

function sectionHeading(text) {
  return new Paragraph({
    spacing: { before: SP.SECTION, after: SP.AFTER_HEADING },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: NAVY, space: 4 } },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 22, font: "Arial", color: NAVY, characterSpacing: 80 })],
  });
}

function jobTitle(title, rightText) {
  return new Paragraph({
    spacing: { before: SP.ITEM + 60, after: 0 },
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    children: [
      new TextRun({ text: title, bold: true, size: 21, font: "Arial", color: DARK }),
      new TextRun({ text: "\t" + rightText, size: 19, font: "Arial", color: MEDIUM }),
    ],
  });
}

function subtitle(text) {
  return new Paragraph({
    spacing: { before: 0, after: SP.BULLET },
    children: [new TextRun({ text, italics: true, size: 19, font: "Arial", color: MEDIUM })],
  });
}

function bullet(text, placeholder) {
  const children = [];
  if (placeholder) {
    children.push(new TextRun({ text, size: 19, font: "Arial", color: MEDIUM, italics: true }));
  } else {
    children.push(new TextRun({ text, size: 19, font: "Arial", color: DARK }));
  }
  return new Paragraph({
    spacing: { before: SP.BULLET, after: SP.BULLET },
    numbering: { reference: "bullets", level: 0 },
    children,
  });
}

function skillLine(label, skills) {
  return new Paragraph({
    spacing: { before: SP.BULLET, after: SP.BULLET },
    children: [
      new TextRun({ text: label + ": ", bold: true, size: 19, font: "Arial", color: DARK }),
      new TextRun({ text: skills, size: 19, font: "Arial", color: MEDIUM }),
    ],
  });
}

const doc = new Document({
  numbering: {
    config: [{
      reference: "bullets",
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 360, hanging: 180 } } },
      }],
    }],
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 20 } } },
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 720, right: 900, bottom: 720, left: 900 },
      },
    },
    children: [
      // === HEADER ===
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 0 },
        children: [new TextRun({ text: "ZAHRA AMOS", bold: true, size: 36, font: "Arial", color: NAVY, characterSpacing: 120 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 20 },
        children: [
          new TextRun({ text: "Berkeley, CA  |  zahra.amos124@gmail.com  |  ", size: 18, font: "Arial", color: MEDIUM }),
          new TextRun({ text: "[LinkedIn URL]", size: 18, font: "Arial", color: ACCENT, italics: true }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: NAVY, space: 8 } },
        children: [new TextRun({ text: "Australian Citizen  \u2014  E-3 Visa Eligible (No Lottery  |  Minimal Employer Cost  |  Renewable Indefinitely)", bold: true, size: 17, font: "Arial", color: NAVY })],
      }),

      // === SUMMARY ===
      sectionHeading("Summary"),
      new Paragraph({
        spacing: { after: SP.ITEM },
        children: [new TextRun({
          text: "Biology graduate and UC Berkeley-trained entrepreneur with 8 years of coaching, teaching, and leadership experience. D1 student-athlete at two universities with a proven track record of building team culture, connecting with diverse groups, and thriving under pressure. Combines scientific training in neuroscience and psychology with strong interpersonal skills to understand, motivate, and lead people effectively.",
          size: 19, font: "Arial", color: DARK,
        })],
      }),

      // === EDUCATION ===
      sectionHeading("Education"),
      jobTitle("University of California, Berkeley \u2014 Extension", "Expected June 2026"),
      subtitle("Certificate of Entrepreneurship"),
      bullet("Coursework: Negotiation, Marketing, Business Plan Development, Prototype Design"),
      bullet("Full-ride athletic scholarship \u2014 recruited to D1 Women\u2019s Track & Field"),

      jobTitle("University at Buffalo, SUNY", "[Graduation Date]"),
      subtitle("Bachelor of Science in Biological Sciences \u2014 Focus: Neuroscience"),
      bullet("Neuroscience (research literature analysis + lab), Psychology, Endocrinology, Genetics, Organic Chemistry"),
      bullet("Full-ride athletic scholarship \u2014 recruited to D1 Women\u2019s Track & Field"),
      bullet("[GPA: Insert if 3.0+]", true),

      // === ATHLETICS ===
      sectionHeading("Athletic Career"),
      jobTitle("UC Berkeley Women\u2019s Track & Field \u2014 High Jump", "Jan 2026 \u2013 Present"),
      bullet("Recruited via NCAA transfer portal on full-ride scholarship; projected to podium at conference meets"),

      jobTitle("University at Buffalo Women\u2019s Track & Field \u2014 High Jump", "[Start Year] \u2013 2025"),
      bullet("Team Captain, 2024\u201325 season \u2014 led 60+ athletes across all event groups"),
      bullet("Broke indoor women\u2019s high jump record twice; NCAA Regionals (x2), NCAA Nationals (x1)"),
      bullet("Transformed team culture: organized cross-group social events, ran athlete well-being groups, built program-wide unity"),

      // === EXPERIENCE ===
      sectionHeading("Experience"),
      jobTitle("Educational Assistant", "Jul \u2013 Dec 2025"),
      subtitle("[High School Name], Perth, Australia"),
      bullet("Managed classroom behavior and de-escalated disruptive students to enable uninterrupted instruction"),
      bullet("Developed individualized approaches for students with different behavioral triggers across a school of [X] students"),
      bullet("Built trust with students, teachers, and administration through adaptive, patient communication"),
      bullet("[Add specific outcomes or recognition]", true),

      jobTitle("Sales Representative \u2014 Daily Gut Supplements", "[Month] 2025"),
      subtitle("Perth, Australia (Christmas pop-up retail event)"),
      bullet("Identified target customers and adapted pitch in real time for diverse demographics"),
      bullet("Tailored messaging across age groups, genders, and buying motivations to close sales outside core audience"),
      bullet("[Add sales numbers if available]", true),

      jobTitle("Track & Field Coach", "[Start Year] \u2013 2025"),
      subtitle("4+ High Schools, UWA Little Athletics, Perth, Australia"),
      bullet("8 years coaching high jump, hurdles, discus, throws, and jumps for primary through high school athletes"),
      bullet("Adapted methods to individual athlete needs; built relationships with parents, teachers, and fellow coaches"),
      bullet("[Add athlete achievements you coached]", true),

      jobTitle("Additional Experience", ""),
      bullet("Cafe Waitress \u2014 [Cafe Name], Perth | Customer service, food prep, fast-paced team environment"),
      bullet("Receptionist \u2014 [Podiatry Clinic], Perth | Front desk admin, scheduling, phone management, client intake"),

      // === SKILLS ===
      sectionHeading("Skills"),
      skillLine("Interpersonal", "Communication, Conflict Resolution, Negotiation, De-escalation, Team Building, Public Speaking, Mentoring, Cross-cultural Communication"),
      skillLine("Professional", "Marketing Strategy, Sales, Business Development, Event Coordination, Classroom Management, Program Coordination"),
      skillLine("Technical", "Biology / Life Sciences, Neuroscience, Research Literature Analysis, Data Analysis, Microsoft Office, [Add tools: Canva, Google Analytics, etc.]"),

      // === INTERESTS ===
      sectionHeading("Interests & Involvement"),
      bullet("[Church/Campus Ministry] in Berkeley \u2014 [describe involvement]", true),
      bullet("Science education, youth development, making STEM accessible"),
      bullet("Artificial intelligence applications in biology and healthcare"),
      bullet("[Add volunteer work or community activities]", true),
    ],
  }],
});

const outPath = path.join(__dirname, "Zahra_Amos_Resume.docx");
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outPath, buffer);
  console.log("Resume saved to: " + outPath);
});
