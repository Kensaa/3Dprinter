local config = {
    buildBlock = "minecraft:cobblestone",
    gpsTry = 5
}

local url = "$WS_URL$"

fs.delete('libs')
fs.makeDir('libs')
shell.run('wget $WEB_URL$/libs/json.lua libs/json.lua')
shell.run('wget $WEB_URL$/libs/websocket.lua libs/websocket.lua')

sleep(1)
json = require "libs/json"
websocket = require "libs/websocket"
-- Setup :
-- equip chunk loader from advanced peripheral to the left
-- equip either a pickaxe or a advanced wireless modem to the right and place the other into the 15th slot
-- place the block enderchest in the last slot

function equipPickaxe()
    turtle.select(15)
    if turtle.getItemDetail().name ~= 'minecraft:diamond_pickaxe' then
        turtle.select(1)
        return
    end
    turtle.equipRight()
    turtle.select(1)
end

function equipModem()
    turtle.select(15)
    if turtle.getItemDetail().name ~= 'computercraft:wireless_modem_advanced' then
        turtle.select(1)
        return
    end
    turtle.equipRight()
    turtle.select(1)
end

function restock(amount)
    local slotsToFill = math.min(14, math.floor(amount / 64))
    equipPickaxe()
    turtle.select(16)
    turtle.placeUp()
    turtle.select(1)

    local firstItem = nil
    for k, v in pairs(peripheral.call("top", "list") or {}) do
        firstItem = v.name
        break
    end
    while firstItem ~= config['buildBlock'] do
        for k, v in pairs(peripheral.call("top", "list") or {}) do
            firstItem = v.name
            break
        end
        sleep(1)
    end

    for i = 1, slotsToFill do
        turtle.select(i)
        if (turtle.getItemCount() == 0) then
            turtle.suckUp()
        end
        turtle.suckUp()
    end
    if slotsToFill < 14 then
        turtle.select(slotsToFill + 1)
        if (turtle.getItemCount() == 0) then
            turtle.suckUp(amount % 64)
        end
    end
    turtle.select(16)
    turtle.digUp()
    turtle.select(1)
end

function checkFuel()
    currentSlot = turtle.getSelectedSlot()
    previousState = currentState
    if turtle.getFuelLevel() < 100 then
        print('turtle is out of fuel')
        print('please add fuel and press enter')
        setState('refueling')
        read()
        for slot = 1, 14 do
            turtle.select(slot)
            turtle.refuel()
        end
        turtle.select(currentSlot)
        print('turtle refueled')
        print('remove leftover fuel and press enter')
        read()
        setState(previousState)
    end
end

function refuel()
    currentSlot = turtle.getSelectedSlot()
    previousState = currentState
    setState('refueling')
    for slot = 1, 14 do
        turtle.select(slot)
        turtle.refuel()
    end
    turtle.select(currentSlot)
    setState(previousState)
end

function place()
    local slot = 0
    while turtle.getItemCount() == 0 or turtle.getItemDetail().name ~= config['buildBlock'] do
        slot = slot + 1
        if slot == 15 then
            restock(blockToPlace)
            slot = 1
        end
        turtle.select(slot)
    end
    turtle.placeDown()
    blockToPlace = blockToPlace - 1
end

function log(message)
    websocket.sendRequest('log', { message = message })
end

function setProperty(property, value)
    websocket.sendRequest('setProperty', { property = property, value = value })
end

function setState(state)
    if currentState ~= state then
        currentState = state
        setProperty("state", state)
    end
end

function countA(a)
    c = {}
    for k, v in pairs(a) do
        if not (v ~= v) then
            if c[v] ~= nil then
                c[v] = c[v] + 1
            else
                c[v] = 1
            end
        end
    end
    return c
end

function maxA(a)
    maxI = 0
    for k, v in pairs(a) do
        if a[maxI] == nil then
            maxI = k
        end
        if v > a[maxI] then
            maxI = k
        end
    end
    return maxI
end

function locate()
    equipModem()
    posA = {}
    for i = 1, config['gpsTry'] do
        table.insert(posA, { gps.locate(2) })
    end
    xA = {}
    yA = {}
    zA = {}
    for k, v in pairs(posA) do
        table.insert(xA, v[1])
        table.insert(yA, v[2])
        table.insert(zA, v[3])
    end
    cntX = countA(xA)
    cntY = countA(yA)
    cntZ = countA(zA)
    x = maxA(cntX)
    y = maxA(cntY)
    z = maxA(cntZ)
    -- marchera pas en 0 0 0
    if x == 0 and y == 0 and z == 0 then
        return locate()
    end
    return x, y, z
end

