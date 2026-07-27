local blockPresent, detail = turtle.inspect()

print(blockPresent)
if blockPresent then
    print(detail.name, detail.state.facing)
end

print(peripheral.call("front", "getID"))
