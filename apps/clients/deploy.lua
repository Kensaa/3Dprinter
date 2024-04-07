local url = "$WEB_URL$"
local me = peripheral.wrap('bottom')
if not me then
    print('No ME controller found below the turtle')
    return
end

function requestItem(item, count)
    me.exportItem({ name = item, count = count }, "up")
    sleep(0.5)
end

function requestItemIntoTurtle(item, count)
    me.exportItemToPeripheral({ name = item, count = count }, "front")
    sleep(0.5)
end

function isInMe(item)
    local items = me.listItems()
    for k, v in pairs(items) do
        if v.name == item then
            return true
        end
    end
    return false
end

function execute(str, delay)
    delay = delay or 0
    beforeSlot = turtle.getSelectedSlot()
    turtle.up()
    turtle.select(1)
    turtle.place()
    turtle.select(2)
    turtle.drop()
    if fs.exists("disk/startup") then
        fs.delete("disk/startup")
    end
    io.open("disk/startup", "w"):write(str)
    turtle.down()
    peripheral.call('front', 'reboot')
    sleep(delay)
    turtle.up()
    turtle.suck()
    turtle.select(1)
    turtle.dig()
    turtle.down()

    turtle.select(beforeSlot)
end

function setFile(str)
    turtle.up()
    if fs.exists("disk/startup") then
        fs.delete("disk/startup")
    end
    io.open("disk/startup", "w"):write(str)
    turtle.down()
end

function clear()
    term.clear()
    term.setCursorPos(1, 1)
end

clear()
print('Intializing deployer...')

local deployerRequirements = {}
deployerRequirements["computercraft:disk_drive"] = 1
deployerRequirements["computercraft:disk"] = 1
deployerRequirements["minecraft:coal_block"] = 64


local requirements = {}
requirements["computercraft:turtle_advanced"] = 1
requirements["advancedperipherals:chunk_controller"] = 1
requirements["minecraft:diamond_pickaxe"] = 1
requirements["computercraft:wireless_modem_advanced"] = 1
requirements["enderchests:ender_chest"] = 1
requirements["minecraft:coal_block"] = 125


for k, v in pairs(deployerRequirements) do
    if not isInMe(k) then
        print('You have 0 ' .. k .. ',' .. v .. ' needed')
        return
    else
        local amount = me.getItem({ name = k }).amount
        if amount < v then
            print('You have ' .. amount .. ' ' .. k .. ',' .. v .. ' needed')
            return
        end
    end
end

requestItem("computercraft:disk_drive", deployerRequirements["computercraft:disk_drive"])
requestItem("computercraft:disk", deployerRequirements["computercraft:disk"])
requestItem("minecraft:coal_block", deployerRequirements["minecraft:coal_block"])

--refuel deployer
turtle.select(3)
turtle.refuel()
me.importItem({ name = "minecraft:coal_block", count = 64 }, "up")

print('how much turtle do you want to deploy?')
local num = tonumber(read())
clear()
-- check requirements
for k, v in pairs(requirements) do
    if not isInMe(k) then
        print('You have 0 ' .. k .. ',' .. v .. ' needed')
        return
    else
        local amount = me.getItem({ name = k }).amount
        local totalRequired = v * num
        if amount < totalRequired then
            print('You have ' .. amount .. ' ' .. k .. ',' .. totalRequired .. ' needed')
            me.importItem({ name = "computercraft:disk_drive", count = 1 }, "up")
            me.importItem({ name = "computercraft:disk", count = 1 }, "up")
            return
        end
    end
end

print('About to deploy ' .. num .. ' printers, press ENTER to continue')
read()
clear()
turtle.select(1)
turtle.up()
turtle.place()
turtle.select(2)
turtle.drop()
turtle.down()
turtle.select(1)
for i = 1, num do
    requestItem("computercraft:turtle_advanced", 1)
    turtle.place()
    sleep(0.5)
    requestItemIntoTurtle("minecraft:coal_block", requirements["minecraft:coal_block"])
    setFile([[
        for i = 1,4 do
            turtle.select(i)
            turtle.refuel()
        end
        turtle.select(1)
    ]])
    peripheral.call('front', 'reboot')
    sleep(2)
    requestItemIntoTurtle("advancedperipherals:chunk_controller", requirements["advancedperipherals:chunk_controller"])
    requestItemIntoTurtle("minecraft:diamond_pickaxe", requirements["minecraft:diamond_pickaxe"])
    requestItemIntoTurtle("computercraft:wireless_modem_advanced", requirements["computercraft:wireless_modem_advanced"])
    requestItemIntoTurtle("enderchests:ender_chest", requirements["enderchests:ender_chest"])
    setFile([[
        turtle.select(1)
        turtle.equipLeft()
        turtle.select(2)
        turtle.equipRight()
        turtle.select(3)
        turtle.transferTo(15,1)
        turtle.select(4)
        turtle.transferTo(16,1)
        turtle.select(1)

        os.setComputerLabel('printer '..]] .. i .. [[)
        shell.run('wget '..']] .. url .. [[/clients/bootstrap.lua startup')
        for i = 1,]] .. i .. [[ do
            turtle.forward()
        end
        turtle.turnLeft()
        turtle.forward()
        os.reboot()
    ]])
    peripheral.call('front', 'reboot')
    print('deployed ' .. i .. '/' .. num)
    sleep(3)
end

turtle.up()
turtle.select(2)
turtle.suck()
turtle.select(1)
turtle.dig()
turtle.down()
print('finished deploying ' .. num .. ' turtles')
print('storing deployer requirements in ME system')
me.importItem({ name = "computercraft:disk_drive", count = 1 }, "up")
me.importItem({ name = "computercraft:disk", count = 1 }, "up")