function getHeading()
    local before = { locate() }
    turtle.forward()
    local after = { locate() }
    turtle.back()
    if after[1] > before[1] then
        -- x+
        return 1
    elseif after[3] > before[3] then
        -- z+
        return 2
    elseif after[1] < before[1] then
        -- x-
        return 3
    elseif after[3] < before[3] then
        -- z-
        return 4
    else
        return -1
    end
end

function isTurtle(blockData)
    return blockData.name == "computercraft:turtle_advanced" or blockData.name == "computercraft:turtle_normal"
end

function headingStringToInt(heading)
    if heading == "north" then
        return 0
    elseif heading == "east" then
        return 1
    elseif heading == "south" then
        return 2
    elseif heading == "west" then
        return 3
    end
end

function turnRight()
    turtle.turnRight()
    currentHeading = currentHeading + 1
end

function turnLeft()
    turtle.turnLeft()
    currentHeading = currentHeading - 1
end

function forward()
    while not turtle.forward() do
        local blocked, blockData = turtle.inspect()
        if isTurtle(blockData) then
            local facing = headingStringToInt(blockData.state.facing)
            if currentHeading % 4 == (facing + 2) % 4 then
                -- the two turtles are facing each other
                --dodge if the current turtle is the one with the higher id
                if os.getComputerID() > peripheral.call("front", "getID") then
                    print('im higher id')
                    if turtle.up() then
                        currentPosition[2] = currentPosition[2] + 1
                    elseif turtle.down() then
                        currentPosition[2] = currentPosition[2] - 1
                    end
                else
                    print('im lower id')
                    sleep(1)
                end
            end
        else
            up()
        end
    end
    if currentHeading % 4 == 1 then
        currentPosition[1] = currentPosition[1] + 1
    elseif currentHeading % 4 == 2 then
        currentPosition[3] = currentPosition[3] + 1
    elseif currentHeading % 4 == 3 then
        currentPosition[1] = currentPosition[1] - 1
    elseif currentHeading % 4 == 0 then
        currentPosition[3] = currentPosition[3] - 1
    end
end

function backward()
    while not turtle.back() do
        turnRight()
        turnRight()
        local _, blockData = turtle.inspect()
        turnRight()
        turnRight()
        if isTurtle(blockData) then
            local facing = headingStringToInt(blockData.state.facing)
            if currentHeading % 4 == (facing + 2) % 4 then
                -- the two turtles are facing each other
                --dodge if the current turtle is the one with the higher id
                if os.getComputerID() > peripheral.call("back", "getID") then
                    backward()
                else
                    sleep(1)
                end
            end
        else
            backward()
        end
    end
    if currentHeading % 4 == 1 then
        currentPosition[1] = currentPosition[1] - 1
    elseif currentHeading % 4 == 2 then
        currentPosition[3] = currentPosition[3] - 1
    elseif currentHeading % 4 == 3 then
        currentPosition[1] = currentPosition[1] + 1
    elseif currentHeading % 4 == 0 then
        currentPosition[3] = currentPosition[3] + 1
    end
end

function up()
    while not turtle.up() do
        local _, blockData = turtle.inspectUp()
        if isTurtle(blockData) then
            sleep(1)
        else
            forward()
        end
    end
    currentPosition[2] = currentPosition[2] + 1
end

function down()
    while not turtle.down() do
        local _, blockData = turtle.inspectDown()
        if isTurtle(blockData) then
            sleep(1)
        else
            forward()
        end
    end
    currentPosition[2] = currentPosition[2] - 1
end

function goTo(targetX, targetY, targetZ, maxHeight)
    maxHeight = maxHeight or 310
    if currentHeading == -1 then
        print('error')
        return
    end

    -- go to max height first, to avoid block already placed by other turtles
    while currentPosition[2] < maxHeight do
        up()
    end

    while currentPosition[1] ~= targetX or currentPosition[2] ~= targetY or currentPosition[3] ~= targetZ do
        if not paused then
            if currentPosition[1] < targetX then
                -- x+
                headTo(1)
                forward()
            elseif currentPosition[1] > targetX then
                -- x-
                headTo(3)
                forward()
            elseif currentPosition[3] < targetZ then
                -- z+
                headTo(2)
                forward()
            elseif currentPosition[3] > targetZ then
                -- z-
                headTo(0)
                forward()
            elseif currentPosition[2] < targetY then
                -- y+
                up()
            elseif currentPosition[2] > targetY then
                -- y-
                down()
            end
        else
            print("paused")
            sleep(1)
        end
    end
end

function headTo(heading)
    while currentHeading % 4 ~= heading % 4 do
        turnRight()
    end
end

