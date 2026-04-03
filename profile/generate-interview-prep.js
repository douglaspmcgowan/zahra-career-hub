const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, LevelFormat, HeadingLevel, TabStopType, TabStopPosition } = require('docx');
const fs = require('fs');
const path = require('path');

const NAVY = "1B3A5C";
const DARK = "333333";
const MED = "555555";
const LIGHT = "888888";
const ACCENT = "C4704B";

function h1(text) {
  return new Paragraph({
    spacing: { before: 360, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: NAVY, space: 6 } },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 26, font: "Arial", color: NAVY, characterSpacing: 80 })],
  });
}

function h2(text) {
  return new Paragraph({
    spacing: { before: 280, after: 80 },
    children: [new TextRun({ text, bold: true, size: 24, font: "Arial", color: NAVY })],
  });
}

function h3(text) {
  return new Paragraph({
    spacing: { before: 200, after: 60 },
    children: [new TextRun({ text, bold: true, size: 21, font: "Arial", color: DARK })],
  });
}

function body(text) {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 20, font: "Arial", color: DARK })],
  });
}

function quote(text) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    indent: { left: 360 },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 8 } },
    children: [new TextRun({ text: '\u201C' + text + '\u201D', size: 20, font: "Arial", color: MED, italics: true })],
  });
}

function bold_body(label, text) {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    children: [
      new TextRun({ text: label, bold: true, size: 20, font: "Arial", color: DARK }),
      new TextRun({ text, size: 20, font: "Arial", color: MED }),
    ],
  });
}

function bullet(text, opts) {
  const children = [];
  if (opts && opts.bold) {
    const parts = text.split(' \u2014 ');
    if (parts.length === 2) {
      children.push(new TextRun({ text: parts[0] + ' \u2014 ', bold: true, size: 20, font: "Arial", color: DARK }));
      children.push(new TextRun({ text: parts[1], size: 20, font: "Arial", color: MED }));
    } else {
      children.push(new TextRun({ text, bold: true, size: 20, font: "Arial", color: DARK }));
    }
  } else {
    children.push(new TextRun({ text, size: 20, font: "Arial", color: opts && opts.color ? opts.color : DARK }));
  }
  return new Paragraph({
    spacing: { before: 30, after: 30 },
    numbering: { reference: "bullets", level: 0 },
    children,
  });
}

function spacer(pts) {
  return new Paragraph({ spacing: { before: pts || 80, after: 0 }, children: [] });
}

function star(label, situation, task, action, result) {
  return [
    h3(label),
    bullet('S: ' + situation),
    bullet('T: ' + task),
    bullet('A: ' + action),
    bullet('R: ' + result),
  ];
}

