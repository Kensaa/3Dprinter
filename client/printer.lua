gpsTry = 5

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

function restock()
    equipPickaxe()
    turtle.select(16)
    turtle.placeUp()
    turtle.select(1)
    for i = 1,14 do 
        turtle.suckUp()
    end
    turtle.select(16)
    turtle.digUp()
    turtle.select(1)
end

function place()
    local slot = 0
    while turtle.getItemCount() == 0 do
        slot = slot + 1
        if slot == 15 then
            restock()
            slot = 1
        end
        turtle.select(slot)
    end
    turtle.placeDown()
end

local url = "ws://localhost:9513"
local ws, err = http.websocket(url)
if not err == nil then
    print(err)
    return
end

-- register the client (to associate a websocket with a label and an id on the server)
ws.send(textutils.serialiseJSON({type = 'register', label = os.getComputerLabel(), id = os.getComputerID()}))

function countA(a)
    c = {}
    for k,v in pairs(a) do
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
    for k,v in pairs(a) do
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
    for i = 1,gpsTry do
        table.insert(posA,{gps.locate(2)})
    end
    xA = {}
    yA = {}
    zA = {}
    for k,v in pairs(posA) do
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
    local before = {locate()}
    turtle.forward()
    local after = {locate()}
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
    else return -1
    end
end

function forward()
    if not turtle.forward() then
        up()
        forward()
    else
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
end

function backward()
    if not turtle.back() then
        up()
        backward()
    else
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
end

function up()
    if not turtle.up() then
        turtle.forward()
        up()
        backward()
    else
        currentPosition[2] = currentPosition[2] + 1
    end
end

function down()
    if not turtle.down() then
        forward()
        down()
        backward()
    else
        currentPosition[2] = currentPosition[2] - 1
    end
end
function goTo(x,y,z)
    local target = {x,y,z}
    print('target:')
    print(target[1], target[2], target[3])
    print('current:')
    print(currentPosition[1], currentPosition[2], currentPosition[3])
    print('heading:')
    print(currentHeading)
    if heading == -1 then
        print('error')
        return
    end
    while currentPosition[1] ~= target[1] or currentPosition[2] ~= target[2] or currentPosition[3] ~= target[3] do
        -- print('target:')
        -- print(target[1], target[2], target[3])
        -- print('current:')
        -- print(currentPosition[1], currentPosition[2], currentPosition[3])
        if currentPosition[1] < target[1] then
            --print('x+')
            while currentHeading % 4 ~= 1 do
                --print("turning, heading: " .. currentHeading, "target: " .. 1)
                turtle.turnRight()
                currentHeading = currentHeading + 1
            end
            forward()
        elseif currentPosition[1] > target[1] then
            --print('x-')
            while currentHeading % 4 ~= 3 do
                --print("turning, heading: " .. currentHeading, "target: " .. 3)
                turtle.turnRight()
                currentHeading = currentHeading + 1
            end
            forward()
        elseif currentPosition[3] < target[3] then
            --print('z+')
            while currentHeading % 4 ~= 2 do
                --print("turning, heading: " .. currentHeading, "target: " .. 2)
                turtle.turnRight()
                currentHeading = currentHeading + 1
            end
            forward()
        elseif currentPosition[3] > target[3] then
            --print('z-')
            while currentHeading % 4 ~= 0 do
                --print("turning, heading: " .. currentHeading, "target: " .. 4)
                turtle.turnRight()
                currentHeading = currentHeading + 1
            end
            forward()
        elseif currentPosition[2] < target[2] then
            --print('y+')
            up()
        elseif currentPosition[2] > target[2] then
            --print('y-')
            down()
        end
    end     
end

function headTo(heading)
    while currentHeading % 4 ~= heading % 4 do
        turtle.turnRight()
        currentHeading = currentHeading + 1
    end
end

function build(data, height, depth, width) 
    for y = 1,height do
        local layer = data[y]

end

function handleData(data)
    local pos = data['pos']
    local heading = tonumber(data['heading'])
    local data = data['data']
    local height = tonumber(data['height'])
    local depth = tonumber(data['depth'])
    local width = tonumber(data['width'])

    local heightOffset = tonumber(data['heightOffset'])
    local depthOffset = tonumber(data['depthOffset'])
    local widthOffset = tonumber(data['widthOffset'])
    

    local x = tonumber(startingPosition[1])
    local y = tonumber(startingPosition[2])
    local z = tonumber(startingPosition[3])

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
    print('building a '..width..'x'..depth..'x'..height..' shape at '..x..','..y..','..z)
    goTo(x,y+1,z)
    headTo(heading)
    build(data,height,depth,width)
    fs.delete('data')
    ws.send(textutils.serialiseJSON({type = 'log', label = os.getComputerLabel(), message = "finished building, going back to base"}))
    goTo(homePosition[1],homePosition[2],homePosition[3])
    ws.send(textutils.serialiseJSON({type = 'log', label = os.getComputerLabel(), message = "back to base, powering down"}))
end


currentPosition = {locate()}
homePosition = {currentPosition[1],currentPosition[2],currentPosition[3]}
print(currentPosition[1],currentPosition[2],currentPosition[3])
ws.send(textutils.serialiseJSON({type = 'setHomePos', pos={currentPosition[1],currentPosition[2],currentPosition[3]}, id = os.getComputerLabel()}))
currentHeading = getHeading()
print(currentHeading)

if turtle.getFuelLevel() < 100 then
    print('turtle is out of fuel')
    return
end

if fs.exists('data') then
    print('data exists')
    local data = textutils.unserialiseJSON(fs.open("data","r").readAll())
    handleData(data)
else
    print('waiting for message')
    local _, url, response, isBinary = os.pullEvent("websocket_message")
    if isBinary then
        print('received binary message')
        return
    end
    print('received message')
    local JSONResponse = textutils.unserialiseJSON(response)
    io.open("data","w"):write(textutils.serialiseJSON(JSONResponse))
    handleData(JSONResponse)
end

