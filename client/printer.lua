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

function send(data)
    ws.send(textutils.serialiseJSON(data))
end

function log(message)
    send({type = 'log', message = message})
end

-- register the client (to associate a websocket with a label and an id on the server)
send({type = 'register', label = os.getComputerLabel(), id = os.getComputerID()})

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

function turnRight()
    turtle.turnRight()
    currentHeading = currentHeading + 1
end

function turnLeft()
    turtle.turnLeft()
    currentHeading = currentHeading - 1
end
    

function goTo(x,y,z)
    local target = {x,y,z}
    print(currentHeading)
    if heading == -1 then
        print('error')
        return
    end
    while currentPosition[1] ~= target[1] or currentPosition[2] ~= target[2] or currentPosition[3] ~= target[3] do
        if currentPosition[1] < target[1] then
            -- x+
            while currentHeading % 4 ~= 1 do
                turtle.turnRight()
                currentHeading = currentHeading + 1
            end
            forward()
        elseif currentPosition[1] > target[1] then
            -- x-
            while currentHeading % 4 ~= 3 do
                turtle.turnRight()
                currentHeading = currentHeading + 1
            end
            forward()
        elseif currentPosition[3] < target[3] then
            -- z+
            while currentHeading % 4 ~= 2 do
                turtle.turnRight()
                currentHeading = currentHeading + 1
            end
            forward()
        elseif currentPosition[3] > target[3] then
            -- z-
            while currentHeading % 4 ~= 0 do
                turtle.turnRight()
                currentHeading = currentHeading + 1
            end
            forward()
        elseif currentPosition[2] < target[2] then
            -- y+
            up()
        elseif currentPosition[2] > target[2] then
            -- y-
            down()
        end
        send({type = 'setPos', pos=currentPosition})
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
        print("layer n°"..y)
        local layer = data[y]
        local startIndexes = {}
        local endIndexes = {}

        for z = 1,depth do
            for x = width,1,-1 do
                if tonumber(layer[z][x]) == 1 then
                    startIndexes[z] = x
                end
            end
            for x = 1,width do
                if tonumber(layer[z][x]) == 1 then
                    endIndexes[z] = x
                end
            end
        end

        local Xdir = 0 -- 0 = left to right | 1 = right to left
        local startX = 1 -- index from which to start on next row (default to 1 to start the first row at the start)
        for z = 1,depth do
            local row = layer[z]
            print('row n°' .. z..', Xdir: '..Xdir)
            send({type = 'setPos', pos=currentPosition})
            

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
                        index = width-x+1
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
                            if endIndexes[z] ~= nil and x >= endIndexes[z] then -- if further than last on current line
                                if endIndexes[z+1] ~= nil and x >= endIndexes[z+1] then -- if further than last on next line
                                    -- shortcut available
                                    startX = width-x+1 -- set next start to where the shortcut places us
                                    Xdir = 1 -- we change direction (obviously)
                                    print("turning earlier to the right")
                                    turnRight()
                                    forward()
                                    turnRight()
                                    break
                                end
                            end
                        else
                            i = width-x+1
                            if startIndexes[z] ~= nil and i <= startIndexes[z] then -- if further than first on current line
                                if startIndexes[z+1] ~= nil and i <= startIndexes[z+1] then -- if further than first on next line
                                    -- shortcut available
                                    startX = i -- set next start to where the shortcut places us
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
            progress = (y - 1  + (z - 1) / depth) / height * 100
            send({type = 'setProgress', progress=progress})
        end
        -- end of layer
        if y ~= height then -- if it's the last layer, no need to go back to the start
            if Xdir == 0 then
                --oposite side as start
                turnRight()
                turnRight()
    
                for i = 1,width-1 do
                    forward()
                end
                turnRight()
            else
                --same side as start
                turnRight()
            end
            for i = 1,depth-1 do
                forward()
            end
            turnRight()
            up()
        end
    end
    send({type = 'setProgress', progress=100.0})
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

    log('building a '..width..'x'..depth..'x'..height..' shape at '..x..','..y..','..z)
    send({type = 'setState', state='moving'})
    goTo(x,y+1,z)
    headTo(heading)
    send({type = 'setState', state='building'})
    build(data,height,depth,width)
    fs.delete('data')
    log("finished building, going back to home position")
    send({type = 'setState', state='moving'})
    goTo(homePosition[1],homePosition[2],homePosition[3])
    headTo(homeHeading)
    log("back to home position, waiting for order")
    send({type = 'setState', state='idle'})
    send({type = 'setProgress', progress=0.0})
end


currentPosition = {locate()}
homePosition = {currentPosition[1],currentPosition[2],currentPosition[3]}
send({type = 'setPos', pos=currentPosition})

currentHeading = getHeading()
homeHeading = currentHeading

if turtle.getFuelLevel() < 100 then
    print('turtle is out of fuel')
    return
end

while true do
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
end