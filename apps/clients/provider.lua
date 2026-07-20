-- SETUP
-- turtle with pickaxe
-- enderchest in first slot or in front of turtle
-- ME Bridge underneath pointed up


local url = "$WS_URL$"

fs.delete('libs')
fs.makeDir('libs')
shell.run('wget $WEB_URL$/libs/json.lua libs/json.lua')
shell.run('wget $WEB_URL$/libs/websocket.lua libs/websocket.lua')

sleep(1)
json = require "libs/json"
websocket = require "libs/websocket"

local me = peripheral.wrap('bottom')

function requestItemIntoEnderchest(item, count)
    local exportedAmount = me.exportItem({ name = item, count = count }, "front")
    return exportedAmount == count
end

function init()
    if me == nil then
        error("Please add a ME Bridge enderneath the turtle")
    end
    turtle.select(1)
    if turtle.getItemDetail() == nil then
        local hasBlock, block = turtle.inspect()
        if hasBlock then
            turtle.dig()
        else
            error("No item in first slot, please add an enderchest in the first slot or in front of the turtle")
        end
    end
    local nbt = turtle.getItemDetail().nbt
    if nbt == nil then
        -- ender chest needs to be placed at least once to have nbt
        turtle.place()
        turtle.dig()
    end
    nbt = turtle.getItemDetail().nbt
    turtle.place()
    sleep(0.5)

    -- import any block in the chest in AE2
    local chest = peripheral.wrap('front')
    for _, _ in pairs(chest.list()) do
        me.importItem({}, "front")
    end

    websocket.connect(url,
        {
            label = os.getComputerLabel() or "unnamed provider",
            id = os.getComputerID(),
            type = "provider",
            chest_nbt =
                nbt
        }, 3)
end

function mainLoop()
    local chest = peripheral.wrap('front')
    while true do
        local message = websocket.waitForMessage({ type = "request" })
        if message ~= nil then
            local request = message.body.request
            local body = message.body.body

            if request == "exportBlocks" then
                -- AE2 -> enderchest
                print('received request to put blocks')
                for key, value in pairs(body) do
                    while not requestItemIntoEnderchest(key, value) do
                        sleep(0.5)
                    end
                end

                print('finished requesting blocks')
                websocket.sendResponse(request, {})
                print('response sent')
            elseif request == "importBlocks" then
                -- enderchest -> AE2
                for _, _ in pairs(chest.list()) do
                    me.importItem({}, "front")
                end
                websocket.sendResponse(request, {})
            elseif request == "checkStorage" then
                -- check if the specified blocks are in AE2
                local missing = {}
                for block, count in pairs(body) do
                    local item = me.getItem({ name = block })
                    if item == nil or item.name == nil or item.count == nil then
                        missing[block] = count
                    elseif item.count < count then
                        missing[block] = count - (item.count or 0)
                    end
                end
                websocket.sendResponse("checkStorage", missing)
            end
        end
    end
end

parallel.waitForAll(websocket.pingLoop, websocket.receiveLoop, init, mainLoop)
