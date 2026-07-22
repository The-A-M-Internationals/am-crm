export type BlockType = "header" | "paragraph" | "table";

export interface HeaderBlock {
  id: string;
  type: "header";
  level: 1 | 2 | 3;
  text: string;
}

export interface ParagraphBlock {
  id: string;
  type: "paragraph";
  text: string;
}

export interface TableBlock {
  id: string;
  type: "table";
  headers: string[];
  rows: string[][];
}

export type ProposalBlock = HeaderBlock | ParagraphBlock | TableBlock;

export interface ProposalDocument {
  title: string;
  blocks: ProposalBlock[];
}
