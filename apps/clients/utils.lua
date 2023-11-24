while true do
    print("3D Printer Client Utility")
    print("1. Reboot Printers")
    print("2. Shutdown Printers")
    print("3. Exit")
    local input = tonumber(read())
    if input == 1 then
        print('how many printers?')
        local num = tonumber(read())
        for i = 1, num do
            turtle.forward()
            peripheral.call("bottom","reboot")
        end
        turtle.turnLeft()
        turtle.turnLeft()
        for i = 1, num do
            turtle.forward()
        end
        turtle.turnLeft()
        turtle.turnLeft()
    elseif input == 2 then
        print('how many printers?')
        local num = tonumber(read())
        for i = 1, num do
            turtle.forward()
            peripheral.call("bottom","shutdown")
        end
        turtle.turnLeft()
        turtle.turnLeft()
        for i = 1, num do
            turtle.forward()
        end
        turtle.turnLeft()
        turtle.turnLeft()

    elseif input == 3 then
        break
    else
        print("Invalid Input")
    end
end