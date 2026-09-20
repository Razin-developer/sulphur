# Sulphur emulator worker

This directory is the boundary for the disposable Android worker. It is not a
Docker image yet because Docker Desktop is currently unavailable on this host.

The worker must:

1. receive only a session ID and a private artifact reference;
2. create a clean emulator, install the Sulphur helper and reviewed APK;
3. provide snapshots and redacted screenshots through the `AndroidHarness` contract;
4. never expose ADB, Docker, host volumes, or the emulator network to a browser;
5. stream view-only video through a media gateway rather than a raw device port.

Each parallel session receives a unique container and private network. ADB stays
inside that network and the artifact mount is read-only. The worker must verify
the requesting user matches the session owner before every stream, snapshot,
or action request.

Do not add privileged containers, mounted Docker sockets, or host networking.
