local drone = peripheral.wrap("top")
drone.setSides(true, true, true, true, true, true)

local config = {
    buildBlock = "minecraft:cobblestone",
    gpsTry = 5,
    minPressure = 2,
    refuelPosition = { 0, 0, 0 },
    restockPosition = { 0, 0, 0 }
}

local maxBuildBatch = 2000

local url = "$WS_URL$"
if not fs.exists('json.lua') then
    shell.run('wget https://raw.githubusercontent.com/rxi/json.lua/master/json.lua json.lua')
end
sleep(1)
json = require "json"

function waitForAction()
    while not drone.isActionDone() do
        sleep(0.05)
    end
end

function getItem(position, item, count)
    print('getting ' .. count .. ' ' .. item .. ' at ' .. position[1] .. ',' .. position[2] .. ',' .. position[3])
    drone.abortAction()
    drone.clearArea()
    drone.clearWhitelistItemFilter()

    drone.addArea(position[1], position[2], position[3])
    drone.setUseCount(true)
    drone.setCount(count)
    drone.addWhitelistItemFilter(item, false, false)
    drone.setUseMaxActions(true)
    drone.setMaxActions(1)
    drone.setAction('inventory_import')

    waitForAction()

    drone.abortAction()
    drone.clearArea()
    drone.setUseMaxActions(false)
    drone.setUseCount(false)
end

function refuel()
    goTo(config['refuelPosition'])
    while drone.getDronePressure() < 9.8 do
        print('waiting for refuel')
        sleep(1)
    end
end

local ws, err = http.websocket(url)
if not err == nil then
    print(err)
    return
end

function send(data)
    ws.send(json.encode(data))
end

function log(message)
    send({ type = 'log', message = message })
end

function setState(state)
    if currentState ~= state then
        currentState = state
        send({ type = 'setState', state = state })
    end
end

-- register the client (to associate a websocket with a label and an id on the server)
send({ type = 'register', label = os.getComputerLabel(), id = os.getComputerID() })



function goTo(pos)
    drone.abortAction()
    drone.clearArea()
    drone.addArea(pos[1], pos[2], pos[3])
    drone.setAction('goto')
    waitForAction()
    drone.abortAction()
    drone.clearArea()
end

function build(data, x, y, z, height, depth, width, heading)
    print("build is at " .. x .. ',' .. y .. ',' .. z)

    function buildArea()
        drone.abortAction()
        drone.clearWhitelistItemFilter()
        drone.addWhitelistItemFilter(config['buildBlock'], false, false)

        drone.setAction('place')
        waitForAction()
        print('area built')
        drone.abortAction()
        drone.clearWhitelistItemFilter()
    end

    refuel()
    getItem(config['restockPosition'], config['buildBlock'], maxBuildBatch)

    count = 0
    for yi = 1, height do
        for zi = 1, depth do
            for xi = 1, width do
                if tonumber(data[yi][zi][xi]) == 1 then
                    local currentX = x
                    local currentY = y + yi - 1
                    local currentZ = z
                    if heading == 1 then
                        currentX = currentX + xi - 1
                        currentZ = currentZ + zi - 1
                    elseif heading == 2 then
                        currentX = currentX - zi - 1
                        currentZ = currentZ + xi - 1
                    elseif heading == 3 then
                        currentX = currentX - xi - 1
                        currentZ = currentZ - zi - 1
                    elseif heading == 4 then
                        currentX = currentX + zi - 1
                        currentZ = currentZ - xi - 1
                    end
                    if count == 0 then
                        print("first block at " .. currentX .. ',' .. currentY .. ',' .. currentZ)
                    end
                    drone.addArea(currentX, currentY, currentZ)
                    count = count + 1
                end

                if count == maxBuildBatch then
                    print('max count reached')
                    -- build current
                    buildArea()
                    -- restock
                    refuel()
                    getItem(config['restockPosition'], config['buildBlock'], maxBuildBatch)
                    count = 0
                end
                progress = (yi - 1 + (zi - 1) / depth) / height * 100
                send({ type = 'setProgress', progress = progress })
            end
        end
    end
    buildArea()
end

--TODO
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

    y = y + heightOffset

    -- ['East', 'South', 'West', 'North']

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

    log('building a ' .. width .. 'x' .. depth .. 'x' .. height .. ' shape at ' .. x .. ',' .. y .. ',' .. z)
    --print('current config : ', textutils.serialize(config))
    setState('moving')
    setState('building')
    build(data, x, y, z, height, depth, width, heading)
    fs.delete('data')
    log("finished building, asking for next part")
    send({ type = 'setProgress', progress = 0.0 })
    send({ type = "nextPart" })
end

homePosition = { drone.getDronePosition() }

currentState = ''
setState('idle')
send({ type = 'setPos', pos = homePosition })

send({ type = 'currentPart' })

local currentMessage = nil

function receive()
    while true do
        local _, _, response, isBinary = os.pullEvent("websocket_message")
        if not isBinary then
            currentMessage = json.decode(response)
        end
    end
end

function buildManager()
    local buildData = ''
    while true do
        if currentMessage ~= nil then
            if currentMessage['type'] == 'sendStart' then
                buildData = ''
                currentMessage = nil
            elseif currentMessage['type'] == 'chunk' then
                buildData = buildData .. currentMessage['chunk']
                currentMessage = nil
            elseif currentMessage['type'] == 'sendEnd' then
                currentMessage = nil
                handleData(json.decode(buildData))
            elseif currentMessage['type'] == 'noNextPart' then
                currentMessage = nil
                log("no next part, going back to home position")
                setState('moving')
                goTo(homePosition)
                log("back to home position, waiting for order")
                setState('idle')
            end
        end
        coroutine.yield()
    end
end

--TODO
function remoteManager()
    while true do
        if currentMessage ~= nil then
            if currentMessage['type'] == 'remote' then
                local remoteCommand = currentMessage['command']
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
                    goTo(currentMessage['data'])
                    setState(pState)
                elseif remoteCommand == 'headTo' then
                    headTo(currentMessage['data'][1])
                elseif remoteCommand == 'refuel' then
                    refuel()
                elseif remoteCommand == 'emptyInventory' then
                    for i = 1, 14 do
                        turtle.select(i)
                        turtle.dropDown()
                    end
                    turtle.select(1)
                end
                currentMessage = nil
            end
        end
        coroutine.yield()
    end
end

function configManager()
    while true do
        if currentMessage ~= nil then
            if currentMessage['type'] == 'config' then
                config = currentMessage['config']
                print('received new config')
                print(textutils.serialize(config))
                currentMessage = nil
            end
        end
        coroutine.yield()
    end
end

function positionManager()
    while true do
        local pos = { drone.getDronePosition() }
        send({ type = 'setPos', pos = pos })
        sleep(3)
    end
end

while true do
    parallel.waitForAll(receive, buildManager, remoteManager, configManager, positionManager)
end
