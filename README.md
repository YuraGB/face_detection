# Python DNN Face Server

This project implements a **face detection server using Python, OpenCV, and Socket.IO**.
___The server receives frames from a webcam or a client___, detects faces, and returns face coordinates along with the image annotated with bounding boxes.

---

## Installation

1. Create a virtual environment (optional):

```bash
python -m venv .venv
```


## Start python socket server
1. Start the script (start socket server)
```bash
python ./src/module/camera.py
```


## Start Front end
1. Go to
```bash
cd ./frontend
```
2. Start fron-end
```bash
bun dev
```
