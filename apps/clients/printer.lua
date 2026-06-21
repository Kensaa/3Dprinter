local config = {
    fuel = "minecraft:coal",
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

function place(block)
    local slot = 0
    while turtle.getItemDetail() == nil or turtle.getItemDetail().name ~= block do
        slot = slot + 1
        if slot == 15 then
            error("unable to place " .. block .. " block not found in inventory")
        end
        turtle.select(slot)
    end
    while not turtle.placeDown() do
        sleep(1)
    end
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
                    sleep(math.random())
                    if turtle.up() then
                        currentPosition[2] = currentPosition[2] + 1
                    elseif turtle.down() then
                        currentPosition[2] = currentPosition[2] - 1
                    end
                else
                    print('im lower id')
                    sleep(1 + math.random())
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
                    sleep(math.random())
                    backward()
                else
                    sleep(1 + math.random())
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

-- Acquires and place the enderchest and calls `action`, then release and pickup the enderchest
function enderchestAction(action)
    -- place enderchest
    equipPickaxe()
    turtle.select(16)
    turtle.placeUp()
    turtle.select(1)
    websocket.sendRequest("acquireLock")
    websocket.waitForMessage({ type = "lockAcquired" })
    action(peripheral.wrap('top'))

    websocket.sendRequest("releaseLock")
    -- pickup enderchest
    turtle.select(16)
    turtle.digUp()
    turtle.select(1)
end

function refuel(providerMode)
    previousState = currentState
    setState('refueling')
    log("starting refuel")
    if providerMode == "managed" then
        enderchestAction(function(chest)
            websocket.sendRequestAndWaitForResponse('providerRequest',
                { request = "exportBlocks", blocks = { [config.fuel] = 256 } })

            for _ = 1, #chest.list() do
                turtle.suckUp()
            end
            for slot = 1, 14 do
                turtle.select(slot)
                turtle.refuel()
            end
            for slot = 1, 14 do
                turtle.select(slot)
                turtle.dropUp()
            end
            websocket.sendRequestAndWaitForResponse('providerRequest',
                { request = "importBlocks", blocks = {} })
        end)
    else
        log("build is unmanaged, refuel needs to be done manually")
        print('please add fuel and press enter')
        read()
        for slot = 1, 14 do
            turtle.select(slot)
            turtle.refuel()
        end
        print('turtle refueled')
        print('remove leftover fuel and press enter')
        read()
    end
    log('refuel fininshed')

    setState(previousState)
end

-- Fetch from enderchest the blocks contained in the `blocks` table (by acquiring the lock on the enderchest and asking the provider to put block in it)
function fetchBlocks(blocks, providerMode)
    if providerMode == "managed" then
        -- managed mode
        enderchestAction(function(chest)
            websocket.sendRequestAndWaitForResponse('providerRequest', { request = "exportBlocks", blocks = blocks })
            for _ = 1, #chest.list() do
                turtle.suckUp()
            end
        end)
    else
        -- place enderchest
        equipPickaxe()
        turtle.select(16)
        turtle.placeUp()
        turtle.select(1)
        for _, count in pairs(blocks) do
            -- should only loop once
            local fullSlots = math.floor(count / 64)
            local rest = count % 64
            for _ = 1, fullSlots do
                turtle.suckUp(64)
            end
            turtle.suckUp(rest)
        end
        -- pickup enderchest
        turtle.select(16)
        turtle.digUp()
        turtle.select(1)
    end


    -- verify fetch
    local inv = {}
    for i = 1, 14 do
        local detail = turtle.getItemDetail(i)
        if detail ~= nil then
            inv[detail.name] = (inv[detail.name] or 0) + detail.count
        end
    end
    for k, v in pairs(blocks) do
        if inv[k] == nil then
            error("there should be " .. k .. ' in the inventory')
        else
            if inv[k] ~= v then
                error("invalid count of " .. k .. " : " .. v .. " expected, got " .. inv[k])
            end
        end
    end
end

function emptyInventory(providerMode)
    -- check if turtle has any items in its inventory
    local hasItem = false
    for slot = 1, 14 do
        if turtle.getItemDetail(slot) ~= nil then
            hasItem = true
            break
        end
    end
    if hasItem then
        if providerMode == 'managed' then
            enderchestAction(function()
                for slot = 1, 14 do
                    turtle.select(slot)
                    turtle.dropUp()
                end
                websocket.sendRequestAndWaitForResponse('providerRequest',
                    { request = "importBlocks", blocks = {} })
            end)
        else
            for slot = 1, 14 do
                turtle.select(slot)
                turtle.dropDown()
            end
        end
    end
end

-- Returns the number of entry in the table
function getTableSize(t)
    local count = 0
    for _, _ in pairs(t) do
        count = count + 1
    end
    return count
end

-- Precompute the instances of block fetch before actually doing the build
-- Returns a 3D array that, for each cell, contains a table of block to be fetched (and their quantities) while building this block (most cell will be empty, but if they are not, the blocks need to be fetched before building it)
function precomputeNeededBlocks(data, palette, height, depth, width)
    local res = {}
    for _ = 1, height do
        local layer = {}
        for _ = 1, depth do
            local line = {}
            for _ = 1, width do
                table.insert(line, {})
            end
            table.insert(layer, line)
        end
        table.insert(res, layer)
    end

    local lastX, lastY, lastZ = nil, nil, nil
    local currentCounts = {}
    traverseBuildOrder(data, height, depth, width, false, function(y, z, x, val)
        -- set the last block to the first block found
        if lastX == nil and lastY == nil and lastZ == nil then
            lastX = x
            lastY = y
            lastZ = z
        end

        -- compute slot count (to know if we need to stop)
        -- used slots: for each blocks => ceil(count / 64)
        local slotCount = 0
        for _, v in pairs(currentCounts) do
            slotCount = slotCount + math.ceil(v / 64)
        end
        if slotCount == 14 then
            -- all slot would be filled
            -- possible improvement: implemented like this, the last slot (the 14th) will only contain 1 block
            res[lastY][lastZ][lastX] = currentCounts
            currentCounts = {}
            lastY = y
            lastZ = z
            lastX = x
        end

        -- add current block
        local block = palette[val + 1]
        currentCounts[block] = (currentCounts[block] or 0) + 1
    end)

    if lastX ~= nil and lastY ~= nil and lastZ ~= nil then
        -- in the case that we didn't explore any block (should not happen but idc)
        res[lastY][lastZ][lastX] = currentCounts
    end
    return res
end

function build(data, palette, providerMode, height, depth, width)
    local neededBlocks = precomputeNeededBlocks(data, palette, height, depth, width)
    -- if os.getComputerID() == 13 then
    --     http.post("http://localhost:4321", textutils.serializeJSON(neededBlocks))
    -- end

    traverseBuildOrder(data, height, depth, width, true, function(y, z, x, val)
        -- check if we need to fetch some blocks
        local blocksToFetch = neededBlocks[y][z][x]
        local ts = getTableSize(blocksToFetch)
        if ts > 0 then
            -- there are blocks to fetch
            log('fetching ' .. ts .. ' types of block')
            fetchBlocks(blocksToFetch, providerMode)
        end

        place(palette[val + 1])

        progress = (y - 1 + (z - 1) / depth) / height * 100
        setProperty('progress', progress)
    end)
end

-- Traverses all cells in the exact order the turtle will visit them,
-- calling callback(y, z, x, val) for each cell where data[y][z][x] is different than 0
-- if move is set to true, the function will make the turtle follow the movement of the traversal, if false it will just be simulated
function traverseBuildOrder(data, height, depth, width, move, callback)
    for y = 1, height do
        local layer = data[y]
        local startIndexes = {}
        local endIndexes = {}

        -- if the layer is empty, we don't have to do anything
        local layerEmpty = true
        for z = 1, depth do
            for x = 1, width do
                if tonumber(layer[z][x]) ~= 0 then
                    layerEmpty = false
                end
            end
        end
        if layerEmpty then
            -- layer empty
            if move then
                if y ~= height then
                    up()
                end
            end
        else
            -- layer not empty
            -- compute first and last element in the line
            for z = 1, depth do
                for x = width, 1, -1 do
                    if tonumber(layer[z][x]) ~= 0 then
                        startIndexes[z] = x
                    end
                end
                for x = 1, width do
                    if tonumber(layer[z][x]) ~= 0 then
                        endIndexes[z] = x
                    end
                end
            end

            local Xdir = 0   -- 0 = left to right | 1 = right to left
            local startX = 1 -- index from which to start on next row (default to 1 to start the first row at the start)
            for z = 1, depth do
                if paused then
                    print("paused")
                    sleep(1)
                else
                    local row = layer[z]

                    if startIndexes[z] == nil and z ~= depth then
                        --last row --> don't have to take shortcut --> break everything
                        -- line is empty
                        if move then
                            if Xdir == 0 then
                                turnRight()
                                forward()
                                turnLeft()
                            else
                                turnLeft()
                                forward()
                                turnRight()
                            end
                        end
                        -- -- in the case that we skip a line, check if there were block to fetch in it (it should not happen unless the part is small and the line we skip is the first one, in that case, all the block to fetch are in the first cell [1][1][1])
                        -- for x = 1, width do
                        --     local blocksToFetch = neededBlocks[y][z][x]
                        --     local ts = getTableSize(blocksToFetch)
                        --     if ts > 0 then
                        --         -- there are blocks to fetch
                        --         log('fetching ' .. ts .. ' types of block')
                        --         fetchBlocks(blocksToFetch, providerMode)
                        --     end
                        -- end
                    else
                        -- line is not empty
                        -- don't forward on first pass because at the start of each row, the turtle is 1 bloc further from where it should be
                        firstPass = true
                        for x = startX, width do
                            index = x

                            if Xdir == 1 then
                                index = width - x + 1
                            end
                            if not firstPass then
                                if move then
                                    forward()
                                end
                            else
                                firstPass = false
                            end
                            local val = tonumber(row[index])
                            if val ~= 0 then
                                callback(y, z, x, val)
                            end

                            -- end of line
                            if x == width then
                                -- end of line
                                if z ~= depth then
                                    -- last row ---> dont turn --> makes the turtle go 1 block down while it shouldn't
                                    startX = 1
                                    if Xdir == 0 then
                                        Xdir = 1
                                        if move then
                                            turnRight()
                                            forward()
                                            turnRight()
                                        end
                                    else
                                        Xdir = 0
                                        if move then
                                            turnLeft()
                                            forward()
                                            turnLeft()
                                        end
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

                                            -- turning earlier to the right
                                            if move then
                                                turnRight()
                                                forward()
                                                turnRight()
                                            end
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
                                            -- turning earlier to the left
                                            if move then
                                                turnLeft()
                                                forward()
                                                turnLeft()
                                            end
                                            break
                                        end
                                    end
                                end
                            end
                        end
                    end
                end
            end
            -- end of layer
            if move then
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
    end
end

-- Compute the euclidian distance between `pos1` and `pos2` (rounded up)
function dist(pos1, pos2)
    local dx = pos1[1] - pos2[1]
    local dy = pos1[2] - pos2[2]
    local dz = pos1[3] - pos2[3]
    return math.ceil(math.sqrt(dx ^ 2 + dy ^ 2 + dz ^ 2))
end

function handleData(JSONData)
    local pos = JSONData['pos']
    local providerMode = JSONData['providerMode']
    local heading = tonumber(JSONData['heading'])
    local data = JSONData['data']
    local palette = JSONData['palette']
    local height = tonumber(JSONData['height'])
    local depth = tonumber(JSONData['depth'])
    local width = tonumber(JSONData['width'])

    local heightOffset = tonumber(JSONData['heightOffset'])
    local depthOffset = tonumber(JSONData['depthOffset'])
    local widthOffset = tonumber(JSONData['widthOffset'])

    local x = tonumber(pos[1])
    local y = tonumber(pos[2])
    local z = tonumber(pos[3])

    local blockToPlace = tonumber(JSONData['blockCount'])

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

    emptyInventory(providerMode)

    local d = dist(currentPosition, pos)
    local fuelAprox = math.ceil(1.5 * (width * height * depth + (2 * d)))

    buildMaxHeight = height + y + 1

    log(string.format("build a %dx%dx%d shape at %d,%d,%d (%d blocks) (~%d fuel)", width, depth, height, x, y, z,
        blockToPlace, fuelAprox))

    -- check if there is enough fuel
    if turtle.getFuelLevel() < fuelAprox then
        refuel(providerMode)
    end
    setState('moving')
    goTo(x, y + 1, z, buildMaxHeight + 2)
    headTo(heading)
    setState('building')
    build(data, palette, providerMode, height, depth, width)
    fs.delete('data')
    log("finished building, asking for next part")
    websocket.sendRequest('setProperty', { property = "progress", value = 0 })
    local nextPartResponse = websocket.sendRequestAndWaitForResponse('getNextPart', {})
    if nextPartResponse then
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
            elseif remoteCommand == 'shutdown' then
                os.shutdown()
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


    local nbt = turtle.getItemDetail(16).nbt
    if nbt == nil then
        -- ender chest needs to be placed at least once to have nbt
        equipPickaxe()
        turtle.select(16)
        turtle.place()
        turtle.dig()
    end
    nbt = turtle.getItemDetail(16).nbt
    websocket.connect(url, {
        label = os.getComputerLabel() or "unnamed printer",
        id = os.getComputerID(),
        type =
        "printer",
        chest_nbt = nbt
    }, 3)


    setState('idle')
    setProperty('progress', 0)
    websocket.sendRequest('getConfig', {})
    local currentPartRes = websocket.sendRequestAndWaitForResponse('getCurrentPart', {})
    if currentPartRes == nil then
        return
    end
    if currentPartRes.hasCurrentPart then
        print('printer has a current part')
        emptyInventory(nil)
    else
        print('printer has no current part')
    end
end

parallel.waitForAll(websocket.pingLoop, websocket.receiveLoop, buildManager, remoteManager, configManager, dataManager,
    init)