function build(data, height, depth, width)
    for y = 1, height do
        print("layer n°" .. y)
        local layer = data[y]
        local startIndexes = {}
        local endIndexes = {}

        -- if the layer is empty, we don't have to do anything
        local layerEmpty = true
        for z = 1, depth do
            for x = 1, width do
                if tonumber(layer[z][x]) == 1 then
                    layerEmpty = false
                end
            end
        end
        if layerEmpty then
            print('layer is empty')
            if y ~= height then
                up()
            end
        else
            print('layer is not empty')
            for z = 1, depth do
                for x = width, 1, -1 do
                    if tonumber(layer[z][x]) == 1 then
                        startIndexes[z] = x
                    end
                end
                for x = 1, width do
                    if tonumber(layer[z][x]) == 1 then
                        endIndexes[z] = x
                    end
                end
            end

            local Xdir = 0   -- 0 = left to right | 1 = right to left
            local startX = 1 -- index from which to start on next row (default to 1 to start the first row at the start)
            for z = 1, depth do
                if not paused then
                    local row = layer[z]
                    print('row n°' .. z .. ', Xdir: ' .. Xdir)

                    if startIndexes[z] == nil and z ~= depth then
                        --last row --> don't have to take shortcut --> break everything
                        print('line is empty')
                        if Xdir == 0 then
                            turnRight()
                            forward()
                            turnLeft()
                        else
                            turnLeft()
                            forward()
                            turnRight()
                        end
                    else
                        print('line is not empty')
                        --don't forward on first pass because at the start of each row, the turtle is 1 bloc further from where it should be
                        firstPass = true
                        for x = startX, width do
                            index = x

                            if Xdir == 1 then
                                index = width - x + 1
                            end
                            if not firstPass then
                                forward()
                            else
                                firstPass = false
                            end
                            if tonumber(row[index]) == 1 then
                                place()
                            end

                            -- end of line
                            if x == width then
                                print("end of line")
                                if z ~= depth then
                                    -- last row ---> dont turn --> makes the turtle go 1 block down while it shouldn't
                                    startX = 1
                                    if Xdir == 0 then
                                        Xdir = 1
                                        turnRight()
                                        forward()
                                        turnRight()
                                    else
                                        Xdir = 0
                                        turnLeft()
                                        forward()
                                        turnLeft()
                                    end
                                end
                            else
                                -- shortcut
                                if Xdir == 0 then
                                    if endIndexes[z] ~= nil and x >= endIndexes[z] then             -- if further than last on current line
                                        if endIndexes[z + 1] ~= nil and x >= endIndexes[z + 1] then -- if further than last on next line
                                            -- shortcut available
                                            startX = width - x +
                                                1    -- set next start to where the shortcut places us
                                            Xdir = 1 -- we change direction (obviously)
                                            print("turning earlier to the right")
                                            turnRight()
                                            forward()
                                            turnRight()
                                            break
                                        end
                                    end
                                else
                                    i = width - x + 1
                                    if startIndexes[z] ~= nil and i <= startIndexes[z] then             -- if further than first on current line
                                        if startIndexes[z + 1] ~= nil and i <= startIndexes[z + 1] then -- if further than first on next line
                                            -- shortcut available
                                            startX =
                                                i    -- set next start to where the shortcut places us
                                            Xdir = 0 -- we change direction (obviously)
                                            print("turning earlier to the left")
                                            --backward()
                                            turnLeft()
                                            forward()
                                            turnLeft()
                                            break
                                        end
                                    end
                                end
                            end
                        end
                    end
                    progress = (y - 1 + (z - 1) / depth) / height * 100
                    setProperty('progress', progress)
                else
                    print("paused")
                    sleep(1)
                end
            end
            -- end of layer
            if y ~= height then -- if it's the last layer, no need to go back to the start
                if Xdir == 0 then
                    --oposite side as start
                    turnRight()
                    turnRight()

                    for i = 1, width - 1 do
                        forward()
                    end
                    turnRight()
                else
                    --same side as start
                    turnRight()
                end
                for _ = 1, depth - 1 do
                    forward()
                end
                turnRight()
                up()
            end
        end
    end
    setProperty('progress', 100)
    up()
    up()
end

