import NodeCache from "node-cache";

import { createSocket } from "node:dgram";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";

const PORT = 4884; // NOTE: protocol port
const ENCODING = 'utf-16le';
const CONNECTION_TTL = 15;

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

    const message = Buffer.from(`CONNECTED\nYOU ${id}\n`, ENCODING);
    server.send(message, remote.port, remote.address);
}

function handlePing(id, remote) {
    connections.ttl(id, CONNECTION_TTL);
    server.send(Buffer.from('PONG\n', ENCODING), remote.port, remote.address);
}

function handleDisconnect(id, remote) {
    connections.del(id);
    server.send(Buffer.from('DISCONNECTED\n', ENCODING), remote.port, remote.address);
}

function handleSearch(remote, data) {
    let productCount;

    try {
        productCount = parseInt(
            data[1].trim().split(" ").pop(), 10
        );
    } catch {
        return sendError(remote, ErrorCode.SERVER_ERROR);
    }

    try {
        const products = [];
        for (let index = 2; index < productCount + 2; index++) {
            const [jndex, title] = data[index].trim().replace(" ", "\0").split("\0");
            products[parseInt(jndex, 10)] = title.replaceAll('"', "");
        }

        const found = getRecipesByProducts(products);

        let message = `FOUND ${(found.length ?? 0).toString().padStart(2, '0')}\n`;
        for (const recipe of found) {
            message += `RECIPE "${recipe.name}" ${(recipe.products.length ?? 0).toString().padStart(2, '0')}\n`;

            recipe.products.forEach((product, index) => {
                message += `${index.toString().padStart(2, '0')} "${product}"\n`;
            });
        }

        server.send(Buffer.from(message, ENCODING), remote.port, remote.address);
    } catch {
        return sendError(remote, ErrorCode.SEARCH_ERROR);
    }
}
// #endregion

function getRecipesByProducts(products) {
    const recipes = JSON.parse(
        fs.readFileSync(
            path.join(import.meta.dirname, './recipes.json'),
            { encoding: 'utf-8' },
        ),
    );

    const found = Object
        .entries(recipes)
        .filter(([_, recipeProducts]) => {
            const includedProducts = [];

            for (let recipeProduct of recipeProducts) {
                for (let product of products) {
                    if (recipeProduct.toLowerCase() === product.toLowerCase()) {
                        includedProducts.push(product);
                    }
                }
            }

            return includedProducts.length === recipeProducts.length;
        })

    return found.map(([recipe, recipeProducts]) => {
        return { name: recipe, products: recipeProducts };
    });
}

function sendError(remote, code) {
    const message = Buffer.from(`ERROR ${code}\n`, ENCODING);
    server.send(message, remote.port, remote.address);
}

// #region Server events
server.on("listening", () => {
    console.info("Server started");
});

server.on("message", (data, remote) => {
    data = data
        .toString(ENCODING)
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
            case "SEARCH": {
                return handleSearch(remote, data);
            }

            case "PING": {
                return handlePing(connectionId, remote);
            }

            case "DISCONNECT": {
                return handleDisconnect(connectionId, remote);
            }
        }
    } catch (error) {
        console.error(error)
        return sendError(remote, ErrorCode.SERVER_ERROR);
    }
});
// #endregion

server.bind(PORT, "0.0.0.0");
