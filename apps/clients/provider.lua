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
    while true do
        local blockRequest = websocket.waitForMessage({ type = "request", body = { request = "putBlocks" } })
        if blockRequest ~= nil then
            local blocks = blockRequest.body.body
            print('received request to put blocks')
            for key, value in pairs(blocks) do
                while not requestItemIntoEnderchest(key, value) do
                    sleep(0.5)
                end
            end

            print('finished requesting blocks')
            websocket.sendResponse("putBlocks", {})
            print('response sent')
        end
    end
end

parallel.waitForAll(websocket.pingLoop, websocket.receiveLoop, init, mainLoop)
