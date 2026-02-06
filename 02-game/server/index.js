import { createServer } from "node:net";

const ENCODING = 'ascii';
const PORT = 4889;

function connectionListener(connection) {
    connection.write(
        Buffer.from('Hello world\n', ENCODING)
    );
    connection.end();
}

const server = createServer(connectionListener);

server.listen(PORT);
