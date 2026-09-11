export type Block =
  | { type: "text"; text: string }
  | {
      type: "tool_call";
      name: string;
      status: "pending" | "done";
      detail?: string;
    };

export type Message = {
  id: string;
  role: "user" | "agent";
  blocks: Block[];
};

export type Thread = {
  id: string;
  title: string;
  createdAt: number;
  messages: Message[];
};
