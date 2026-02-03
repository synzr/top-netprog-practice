import NodeCache from "node-cache";

import { createSocket } from "node:dgram";
import crypto from "node:crypto";

const PORT = 4884; // NOTE: protocol port

const server = createSocket("udp4");
const connections = new NodeCache({ stdTTL: 60 });

// #region Handlers
function handleConnect(remote) {
    const id = crypto.randomUUID();
    connections.set(id, { address: remote.address });

    const message = Buffer.from(`CONNECTED\nYOU ${id}\n`, 'ascii');
    server.send(message, remote.port, remote.address);
}
// #endregion

// #region Server events
server.on("listening", () => {
    console.info("Server started");
});

server.on("message", (data, remote) => {
    data = data
        .toString("ascii")
        .split("\n");

    if (data[0].toUpperCase().startsWith("CONNECT")) {
        return handleConnect(remote);
    }
});
// #endregion

server.bind(PORT, "0.0.0.0");
