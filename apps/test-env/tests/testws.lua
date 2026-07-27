local ws, err = http.websocket('ws://localhost:4321')

ws.send("test msg")
local msg, is_binary = ws.receive()
print(msg, is_binary)
