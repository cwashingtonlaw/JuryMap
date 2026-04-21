// Criminal defense voir dire analogies.
// These are the structured, interactive frameworks the attorney walks each
// juror through in order to (a) teach the law in accessible terms, (b) probe
// the juror's actual beliefs beneath courtroom-polished answers, and (c)
// capture a defensible record of each juror's response for appellate review.

export type AnalogyTopic =
  | 'burden-of-proof'
  | 'circumstantial-evidence'
  | 'law-enforcement-bias'
  | 'defendant-silence'
  | 'social-pressure';

export const TOPIC_LABELS: Record<AnalogyTopic, string> = {
  'burden-of-proof': 'Burden of proof / reasonable doubt',
  'circumstantial-evidence': 'Circumstantial evidence',
  'law-enforcement-bias': 'Law-enforcement bias',
  'defendant-silence': 'Right to remain silent',
  'social-pressure': 'Social pressure on verdict',
};

export interface AnalogyCheckpoint {
  id: string;
  question: string;
  // The spotter records the juror's reaction as one of these responses.
  // "yes" = juror affirmatively agreed with the point.
  // "no"  = juror rejected or pushed back.
  // "hesitant" = juror wavered, visibly uncomfortable, or gave qualified agreement.
  options: ('yes' | 'no' | 'hesitant')[];
}

export interface AnalogyStep {
  // What the attorney says / does in this step. Displayed prominently in the prompter.
  attorney_prompt: string;
  // Optional coaching note for the attorney (small grey text under the prompt).
  coaching?: string;
  // If present, spotter records the juror's response to this checkpoint.
  checkpoint?: AnalogyCheckpoint;
}

export interface Analogy {
  id: string;
  title: string;
  topic: AnalogyTopic;
  // One-line summary shown in the library picker.
  summary: string;
  steps: AnalogyStep[];
}

