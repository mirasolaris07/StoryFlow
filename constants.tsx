
import React from 'react';
import { MessageSquare, Music, Users, Terminal, FolderOpen } from 'lucide-react';
import { Character } from './types';

export const INITIAL_CHARACTERS: Character[] = [
  {
    id: 'aerin',
    name: 'Aerin',
    voiceId: 'Kore',
    images: [
      { id: 'aerin-front', name: 'Front', url: 'Character/Aerin/Aerin front.png' },
      { id: 'aerin-side', name: '3-Side', url: 'Character/Aerin/Aerin 3 side.png' },
      { id: 'aerin-right', name: 'Right', url: 'Character/Aerin/Aerin right.png' },
    ],
    attributes: [
      { id: 'aerin-resolve', key: 'resolve', name: 'Resolve', initialValue: 10, visible: true, type: 'CHARACTER' }
    ]
  },
  {
    id: 'lyra',
    name: 'Lyra',
    voiceId: 'Zephyr',
    images: [
      { id: 'lyra-front', name: 'Front', url: 'Character/Lyra/Lyra front.png' },
      { id: 'lyra-full', name: 'Standard', url: 'Character/Lyra/Lyra.png' },
      { id: 'lyra-left', name: 'Left', url: 'Character/Lyra/Lyra left.png' },
      { id: 'lyra-right', name: 'Right', url: 'Character/Lyra/Lyra right.png' },
      { id: 'lyra-side', name: '3-Side', url: 'Character/Lyra/Lyra 3 side.png' },
    ],
    attributes: [
      { id: 'lyra-resolve', key: 'resolve', name: 'Resolve', initialValue: 5, visible: true, type: 'CHARACTER' }
    ]
  }
];

export const MENU_ITEMS = [
  { id: 'scenes', label: 'Story Map', icon: <MessageSquare size={18} /> },
  { id: 'characters', label: 'Cast', icon: <Users size={18} /> },
  { id: 'attributes', label: 'Variables', icon: <Terminal size={18} /> },
  { id: 'audio', label: 'Sound', icon: <Music size={18} /> },
];