function handleData(JSONData)
    local pos = JSONData['pos']
    local heading = tonumber(JSONData['heading'])
    local data = JSONData['data']
    local height = tonumber(JSONData['height'])
    local depth = tonumber(JSONData['depth'])
    local width = tonumber(JSONData['width'])

    local heightOffset = tonumber(JSONData['heightOffset'])
    local depthOffset = tonumber(JSONData['depthOffset'])
    local widthOffset = tonumber(JSONData['widthOffset'])

    local x = tonumber(pos[1])
    local y = tonumber(pos[2])
    local z = tonumber(pos[3])

    blockToPlace = tonumber(JSONData['blockCount'])

    y = y + heightOffset

    if heading == 1 then
        x = x + widthOffset
        z = z + depthOffset
    elseif heading == 2 then
        x = x - depthOffset
        z = z + widthOffset
    elseif heading == 3 then
        x = x - widthOffset
        z = z - depthOffset
    elseif heading == 4 then
        x = x + depthOffset
        z = z - widthOffset
    end

    buildMaxHeight = height + y + 1
    log('building a ' ..
        width .. 'x' .. depth .. 'x' .. height .. ' shape at ' .. x .. ',' .. y .. ',' .. z .. ' (' ..
        blockToPlace .. ' blocks)')
    print('max height: ' .. buildMaxHeight)
    setState('moving')
    goTo(x, y + 1, z, buildMaxHeight + 2)
    headTo(heading)
    setState('building')
    build(data, height, depth, width)
    fs.delete('data')
    log("finished building, asking for next part")
    websocket.sendRequest('setProperty', { property = "progress", value = 0 })
    local nextPartResponse = websocket.sendRequestAndWaitForResponse('getNextPart', {})
    if nextPartResponse then
        print(textutils.serializeJSON(nextPartResponse))
        local hasNewPart = nextPartResponse['newPart']
        if not hasNewPart then
            log("no next part, going back to home position")
            setState('moving')
            goTo(homePosition[1], homePosition[2], homePosition[3], buildMaxHeight + 2)
            headTo(homeHeading)
            log("back to home position, waiting for order")
            setState('idle')
        end
    end
end

function buildManager()
    while true do
        local buildData = ''
        local buildStartBody = websocket.waitForMessage({ type = "buildStart" })['body']
        -- print(textutils.serialize(buildStartBody))
        local partCount = buildStartBody['partCount']
        print("starting to receive " .. partCount .. ' parts')
        for i = 0, partCount - 1 do
            print("receiving part " .. i)
            local chunk = websocket.waitForMessage({ type = "buildChunk", body = { index = i } })['body']['chunk']
            buildData = buildData .. chunk
        end
        websocket.waitForMessage({ type = "buildEnd" })
        print('received ' .. partCount .. ', starting build')
        -- TODO: maybe change that
        handleData(json.decode(buildData))
    end
end

function remoteManager()
    while true do
        local message = websocket.waitForMessage({ type = "remote" })
        if message ~= nil then
            local body = message['body']
            local remoteCommand = body['command']
            local data = body['data']
            print('received remote command : ' .. remoteCommand)
            if remoteCommand == 'forward' then
                forward()
            elseif remoteCommand == 'backward' then
                backward()
            elseif remoteCommand == 'up' then
                up()
            elseif remoteCommand == 'down' then
                down()
            elseif remoteCommand == 'turnRight' then
                turnRight()
            elseif remoteCommand == 'turnLeft' then
                turnLeft()
            elseif remoteCommand == 'goTo' then
                local pState = currentState
                setState('moving')
                goTo(data[1], data[2], data[3],
                    data[4])
                setState(pState)
            elseif remoteCommand == 'headTo' then
                headTo(data[1])
            elseif remoteCommand == 'refuel' then
                refuel()
            elseif remoteCommand == 'emptyInventory' then
                for i = 1, 14 do
                    turtle.select(i)
                    turtle.dropDown()
                end
                turtle.select(1)
            elseif remoteCommand == 'pause' then
                paused = not paused
            elseif remoteCommand == 'reboot' then
                os.reboot()
            end
        end
        -- coroutine.yield()
    end
end

function configManager()
    while true do
        local message = websocket.waitForMessage({ type = "config" })
        if message ~= nil then
            config = message['body']
            print('received new config')
            -- print(textutils.serialize(config))
        end
        -- coroutine.yield()
    end
end

paused = false
currentPosition = nil
currentHeading = nil
homePosition = nil
homeHeading = nil
currentState = ''
blockToPlace = 0 -- number of block left to place

function dataManager()
    while true do
        if websocket.ws ~= nil then
            setProperty('position', currentPosition)
            setProperty("fuel", turtle.getFuelLevel())
        end
        sleep(1)
    end
end

function init()
    currentPosition = { locate() }
    currentHeading = getHeading()

    homePosition = { currentPosition[1], currentPosition[2], currentPosition[3] }
    homeHeading = currentHeading

    websocket.connect(url, { label = os.getComputerLabel() or "unnamed printer", id = os.getComputerID() }, 3)


    setState('idle')
    checkFuel()
    setProperty('progress', 0)
    websocket.sendRequest('getConfig', {})
    local currentPartRes = websocket.sendRequestAndWaitForResponse('getCurrentPart', {})
    if currentPartRes.hasCurrentPart then
        print('printer has a current part')
    else
        print('printer has no current part')
    end
end

parallel.waitForAll(websocket.pingLoop, websocket.receiveLoop, buildManager, remoteManager, configManager, dataManager,
    init)
