-- turtle.forward()
-- print(turtle.select(56))
-- -- coroutine.yield()
-- turtle.back()
-- -- coroutine.yield()
-- turtle.turnLeft()
-- turtle.forward()
-- turtle.forward()
-- -- coroutine.yield()
function printInv()
    for i = 1, 16 do
        local item = turtle.getItemDetail(i)
        if item ~= nil then
            print(i, item.name, item.count)
        else
            print(i, nil)
        end
    end
    print("equipment")
    local el = turtle.getEquippedLeft()
    local er = turtle.getEquippedRight()
    if el ~= nil then
        print("left", el.name)
    else
        print("left", nil)
    end
    if er ~= nil then
        print("left", er.name)
    else
        print("right", nil)
    end
end

printInv()
print("\n")
turtle.equipLeft()
printInv()
-- local e = turtle.getEquippedLeft()
-- print(e.name, e.count, e.maxCount)
