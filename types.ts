
export enum NodeType {
  START = 'START',
  SCENE = 'SCENE',
  LOGIC = 'LOGIC',
  SETTER = 'SETTER',
  MENU = 'MENU',
  END = 'END',
  SUPER = 'SUPER'
}

export enum EventType {
  DIALOGUE = 'DIALOGUE',
  NARRATION = 'NARRATION',
  MUSIC_CHANGE = 'MUSIC_CHANGE',
  CHAR_ENTER = 'CHAR_ENTER',
  CHAR_EXIT = 'CHAR_EXIT',
  ATTR_MOD = 'ATTR_MOD'
}

export interface Attribute {
  id: string;
  key: string;
  name: string;
  initialValue: number;
  visible: boolean;
  type: 'GAME' | 'CHARACTER';
  scope?: 'SESSION' | 'GLOBAL'; // New: Persistence Scope
}

export interface CharacterImage {
  id: string;
  name: string;
  url: string; // Will follow Character/[Name]/[FileName].png
}

export interface Character {
  id: string;
  name: string;
  description?: string;
  voiceId?: string; // Google TTS Voice Name, or "None"
  images: CharacterImage[];
  attributes: Attribute[]; // Synchronized schema across all characters
}

export interface AudioAsset {
  id: string;
  name: string;
  url: string;
}

export interface SceneEvent {
  id: string;
  type: EventType;
  characterId?: string;
  characterImageId?: string;
  text?: string;
  audioAssetId?: string;
  voiceAssetId?: string; // New: For pre-generated voice files
  attributeTargetId?: string;
  attributeValue?: number;
  attributeFormula?: string; // For text-based formulas
  operation?: 'SET' | 'ADD' | 'SUB' | 'MUL' | 'DIV';
  visible?: boolean;
  loop?: boolean; // New: Support for looping BGM
  x?: number;
  y?: number;
  scale?: number;
  flip?: boolean;
}

export type LogicOperator = 'AND' | 'OR';
export type ComparisonOperator = '>' | '<' | '==' | '!=' | '>=' | '<=';

export interface LogicCondition {
  id: string; // Unique ID for UI keys
  type: 'GROUP' | 'STATEMENT' | 'EXPRESSION';
  // For Group
  operator?: LogicOperator;
  conditions?: LogicCondition[];
  // For Statement
  scope?: 'GAME' | 'CHARACTER';
  targetId?: string; // Character ID or 'GAME'
  attributeId?: string;
  comparison?: ComparisonOperator;
  value?: number;
  // For Expression
  expression?: string;
}

export interface Choice {
  id: string;
  text: string;
  nextNodeId: string;
  logicRoot?: LogicCondition;
}

export interface NodeData {
  title: string;
  subtitle?: string; // For Menu
  description?: string;
  events: SceneEvent[];
  choices: Choice[];
  musicPersistent?: boolean;
  backgroundMusic?: string; // For Menu
  backgroundImage?: string; // Will follow Scene/[Name].png
  backgroundScaling?: 'COVER' | 'FIXED';
  // Super Node Props
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  // AI Branching
  variants?: ScenarioVariant[];
}

export interface ScenarioVariant {
  id: string;
  name: string;
  description?: string;
  nodeChanges: Record<string, SceneEvent[]>; // Mapping nodeId to proposed events
}

export interface GameState {
  gameAttributes: Record<string, number>;
  characterAttributes: Record<string, Record<string, number>>;
  characters: Character[];
  currentSceneId: string;
  activeMusicId: string | null;
  history: string[];
}

export interface DialogueBoxStyle {
  boxColor: string;
  textColor: string;
  fontFamily: string;
  opacity: number;
  yPosition: number; // % from bottom
  width?: number; // % width, defaults to 100 if undefined
  xPosition?: number; // % center offset, defaults to 50 if undefined
  height: number; // % height
  // Advanced Visuals
  bgType?: 'COLOR' | 'GRADIENT' | 'IMAGE';
  gradient?: {
    colors: string[]; // [start, end]
    direction: string; // 'to bottom', 'to right'
    overlayOpacity: number;
  };
  borderImage?: {
    source: string; // URL/Path
    slice: number;
    width: number;
    repeat: 'stretch' | 'repeat' | 'round';
  };
  optionButtonImage?: {
    source: string;
    slice: number;
    width: number;
    repeat: 'stretch' | 'repeat' | 'round';
  };
  backdropBlur?: number; // px, for glassmorphism
}

export interface ProjectRecord {
  projectName?: string;
  nodes: any[];
  edges: any[];
  characters: Character[];
  audioAssets: AudioAsset[];
  gameAttributes: Attribute[];
  dialogueStyle?: DialogueBoxStyle;
  narratorVoice?: string;
  version: string;
  lastSaved: string;
}

export interface SaveSlot {
  id: number;
  timestamp: string;
  thumbnail?: string;
  gameState: GameState;
  locationName: string;
  playTime: number;
}
