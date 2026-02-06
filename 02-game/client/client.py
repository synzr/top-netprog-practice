import socket

ADDRESS = ("127.0.0.1", 4889)
ENCODING = "ascii"


def main():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.connect(ADDRESS)
        msg = s.recv(1024)
        print(msg.decode(ENCODING))


if __name__ == "__main__":
    main()
