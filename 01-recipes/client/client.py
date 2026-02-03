import socket

ADDRESS = ("127.0.0.1", 4884)
BUFFER_SIZE = 255


class Client:
    def __init__(self):
        self.__socket = socket.socket(family=socket.AF_INET, type=socket.SOCK_DGRAM)
        self.__id = None

    def connect(self):
        if self.__id:
            return

        self.__socket.sendto(b"CONNECT\n", ADDRESS)

        message, _ = self.__socket.recvfrom(BUFFER_SIZE)
        message = message.decode("ascii")

        if message.upper().startswith("ERROR"):
            code = int(message.split("\n")[0].split(" ")[1].strip(), 10)
            raise Exception(f"Protocol error with code {code}")

        self.__id = message.split("\n")[1].split(" ")[1].strip()

    def __send(self, command):
        if not self.__id:
            raise Exception("Client not connected")

        message = f"ME {self.__id}\n{command}\n"
        self.__socket.sendto(message.encode('ascii'), ADDRESS)

    def ping(self):
        self.__send("PING")

        message, _ = self.__socket.recvfrom(BUFFER_SIZE)
        message = message.decode("ascii")

        if message.upper().startswith("ERROR"):
            code = int(message.split("\n")[0].split(" ")[1].strip(), 10)
            raise Exception(f"Protocol error with code {code}")


def main():
    client = Client()

    client.connect()
    client.ping()


if __name__ == "__main__":
    main()
