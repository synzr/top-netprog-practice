import NodeCache from "node-cache";

import { createSocket } from "node:dgram";
import crypto from "node:crypto";

const PORT = 4884; // NOTE: protocol port
const CONNECTION_TTL = 60;

/**
 * @enum
 */
const ErrorCode = {
    BAD_REQUEST: 1,
    SESSION_ERROR: 2,
    SEARCH_ERROR: 3,
    SERVER_ERROR: 4,
}

const server = createSocket("udp4");
const connections = new NodeCache({ stdTTL: CONNECTION_TTL });

// #region Handlers
function handleConnect(remote) {
    const id = crypto.randomUUID();
    connections.set(id, { address: remote.address });

    const message = Buffer.from(`CONNECTED\nYOU ${id}\n`, 'ascii');
    server.send(message, remote.port, remote.address);
}

function handlePing(id, remote) {
    connections.ttl(id, CONNECTION_TTL);
    server.send(Buffer.from('PONG\n', 'ascii'), remote.port, remote.address);
}
// #endregion

function sendError(remote, code) {
    const message = Buffer.from(`ERROR ${code}\n`, 'ascii');
    server.send(message, remote.port, remote.address);
}

// #region Server events
server.on("listening", () => {
    console.info("Server started");
});

server.on("message", (data, remote) => {
    data = data
        .toString("ascii")
        .trim()
        .split("\n");

    if (data[0].toUpperCase().startsWith("CONNECT")) {
        return handleConnect(remote);
    }

    let connectionId;

    try {
        if (!data[0].toUpperCase().startsWith("ME")) {
            return;
        }

        connectionId = data[0].split(" ").pop();
    } catch {
        return sendError(remote, ErrorCode.BAD_REQUEST);
    }

    if (!connections.has(connectionId)) {
        return sendError(remote, ErrorCode.SESSION_ERROR);
    }

    const connectionAddress = connections.get(connectionId).address;
    if (connectionAddress != remote.address) {
        return sendError(remote, ErrorCode.SESSION_ERROR);
    }

    try {
        const command = data[1].toUpperCase().split(" ")[0];
        switch (command) {
            case "GET": {
                break;
            }

            case "PING": {
                return handlePing(connectionId, remote);
            }

            case "DISCONNECT": {
                break;
            }
        }
    } catch {
        return sendError(remote, ErrorCode.SERVER_ERROR);
    }
});
// #endregion

server.bind(PORT, "0.0.0.0");
