import { createSocket } from "node:dgram";

const PORT = 4884; // NOTE: protocol port

const server = createSocket("udp4");

server.on("listening", () => {
    console.info("Server started");
});

server.on("message", (data, remote) => {
    server.send(data, remote.port, remote.address);
});

server.bind(PORT, "0.0.0.0");
