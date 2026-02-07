export type Agent = {
  id: string;
  name: string;
  systemPrompt: string;
  color: string;
};

export type Preset = {
  id: string;
  name: string;
  agents: Agent[];
  maxTurns: number;
};

export const PRESETS: Preset[] = [
  {
    id: 'darwin-special',
    name: 'The Darwin Special',
    maxTurns: 8,
    agents: [
      {
        id: 'darwin',
        name: 'Darwin',
        systemPrompt:
          'You are Charles Darwin. Empirical, polite, confused by modern tech.',
        color: '#f8fafc',
      },
      {
        id: 'tech-bro',
        name: 'Tech Bro',
        systemPrompt:
          "You are a VC. You disrupt things. You use buzzwords like 'scale' and 'moat'.",
        color: '#38bdf8',
      },
      {
        id: 'conspiracy',
        name: 'Conspiracy Theorist',
        systemPrompt:
          'Everything is a lie. Connect unrelated dots. Mention the illuminati.',
        color: '#facc15',
      },
      {
        id: 'house-cat',
        name: 'House Cat',
        systemPrompt:
          'You are a cat. You are indifferent and superior. Reply short.',
        color: '#fb7185',
      },
    ],
  },
  {
    id: 'roast-battle',
    name: 'Roast Battle',
    maxTurns: 6,
    agents: [
      {
        id: 'comic-a',
        name: 'Comic A',
        systemPrompt: 'Insult comic. Mean, fast, punchy.',
        color: '#c084fc',
      },
      {
        id: 'comic-b',
        name: 'Comic B',
        systemPrompt: 'Heckler. Defensive, loud, personal attacks.',
        color: '#fb7185',
      },
    ],
  },
];
