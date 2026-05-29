type WebMcpJsonSchema = {
    type: string;
    description?: string;
    properties?: Record<string, WebMcpJsonSchema>;
    required?: string[];
    additionalProperties?: boolean;
};

type WebMcpTool = {
    name: string;
    description: string;
    inputSchema: WebMcpJsonSchema;
    execute: (input: Record<string, unknown>) => Promise<unknown>;
    annotations?: {
        readOnlyHint?: boolean;
        untrustedContentHint?: boolean;
    };
};

interface Navigator {
    modelContext?: {
        registerTool: (
            tool: WebMcpTool,
            options?: { signal?: AbortSignal },
        ) => void;
        getTools?: () => Promise<unknown[]>;
        executeTool?: (
            tool: unknown,
            input: string,
            options?: { signal?: AbortSignal },
        ) => Promise<unknown>;
        addEventListener?: (
            type: "toolchange",
            listener: EventListenerOrEventListenerObject,
        ) => void;
    };
}
