local ws, err = http.websocket('ws://localhost:4321')

ws.send("feur")
