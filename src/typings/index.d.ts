declare module "statcord.js-beta" {
    // Import modules
    import * as Discord from "discord.js";

    // Create options
    interface BaseClientOptions {
        key: string;
        postCpuStatistics?: boolean;
        postMemStatistics?: boolean;
        postNetworkStatistics?: boolean;
    }

    // Sharding client options
    interface ShardingClientOptions extends BaseClientOptions {
        manager: Discord.ShardingManager;
        autopost?: boolean;
    }

    interface ClientOptions extends BaseClientOptions {
        client: Discord.Client;
    }

    // Create client typings
    class BaseClient {
        private autoposting: boolean;

        private baseApiUrl: string;
        private key: string;
        private manager: Discord.ShardingManager;

        private v11: boolean;
        private v12: boolean;
        private activeUsers: string[];
        private commandsRun: number;
        private used_bytes: number;
        private popularCommands: [
            {
            name: string;
            count: number;
            }
        ];

        private postCpuStatistics: boolean;
        private postMemStatistics: boolean;
        private postNetworkStatistics: boolean;

        private customFields: Map<1 | 2, (manager: Discord.ShardingManager) => Promise<string>>;
    }

    export class ShardingClient extends BaseClient {
        constructor(options: ShardingClientOptions);

        public static post(client: Discord.Client): void;
        public static postCommand(command_name: string, author_id: string, client: Discord.Client): void; 

        private post(): Promise<boolean | Error>;
        private postCommand(command_name: string, author: string): Promise<void>;
        public registerCustomFieldHandler(customFieldNumber: 1 | 2, handler: (manager: Discord.ShardingManager) => Promise<string>): Error | null;
    }

    export class Client extends BaseClient {
        constructor(options: ClientOptions);

        public autopost(): Promise<boolean | Error>;
        public post(): Promise<boolean | Error>;
        public postCommand(command_name: string, author: string): Promise<void>;
        public registerCustomFieldHandler(customFieldNumber: 1 | 2, handler: (client: Discord.Client) => Promise<string>): Error | null;
    }
}