export const ANALOGIES: Analogy[] = [
  {
    id: 'pilot-and-plane',
    title: 'Pilot and the Plane',
    topic: 'burden-of-proof',
    summary:
      'Shows that "probably" or "good chance" is nowhere near enough for a life-altering decision.',
    steps: [
      {
        attorney_prompt:
          'Imagine you have boarded a commercial flight. The pilot comes on the intercom and says, "Folks, there is a good chance we will make it to our destination today."',
        coaching:
          'Watch the juror\'s face. The correct intuition is a raised eyebrow or immediate discomfort.',
      },
      {
        attorney_prompt:
          'What would you do? Would you stay on that plane, knowing that "good chance" is the pilot\'s best promise?',
        checkpoint: {
          id: 'would-disembark',
          question: 'Did the juror say they would get off the plane?',
          options: ['yes', 'no', 'hesitant'],
        },
      },
      {
        attorney_prompt:
          'The prosecutor is asking you to be the pilot. If the evidence at the end of this trial only shows my client is "probably" guilty, or there is a "good chance" he did it — is that enough?',
        checkpoint: {
          id: 'probably-not-enough',
          question:
            'Did the juror agree that "probably" / "good chance" is insufficient to convict?',
          options: ['yes', 'no', 'hesitant'],
        },
      },
    ],
  },
  {
    id: 'skydiving-red-string',
    title: 'Skydiving — Red String / Parachute',
    topic: 'burden-of-proof',
    summary:
      'Drills into what "beyond a reasonable doubt" really demands when something irreversible is on the line.',
    steps: [
      {
        attorney_prompt:
          'You are going skydiving for the first time. You put on the harness. You walk to the edge of the plane. You grab the red string that opens your parachute.',
      },
      {
        attorney_prompt:
          'When I tell you to pull that red string — are you SURE the parachute will open?',
        checkpoint: {
          id: 'sure-it-opens',
          question: 'Did the juror acknowledge they need to be sure, not just "probably"?',
          options: ['yes', 'no', 'hesitant'],
        },
      },
      {
        attorney_prompt:
          '"Maybe" is not good enough, is it? "Probably" is not good enough. "Almost certainly" is not good enough. You need to be SURE before you jump.',
        checkpoint: {
          id: 'maps-to-reasonable-doubt',
          question:
            'Did the juror map the standard back onto "beyond a reasonable doubt" for the trial?',
          options: ['yes', 'no', 'hesitant'],
        },
      },
    ],
  },
  {
    id: 'tylenol-cyanide',
    title: 'Tylenol Bottle with Cyanide',
    topic: 'burden-of-proof',
    summary:
      'A single reasonable doubt compromises the whole case, just like one poisoned pill compromises the whole bottle.',
    steps: [
      {
        attorney_prompt:
          'You have a bottle of 1,000 Tylenol pills at home. A news report breaks that somewhere in a batch like yours, one single pill was tampered with and contains cyanide.',
      },
      {
        attorney_prompt:
          'You do not know which one. It is probably not in your bottle. It is probably not the next pill you would take. The odds are overwhelmingly in your favor.',
      },
      {
        attorney_prompt:
          'Do you take any of the 1,000 pills?',
        checkpoint: {
          id: 'would-not-take-any',
          question:
            'Did the juror agree they would not take ANY of the pills despite the tiny probability?',
          options: ['yes', 'no', 'hesitant'],
        },
      },
      {
        attorney_prompt:
          'A single, reasonable doubt about one piece of the state\'s evidence is that cyanide pill. It compromises the whole case. Is that reasonable?',
        checkpoint: {
          id: 'one-doubt-compromises-case',
          question: 'Did the juror accept that one reasonable doubt is enough to acquit?',
          options: ['yes', 'no', 'hesitant'],
        },
      },
    ],
  },
  {
    id: 'cookie-jar',
    title: 'The Cookie Jar (Circumstantial Evidence)',
    topic: 'circumstantial-evidence',
    summary:
      'Walks through direct vs. circumstantial, then tests whether the juror can see an alternative explanation.',
    steps: [
      {
        attorney_prompt:
          'Imagine you walk into the kitchen and your child\'s hand is physically inside the cookie jar. That is DIRECT evidence that the child took a cookie.',
      },
      {
        attorney_prompt:
          'Now imagine instead you walk in and find your child sitting on the porch, with crumbs on their shirt and an empty glass of milk. That is CIRCUMSTANTIAL evidence — you are making a logical leap from the clues to the conclusion.',
        checkpoint: {
          id: 'understands-distinction',
          question: 'Did the juror show they understand the distinction?',
          options: ['yes', 'no', 'hesitant'],
        },
      },
      {
        attorney_prompt:
          'Now — next to the child you notice the wrapper of a store-bought snack pack. Does the circumstantial evidence still prove the cookies came from the jar in the kitchen?',
        checkpoint: {
          id: 'can-see-alternative',
          question:
            'Did the juror recognize that an alternative innocent explanation creates reasonable doubt?',
          options: ['yes', 'no', 'hesitant'],
        },
      },
    ],
  },
  {
    id: 'le-bias-tree',
    title: 'Law-Enforcement Bias — Depth of Ties',
    topic: 'law-enforcement-bias',
    summary:
      'Goes past "do you know a cop" into whether the juror has internalized pro-prosecution framing.',
    steps: [
      {
        attorney_prompt:
          'You mentioned [friend / family member] works in law enforcement. How often do you talk with them about their job?',
        checkpoint: {
          id: 'frequency-of-work-talk',
          question: 'Does the juror regularly hear police-perspective framing of cases?',
          options: ['yes', 'no', 'hesitant'],
        },
      },
      {
        attorney_prompt:
          'When you walk into this courtroom and see officers in uniform testifying — what is your first reaction?',
        coaching:
          'Listen for respect that shades into presumed credibility. Follow up if vague.',
      },
      {
        attorney_prompt:
          'Police officers are human beings. They can be mistaken, they can be biased, they can remember a detail wrong under pressure — just like any other witness. Can you evaluate their testimony with the same skepticism you would use for any other witness?',
        checkpoint: {
          id: 'same-scrutiny-as-civilian',
          question:
            'Did the juror commit to scrutinizing police testimony the same as civilian testimony?',
          options: ['yes', 'no', 'hesitant'],
        },
      },
    ],
  },
  {
    id: 'unfair-contest',
    title: 'The Unfair Contest (Defendant\'s Silence)',
    topic: 'defendant-silence',
    summary:
      'Reframes "why wouldn\'t you testify if innocent?" as a strategic mismatch, not guilt.',
    steps: [
      {
        attorney_prompt:
          'Imagine you got into a disagreement with a law professor. She has tried thousands of cases. She is trained in rhetoric. She has studied how to cross-examine people for twenty years.',
      },
      {
        attorney_prompt:
          'Now imagine you are in a public debate against her on a topic she studies every day. Would you feel confident you could hold your own, even if you were completely in the right?',
        checkpoint: {
          id: 'acknowledges-mismatch',
          question: 'Did the juror acknowledge it would be an unfair contest?',
          options: ['yes', 'no', 'hesitant'],
        },
      },
      {
        attorney_prompt:
          'That is exactly the advice a defendant gets from counsel. Silence is not an admission — it is a strategic choice to avoid an intellectual mismatch. Can you accept that my client\'s silence says nothing about his innocence or guilt?',
        checkpoint: {
          id: 'wont-hold-silence-against',
          question:
            'Did the juror commit to not holding silence against the defendant?',
          options: ['yes', 'no', 'hesitant'],
        },
      },
    ],
  },
  {
    id: 'social-pressure',
    title: 'Social Pressure After the Verdict',
    topic: 'social-pressure',
    summary:
      'Tests whether the juror can vote "not guilty" when they know their community might not understand.',
    steps: [
      {
        attorney_prompt:
          'After this trial, you go home. Your neighbors, your coworkers, your family ask you what happened. Suppose you voted to acquit.',
      },
      {
        attorney_prompt:
          'Are you worried some of them will give you grief? That they will say, "How could you let him walk?"',
        checkpoint: {
          id: 'anticipates-social-fallout',
          question: 'Did the juror acknowledge they anticipate some social pressure?',
          options: ['yes', 'no', 'hesitant'],
        },
      },
      {
        attorney_prompt:
          'A vote to acquit, when the state has not met its burden, is every bit as important to law and order as a conviction. It protects innocent people from being convicted on incomplete evidence. Can you tell me right now that if you reach that conclusion, you will vote to acquit — regardless of what anyone else thinks?',
        checkpoint: {
          id: 'commits-to-acquit-if-needed',
          question:
            'Did the juror commit to voting their conclusion regardless of social fallout?',
          options: ['yes', 'no', 'hesitant'],
        },
      },
    ],
  },
];

export function analogyById(id: string): Analogy | undefined {
  return ANALOGIES.find((a) => a.id === id);
}

export function analogiesByTopic(topic: AnalogyTopic): Analogy[] {
  return ANALOGIES.filter((a) => a.topic === topic);
}
