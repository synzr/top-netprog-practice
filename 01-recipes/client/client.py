import socket

ADDRESS = ("127.0.0.1", 4884)
BUFFER_SIZE = 255


class Client:
    def __init__(self):
        self.__socket = socket.socket(family=socket.AF_INET, type=socket.SOCK_DGRAM)
        self.__id = None

    def __send(self, command):
        if not self.__id:
            raise Exception("Client not connected")

        message = f"ME {self.__id}\n{command}\n"
        self.__socket.sendto(message.encode('utf-16le'), ADDRESS)

    def __recv(self):
        message, _ = self.__socket.recvfrom(BUFFER_SIZE)
        message = message.decode("utf-16le")

        if message.upper().startswith("ERROR"):
            code = int(message.split("\n")[0].split(" ")[1].strip(), 10)
            raise Exception(f"Protocol error with code {code}")

        return message

    def connect(self):
        if self.__id:
            return

        self.__socket.sendto("CONNECT\n".encode("utf-16le"), ADDRESS)

        message = self.__recv()
        self.__id = message.split("\n")[1].split(" ")[1].strip()

    def disconnect(self):
        if not self.__id:
            return

        self.__send("DISCONNECT")

        message = self.__recv()
        if "DISCONNECTED" not in message.upper():
            raise Exception("Server doesn't let us to disconnect")

        self.__id = None

    def ping(self):
        self.__send("PING")

        message = self.__recv()
        if "PONG" not in message.upper():
            raise Exception("Server didn't pong")

    def search(self, products):
        product_count = len(products)

        products = [f'{index:02d} "{product}"' for index, product in enumerate(products)]
        products = '\n'.join(products)

        self.__send(f'SEARCH {product_count:02d}\n{products}')

        message = self.__recv().split('\n')
        if not message[0].upper().startswith("FOUND"):
            raise Exception('Server didn\'t respond with "FOUND"')

        count = int(message[0].split(' ')[-1])
        recipes = {}

        line = 1
        for _ in range(count):
            if not message[line].startswith("RECIPE"):
                raise Exception('Invalid response format: No RECIPE')

            name = message[line].split('"')[1]
            product_count = int(message[line].split(" ")[-1], 10)

            line += 1

            recipes[name] = []
            for index in range(product_count):
                product_index = int(message[line].split(" ")[0], 10)

                if product_index != index:
                    raise Exception('Incorrect product index')

                product_name = message[line].split('"')[1]
                recipes[name].append(product_name)

                line += 1

        return recipes

def main():
    client = Client()

    client.connect()
    client.ping()

    recipes = client.search(['Молоко', 'Яйца', 'Соль', 'Сливочное масло'])

    print(f"Найдено рецептов: {len(recipes)}")
    for recipe, products in recipes.items():
        print(f'\tРецепт "{recipe}"')

        for product in products:
            print(f"\t\t- {product}")

        print()

    client.disconnect()


if __name__ == "__main__":
    main()