const doc = new Document({
  numbering: {
    config: [{
      reference: "bullets",
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 360, hanging: 180 } } },
      }],
    }, {
      reference: "numbers",
      levels: [{
        level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
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
        margin: { top: 900, right: 1080, bottom: 900, left: 1080 },
      },
    },
    children: [
      // TITLE
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [new TextRun({ text: "INTERVIEW PREP GUIDE", bold: true, size: 36, font: "Arial", color: NAVY, characterSpacing: 100 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: NAVY, space: 12 } },
        children: [new TextRun({ text: "Zahra Amos \u2014 Personalized for Your Background & Strengths", size: 20, font: "Arial", color: MED })],
      }),

      // 60-SECOND STORY
      h1("Your Story in 60 Seconds"),
      body("Memorize this. Adjust the ending based on the role."),
      spacer(40),
      quote("I\u2019m an Australian biologist and D1 athlete who\u2019s spent the last four years in the US on full-ride scholarships \u2014 first at the University of Buffalo where I studied biological sciences with a focus in neuroscience, and now at UC Berkeley where I\u2019m finishing a certificate in entrepreneurship while competing in high jump. I\u2019ve been coaching track and field for eight years, I\u2019ve worked in education and sales, and I\u2019m passionate about work that\u2019s both intellectually challenging and deeply people-oriented. I\u2019m looking for a role in the Bay Area where I can combine my science background with my interpersonal skills and continue growing. And as an Australian citizen, I\u2019m eligible for the E-3 visa, which makes the sponsorship process simple and fast for employers."),
      spacer(40),
      bold_body("Key points to always hit: ", "Biology + entrepreneurship (range), D1 at two universities (discipline), 8 years coaching (leadership), E-3 visa (removes concerns)."),

      // 10 QUESTIONS
      h1("The 10 Questions You\u2019ll Get"),

      h2('1. \u201CTell me about yourself.\u201D'),
      body("Use the 60-second story above. Then pivot to why you\u2019re excited about THIS specific role."),
      bold_body("Don\u2019t: ", "list your resume chronologically."),
      bold_body("Do: ", "tell a story with a theme \u2014 you combine scientific thinking with genuine care for people."),

      h2('2. \u201CWhy do you want to work here?\u201D'),
      bold_body("Framework: ", "Research + Connection + Contribution"),
      quote("I\u2019ve been following [Company] because [specific thing you noticed]. What drew me in is [connection to your values]. And I think I can contribute [specific skill] because of my experience in [relevant area]."),
      spacer(20),
      h3("Example for Lawrence Hall of Science:"),
      quote("I\u2019ve been to Lawrence Hall and saw how you make science genuinely exciting for kids. That\u2019s exactly what I want to do \u2014 take complex science and make it accessible and fun. With my biology degree, eight years of coaching young people, and my own experience as an athlete who had to learn how to teach different people in different ways, I think I\u2019d thrive in that environment."),
      h3("Example for a biotech company:"),
      quote("What excites me about [Company] is that you\u2019re working at the intersection of biology and [marketing/AI/technology]. I have a biology degree and I understand the science behind what you do, but I also have marketing and communication training from UC Berkeley. I can translate complex science into clear messaging, and I genuinely enjoy the relationship-building side of this work."),

      h2('3. \u201CWhat are your strengths?\u201D'),
      h3("1. Connecting with people quickly"),
      quote("I can read a room and adapt how I communicate. As a coach, I had to figure out within minutes what approach would work with each kid. In sales, I had to adjust my pitch based on who walked up. This comes from studying neuroscience and psychology \u2014 I understand why people respond the way they do."),
      h3("2. Thriving under pressure"),
      quote("I\u2019ve competed at NCAA Nationals. I\u2019ve broken records. I\u2019ve maintained my academics while training as a D1 athlete. I chose neuroscience because it was the hardest option. I chose to transfer to Berkeley for one final season because I wanted to test myself at the highest level. I\u2019m drawn to challenge, not scared of it."),
      h3("3. Building culture"),
      quote("At Buffalo, I was team captain and I transformed the culture \u2014 event groups that never talked started hanging out, people held themselves to higher standards, and the whole team\u2019s morale shifted. I did that by showing up every day with energy, organizing social events, and running groups where we talked about purpose beyond sport."),

      h2('4. \u201CWhat\u2019s your greatest weakness?\u201D'),
      quote("I can be too patient sometimes. Coming from coaching, I\u2019m trained to give people time and space to figure things out. But in a faster-paced professional environment, I\u2019m learning that sometimes you need to be more direct and move things forward. It\u2019s something I\u2019m actively working on."),
      spacer(20),
      body("Alternative:"),
      quote("I don\u2019t have a lot of formal corporate experience. Most of my professional life has been in coaching, education, and athletics. But I\u2019ve found that the skills transfer directly \u2014 managing a classroom of disruptive students is honestly harder than most office situations. And I\u2019m a fast learner who\u2019s not afraid of being new at something."),

      h2('5. \u201CTell me about a time you dealt with conflict.\u201D'),
      quote("When I was an educational assistant at a high school in Perth, my entire role was de-escalating kids who were being disruptive or aggressive. I learned to lead with questions, not commands. Instead of telling a kid to stop, I\u2019d ask them what was going on. Usually, they just wanted to be heard. Once they felt understood, they became way more receptive. By the end, I had strong relationships with some of the most difficult students because I earned their trust by genuinely trying to understand them."),

      h2('6. \u201CTell me about a time you led a team.\u201D'),
      quote("I was team captain of the University at Buffalo track and field team during the 2024\u201325 season. The team was pretty fragmented. I organized social events outside of training, spent time with every event group, and started running optional weekly gatherings where we\u2019d talk about things beyond sport. Over the year, the culture shifted noticeably. People treated each other better, held themselves to higher standards, and the team became genuinely close. It was one of the most meaningful things I\u2019ve done."),

      h2('7. \u201CWhy should we hire you?\u201D'),
      quote("I bring a combination that\u2019s hard to find \u2014 a biology degree with real scientific training, marketing and business education from UC Berkeley, and eight years of experience working with and leading people. I\u2019m not just someone who \u2018likes people\u2019 \u2014 I have trained interpersonal skills backed by neuroscience and psychology education. And practically, I\u2019m already in Berkeley, ready to start, and eligible for the E-3 visa \u2014 which means hiring me is as simple as hiring any American candidate, with almost no extra cost or paperwork."),

      h2('8. \u201CWhere do you see yourself in 5 years?\u201D'),
      quote("I want to be deep into a career where I\u2019m constantly learning and making an impact on the people around me. Whether that\u2019s leading a team, running programs, or growing into a senior role \u2014 the specifics matter less than being challenged and doing meaningful work. I chose the Bay Area because this is where I see the most opportunity for that kind of growth."),

      h2('9. \u201CDo you need visa sponsorship?\u201D'),
      body("This is your secret weapon. Deliver it confidently:"),
      quote("I\u2019m Australian, so I\u2019m eligible for the E-3 visa. It\u2019s exclusive to Australians and works very differently from the H-1B. There\u2019s no lottery, no cap issues \u2014 about half the E-3 slots go unused every year. The process is fast, usually just a few weeks, and the employer\u2019s only requirement is filing a Labor Condition Application. It\u2019s renewable indefinitely. Sponsoring me is faster, cheaper, and more certain than sponsoring almost any other international candidate."),
      spacer(20),
      bold_body("If they seem hesitant: ", "\u201CI\u2019d be happy to share some information about the E-3 process with your HR team. Most immigration attorneys are very familiar with it, and many employers have told me it\u2019s easier than they expected.\u201D"),

      h2('10. \u201CDo you have any questions for us?\u201D'),
      body("Always ask at least 2:"),
      bullet("\u201CWhat does success look like in this role in the first 6 months?\u201D"),
      bullet("\u201CWhat\u2019s the team culture like? How do people collaborate?\u201D"),
      bullet("\u201CWhat\u2019s the biggest challenge your team is facing right now?\u201D"),
      bullet("\u201CIs there room for growth in this role?\u201D"),
      bullet("\u201CWhat do you personally enjoy most about working here?\u201D"),
      spacer(20),
      bold_body("Never ask ", "about salary, vacation, or benefits in a first interview. Save those for when they make an offer."),

      // STAR METHOD
      h1("STAR Method \u2014 Ready-Made Stories"),
      body("For any \u201CTell me about a time when...\u201D question: Situation \u2192 Task \u2192 Action \u2192 Result"),

      ...star("Story 1: De-escalation (Educational Assistant)",
        "High school in Perth, hundreds of students, disruptive behavior",
        "Regulate classrooms so teachers could teach",
        "Led with questions not commands, adapted approach per student, controlled tone, built trust rapidly",
        "Built strong relationships with the most difficult students, classrooms functioned more smoothly"),

      ...star("Story 2: Building Culture (Team Captain)",
        "Fragmented track team at Buffalo, event groups didn\u2019t interact",
        "Unite the team and improve culture as captain",
        "Organized social events, bridged groups, led reflection sessions, showed up daily with energy",
        "Team culture transformed \u2014 better morale, stronger bonds, higher standards"),

      ...star("Story 3: Adapting Sales Approach (Daily Supplements)",
        "Christmas pop-up selling gut health supplements",
        "Sell to a diverse range of customers beyond the typical demographic",
        "Read each customer quickly, adapted pitch for age/gender/personality, built comfort in short interactions",
        "Successfully sold to customers far outside the target demographic"),

      ...star("Story 4: Competing Under Pressure (Athletics)",
        "NCAA Division 1 track and field, national-level competition",
        "Perform at the highest level while maintaining academics",
        "Trained 15+ hours/week, managed time rigorously, chose to transfer to Berkeley for one final shot",
        "Broke records twice, competed at Regionals and Nationals, earned two full-ride scholarships"),

      ...star("Story 5: Coaching Across Differences (8 Years)",
        "Coached at 4+ high schools, a club, and a primary school over 8 years",
        "Develop athletes across age ranges, ability levels, and backgrounds",
        "Adapted methods per athlete, built relationships with parents and teachers, proved effectiveness",
        "Trusted by schools to return season after season, maintained long-term coaching relationships"),

      // INDUSTRY-SPECIFIC
      h1("Industry-Specific Prep"),

      h2("Biotech Marketing"),
      bullet("Know the company\u2019s main products and who they sell to"),
      bullet("Say: \u201CI can understand the science AND communicate it to non-scientists\u201D"),
      bullet("Mention your neuroscience literature review experience"),
      bullet("Ask about their go-to-market strategy"),

      h2("Science Education"),
      bullet("Talk about making science FUN, not just accurate"),
      bullet("Emphasize 8 years of coaching \u2014 you already know how to teach"),
      bullet("Mention psychology training \u2014 you understand how people learn"),
      bullet("Ask about their approach to informal education"),

      h2("Summer Camps"),
      bullet("Be enthusiastic, energetic, and warm \u2014 personality matters most"),
      bullet("Emphasize safety, reliability, and experience with kids"),
      bullet("Talk about coaching and educational assistant work"),
      bullet("Ask about age range, daily schedule, and training"),

      h2("AI Companies"),
      bullet("You don\u2019t need to be technical \u2014 they need communicators"),
      bullet("Frame yourself as \u201Cscience-literate\u201D \u2014 you understand what engineers build"),
      bullet("Emphasize marketing training and community-building skills"),
      bullet("Ask about the team and their biggest communication challenge"),

      h2("Sales / Business Development"),
      bullet("Lead with your sales pop-up experience and how you read people"),
      bullet("Connect coaching/teaching to sales \u2014 both require adapting to individuals"),
      bullet("Mention your negotiation coursework from UC Berkeley"),
      bullet("Ask about their sales process and how success is measured"),

      // CHECKLISTS
      h1("Before Every Interview"),
      bullet("Research the company (website, recent news, Glassdoor reviews)"),
      bullet("Know the job description \u2014 highlight 3 requirements you match"),
      bullet("Prepare your 60-second story (adjust ending for this role)"),
      bullet("Pick 2\u20133 STAR stories most relevant to this role"),
      bullet("Prepare your E-3 visa explanation"),
      bullet("Prepare 2\u20133 questions to ask them"),
      bullet("Dress one level above the company\u2019s dress code"),
      bullet("Arrive 10 minutes early (or test video setup 15 min early)"),
      bullet("Bring 3 printed copies of your resume"),
      bullet("Send a thank-you email within 24 hours"),

      // PHRASES
      h1("Phrases to Use"),
      bullet("\u201CI\u2019m drawn to challenge, not scared of it.\u201D", { color: ACCENT }),
      bullet("\u201CI don\u2019t just like people \u2014 I\u2019ve trained myself to understand them.\u201D", { color: ACCENT }),
      bullet("\u201CI led by example, and the team gave back the energy I put in.\u201D", { color: ACCENT }),
      bullet("\u201CI ask questions instead of making assumptions about people.\u201D", { color: ACCENT }),
      bullet("\u201CHow you deliver what you say matters as much as what you say.\u201D", { color: ACCENT }),
      bullet("\u201CAs an Australian citizen, the E-3 visa makes this simple for you.\u201D", { color: ACCENT }),

      h1("Phrases to Avoid"),
      bullet("\u201CI just really like people\u201D \u2014 too vague. Say WHY and HOW.", { bold: true }),
      bullet("\u201CI\u2019m a hard worker\u201D \u2014 everyone says this. Show it through stories.", { bold: true }),
      bullet("\u201CI\u2019ll do anything\u201D \u2014 shows desperation. Say \u201CI\u2019m excited about [specific thing].\u201D", { bold: true }),
      bullet("\u201CI don\u2019t have much experience\u201D \u2014 reframe as \u201CMy experience is in coaching, education, and athletics, and those skills transfer directly.\u201D", { bold: true }),
      bullet("\u201CI need this job to stay in the country\u201D \u2014 never lead with need. Lead with value.", { bold: true }),
    ],
  }],
});

const outPath = path.join(__dirname, "Zahra_Amos_Interview_Prep.docx");
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outPath, buffer);
  console.log("Interview prep saved to: " + outPath);
});
